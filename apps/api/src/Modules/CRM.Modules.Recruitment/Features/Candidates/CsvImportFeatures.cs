using System.Text;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Recruitment.Data;
using CRM.Modules.Recruitment.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Recruitment.Features.Candidates;

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

public record CsvImportRowDto(
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string? Source,
    string? TagsRaw,
    bool ConsentGiven = true);

public record CsvImportErrorDto(int Row, string Email, string Error);

public record CsvImportResponse(
    int Imported,
    int SkippedDuplicates,
    IReadOnlyList<string> SkippedEmails,
    IReadOnlyList<CsvImportErrorDto> Errors);

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

public class CsvImportRowValidator : AbstractValidator<CsvImportRowDto>
{
    private static readonly string[] ValidSources = [CandidateSource.Manual, CandidateSource.CsvImport, CandidateSource.PublicForm, CandidateSource.Referral];

    public CsvImportRowValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(255);
        RuleFor(x => x.Phone).MaximumLength(50);
        When(x => !string.IsNullOrWhiteSpace(x.Source), () =>
        {
            RuleFor(x => x.Source!).Must(s => ValidSources.Contains(s.Trim())).WithMessage("Invalid source.");
        });
        When(x => !string.IsNullOrWhiteSpace(x.TagsRaw), () =>
        {
            RuleFor(x => x.TagsRaw!.Length).LessThanOrEqualTo(1000);
        });
    }
}

// ---------------------------------------------------------------------------
// Command / Handler — bulk import with 500 limit, duplicate skip, error list
// ---------------------------------------------------------------------------

public record CsvImportCommand(IReadOnlyList<CsvImportRowDto> Rows) : ICommand<CsvImportResponse>;

public class CsvImportHandler(
    RecruitmentDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CsvImportCommand, CsvImportResponse>
{
    private const int MaxRows = 500;

    public async Task<Result<CsvImportResponse>> Handle(CsvImportCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var rows = request.Rows;

        if (rows.Count == 0)
        {
            throw new BadRequestException("CSV contains no data rows.", "CSV_EMPTY");
        }

        if (rows.Count > MaxRows)
        {
            throw new BadRequestException($"CSV exceeds 500 row limit (got {rows.Count}).", "CSV_TOO_LARGE");
        }

        var validator = new CsvImportRowValidator();
        var errors = new List<CsvImportErrorDto>();
        var skippedEmails = new List<string>();
        var toInsert = new List<Candidate>();

        // Preload existing active emails for tenant (lowercase set)
        var existingEmails = await dbContext.Candidates
            .IgnoreQueryFilters()
            .Where(c => c.TenantId == tenantId && c.DeletedAt == null)
            .Select(c => c.Email.ToLower())
            .ToListAsync(cancellationToken);

        var existingSet = new HashSet<string>(existingEmails, StringComparer.OrdinalIgnoreCase);
        var batchSeen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            var rowNum = i + 2; // 1-based + header
            var email = row.Email?.Trim().ToLowerInvariant() ?? string.Empty;

            // Validate row
            var vr = await validator.ValidateAsync(row, cancellationToken);
            if (!vr.IsValid)
            {
                var msg = string.Join("; ", vr.Errors.Select(e => e.ErrorMessage));
                errors.Add(new CsvImportErrorDto(rowNum, row.Email ?? string.Empty, msg));
                continue;
            }

            // KVKK consent — for CSV import, consent is required; default true means bulk import
            // is considered consented with note; if explicitly false -> error
            if (!row.ConsentGiven)
            {
                errors.Add(new CsvImportErrorDto(rowNum, email, "KVKK consent_given is required."));
                continue;
            }

            // Duplicate guard: existing DB + within-batch duplicates
            if (existingSet.Contains(email) || batchSeen.Contains(email))
            {
                skippedEmails.Add(email);
                continue;
            }

            // Also validate email not empty after trim
            if (string.IsNullOrWhiteSpace(email))
            {
                errors.Add(new CsvImportErrorDto(rowNum, email, "Email is required."));
                continue;
            }

            batchSeen.Add(email);

            string[]? tags = null;
            if (!string.IsNullOrWhiteSpace(row.TagsRaw))
            {
                // Tags may be comma or semicolon separated; also handles quoted CSV tags field
                var raw = row.TagsRaw.Trim();
                tags = raw.Split([',', ';'], StringSplitOptions.RemoveEmptyEntries)
                    .Select(t => t.Trim())
                    .Where(t => !string.IsNullOrWhiteSpace(t) && t.Length <= 50)
                    .ToArray();

                if (tags.Length == 0)
                {
                    tags = null;
                }
            }

            var source = string.IsNullOrWhiteSpace(row.Source) ? CandidateSource.CsvImport : row.Source.Trim();

            var candidate = new Candidate
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                FirstName = row.FirstName.Trim(),
                LastName = row.LastName.Trim(),
                Email = email,
                Phone = string.IsNullOrWhiteSpace(row.Phone) ? null : row.Phone.Trim(),
                Source = source,
                Tags = tags,
                ConsentGiven = true,
                ConsentGivenAt = DateTime.UtcNow,
                Notes = "Imported via CSV bulk import.",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            toInsert.Add(candidate);
        }

        if (toInsert.Count > 0)
        {
            dbContext.Candidates.AddRange(toInsert);
            await dbContext.SaveChangesAsync(cancellationToken);
            // Add newly inserted to existing set for idempotency if handler called twice in same scope
            foreach (var c in toInsert)
            {
                existingSet.Add(c.Email.ToLowerInvariant());
            }
        }

        var response = new CsvImportResponse(
            toInsert.Count,
            skippedEmails.Count,
            skippedEmails.AsReadOnly(),
            errors.AsReadOnly());

        return Result.Success(response);
    }
}

// ---------------------------------------------------------------------------
// CSV parsing helpers
// ---------------------------------------------------------------------------

internal static class CsvParser
{
    /// <summary>Parses CSV text with header mapping (case-insensitive). Supports quoted fields.</summary>
    internal static IReadOnlyList<CsvImportRowDto> ParseCsvText(string csvText, List<CsvImportErrorDto> parseErrors)
    {
        var lines = SplitLines(csvText);
        if (lines.Count == 0)
        {
            return [];
        }

        var header = ParseCsvLine(lines[0]);
        var idxFirst = FindHeaderIndex(header, ["first_name", "firstname", "first name", "ad"]);
        var idxLast = FindHeaderIndex(header, ["last_name", "lastname", "last name", "soyad"]);
        var idxEmail = FindHeaderIndex(header, ["email", "e-posta", "eposta"]);
        var idxPhone = FindHeaderIndex(header, ["phone", "telefon", "tel"]);
        var idxSource = FindHeaderIndex(header, ["source", "kaynak"]);
        var idxTags = FindHeaderIndex(header, ["tags", "etiketler", "tag"]);
        var idxConsent = FindHeaderIndex(header, ["consent_given", "consent", "kvkk", "onay"]);

        if (idxFirst < 0 || idxLast < 0 || idxEmail < 0)
        {
            parseErrors.Add(new CsvImportErrorDto(1, string.Empty, "Missing required headers: first_name, last_name, email."));
            return [];
        }

        var rows = new List<CsvImportRowDto>();
        for (var i = 1; i < lines.Count; i++)
        {
            var line = lines[i];
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            var cols = ParseCsvLine(line);
            string GetCol(int idx) => idx >= 0 && idx < cols.Count ? cols[idx].Trim() : string.Empty;

            var first = GetCol(idxFirst);
            var last = GetCol(idxLast);
            var email = GetCol(idxEmail);
            var phone = idxPhone >= 0 ? GetCol(idxPhone) : null;
            var source = idxSource >= 0 ? GetCol(idxSource) : null;
            var tags = idxTags >= 0 ? GetCol(idxTags) : null;
            var consentRaw = idxConsent >= 0 ? GetCol(idxConsent) : "true";
            var consent = ParseBool(consentRaw, true);

            // Skip fully empty rows
            if (string.IsNullOrWhiteSpace(first) && string.IsNullOrWhiteSpace(last) && string.IsNullOrWhiteSpace(email))
            {
                continue;
            }

            rows.Add(new CsvImportRowDto(first, last, email, phone, source, tags, consent));
        }

        return rows;
    }

    internal static List<string> SplitLines(string text)
    {
        // Normalize line endings and split
        var normalized = text.Replace("\r\n", "\n").Replace("\r", "\n");
        return normalized.Split('\n').ToList();
    }

    internal static List<string> ParseCsvLine(string line)
    {
        var fields = new List<string>();
        var sb = new StringBuilder();
        var inQuotes = false;

        for (var i = 0; i < line.Length; i++)
        {
            var c = line[i];
            if (c == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                {
                    sb.Append('"');
                    i++;
                }
                else
                {
                    inQuotes = !inQuotes;
                }
            }
            else if (c == ',' && !inQuotes)
            {
                fields.Add(sb.ToString());
                sb.Clear();
            }
            else
            {
                sb.Append(c);
            }
        }

        fields.Add(sb.ToString());
        // Trim whitespace and unquote
        for (var i = 0; i < fields.Count; i++)
        {
            var f = fields[i].Trim();
            if (f.Length >= 2 && f[0] == '"' && f[^1] == '"')
            {
                f = f[1..^1].Replace("\"\"", "\"");
            }

            fields[i] = f;
        }

        return fields;
    }

    private static int FindHeaderIndex(List<string> headers, string[] candidates)
    {
        for (var i = 0; i < headers.Count; i++)
        {
            var h = headers[i].Trim().ToLowerInvariant();
            foreach (var c in candidates)
            {
                if (h == c)
                {
                    return i;
                }
            }
        }

        return -1;
    }

    private static bool ParseBool(string raw, bool defaultValue)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return defaultValue;
        }

        var v = raw.Trim().ToLowerInvariant();
        return v switch
        {
            "true" or "1" or "yes" or "evet" or "onay" => true,
            "false" or "0" or "no" or "hayir" or "hayır" => false,
            _ => defaultValue
        };
    }
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

public class CsvImportEndpoints : IEndpoint
{
    private const long MaxFileBytes = 5 * 1024 * 1024;

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/recruitment/candidates").WithTags("Recruitment - CSV Import");

        // JSON array import: POST /api/recruitment/candidates/import  body: CsvImportRowDto[]
        group.MapPost("/import", async (
            HttpContext httpContext,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            // Branch by Content-Type: multipart => CSV file, otherwise JSON array
            var contentType = httpContext.Request.ContentType ?? string.Empty;

            IReadOnlyList<CsvImportRowDto> rows;

            if (contentType.Contains("multipart/form-data", StringComparison.OrdinalIgnoreCase))
            {
                var form = await httpContext.Request.ReadFormAsync(ct);
                var file = form.Files.GetFile("file") ?? form.Files.FirstOrDefault();

                if (file == null || file.Length == 0)
                {
                    // Also support field named "csv"
                    file = form.Files.GetFile("csv");
                }

                if (file == null || file.Length == 0)
                {
                    return Results.BadRequest(ApiResponse<CsvImportResponse>.Fail("CSV_EMPTY", "No file uploaded. Send multipart file field 'file'."));
                }

                if (file.Length > MaxFileBytes * 2)
                {
                    // CSV itself capped by row count 500; file size soft cap 10MB
                    return Results.BadRequest(ApiResponse<CsvImportResponse>.Fail("CSV_TOO_LARGE", "File too large."));
                }

                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (ext != ".csv" && ext != ".txt" && !string.IsNullOrEmpty(ext))
                {
                    // Allow .csv primarily but not strictly block; warn via parse
                }

                string csvText;
                using (var reader = new StreamReader(file.OpenReadStream(), Encoding.UTF8, detectEncodingFromByteOrderMarks: true))
                {
                    csvText = await reader.ReadToEndAsync(ct);
                }

                var parseErrors = new List<CsvImportErrorDto>();
                rows = CsvParser.ParseCsvText(csvText, parseErrors);

                if (parseErrors.Count > 0 && rows.Count == 0)
                {
                    // Header parse failure
                    return Results.BadRequest(ApiResponse<CsvImportResponse>.Fail("CSV_HEADER_ERROR", parseErrors[0].Error));
                }

                // If row count exceeds 500, fail fast before handler
                if (rows.Count > 500)
                {
                    return Results.BadRequest(ApiResponse<CsvImportResponse>.Fail("CSV_TOO_LARGE", $"CSV exceeds 500 row limit (got {rows.Count})."));
                }

                // Attach parse-level errors as handler errors? For now, handler will validate.
                // Merge parseErrors into final? Handler errors will be returned; parseErrors for header already handled.
            }
            else
            {
                // JSON array: read body as CsvImportRowDto[]
                try
                {
                    var jsonRows = await httpContext.Request.ReadFromJsonAsync<List<CsvImportRowDto>>(cancellationToken: ct);
                    if (jsonRows == null || jsonRows.Count == 0)
                    {
                        return Results.BadRequest(ApiResponse<CsvImportResponse>.Fail("CSV_EMPTY", "Request body must be a non-empty JSON array of rows."));
                    }

                    rows = jsonRows;
                }
                catch (Exception ex)
                {
                    return Results.BadRequest(ApiResponse<CsvImportResponse>.Fail("CSV_PARSE_ERROR", $"Invalid JSON body: {ex.Message}"));
                }

                if (rows.Count > 500)
                {
                    return Results.BadRequest(ApiResponse<CsvImportResponse>.Fail("CSV_TOO_LARGE", $"Import exceeds 500 row limit (got {rows.Count})."));
                }
            }

            var result = await sender.Send(new CsvImportCommand(rows), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<CsvImportResponse>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<CsvImportResponse>.Fail(result.Error.Code, result.Error.Description));
        })
        .RequireAuthorization()
        .RequirePermission("Recruitment.ManageCandidates")
        .DisableAntiforgery()
        .WithName("CsvImportCandidates")
        .WithSummary("CSV/JSON bulk import candidates — 500 limit, duplicate skip, error list")
        .WithDescription("Accepts multipart CSV (file field 'file') or JSON array. Header mapping: first_name,last_name,email,phone,source,tags. Duplicate email per tenant skipped with warning list. KVKK consent defaults to true for CSV rows.");
    }
}
