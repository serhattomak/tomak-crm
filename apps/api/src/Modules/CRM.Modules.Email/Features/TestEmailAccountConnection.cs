using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Email.Data;
using CRM.Modules.Email.Dtos;
using CRM.Modules.Email.Entities;
using MailKit.Net.Imap;
using MailKit.Net.Smtp;
using MailKit.Security;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CRM.Modules.Email.Features;

public record TestEmailAccountConnectionCommand(Guid Id) : ICommand<TestEmailAccountConnectionResultDto>;

public class TestEmailAccountConnectionHandler(
    EmailDbContext dbContext,
    ICurrentTenant currentTenant,
    IHttpClientFactory httpClientFactory,
    ILogger<TestEmailAccountConnectionHandler> logger) : ICommandHandler<TestEmailAccountConnectionCommand, TestEmailAccountConnectionResultDto>
{
    public async Task<Result<TestEmailAccountConnectionResultDto>> Handle(TestEmailAccountConnectionCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<TestEmailAccountConnectionResultDto>(Error.Unauthorized);
        }

        EmailAccount? account = await dbContext.Accounts
            .FirstOrDefaultAsync(a => a.Id == request.Id, cancellationToken);

        if (account == null)
        {
            return Result.Failure<TestEmailAccountConnectionResultDto>("Account.NotFound", "E-posta hesabı bulunamadı.");
        }

        using CancellationTokenSource cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(10)); // 10s timeout as per acceptance criteria

        TestEmailAccountConnectionResultDto result = new TestEmailAccountConnectionResultDto();

        if (string.Equals(account.Provider, "resend", StringComparison.OrdinalIgnoreCase))
        {
            string apiKey = account.GetDecryptedPassword();
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                result.Success = false;
                result.Message = "Resend API anahtarı girilmemiş.";
                result.SmtpSuccess = false;
                result.SmtpMessage = "API anahtarı boş.";
                return Result.Success(result);
            }

            try
            {
                HttpClient client = httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(10);
                using HttpRequestMessage req = new HttpRequestMessage(HttpMethod.Get, "https://api.resend.com/api-keys");
                req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
                HttpResponseMessage resp = await client.SendAsync(req, cts.Token);

                if (resp.IsSuccessStatusCode)
                {
                    result.Success = true;
                    result.SmtpSuccess = true;
                    result.SmtpMessage = "Resend API bağlantısı doğrulandı.";
                    result.Message = "Resend bağlantısı başarılı.";
                }
                else
                {
                    result.Success = false;
                    result.SmtpSuccess = false;
                    result.SmtpMessage = $"Resend yanıt hatası: {resp.StatusCode}";
                    result.Message = "Resend API anahtarı doğrulanamadı.";
                }
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.SmtpSuccess = false;
                result.SmtpMessage = ex.Message;
                result.Message = "Resend bağlantı testi başarısız oldu.";
            }

            return Result.Success(result);
        }

        // Generic IMAP/SMTP testing
        string password = account.GetDecryptedPassword();

        // 1. Test IMAP
        if (!string.IsNullOrWhiteSpace(account.ImapHost))
        {
            try
            {
                using ImapClient imapClient = new ImapClient();
                imapClient.Timeout = 10000;

                SecureSocketOptions imapOptions = account.ImapPort switch
                {
                    993 => SecureSocketOptions.SslOnConnect,
                    143 => SecureSocketOptions.StartTlsWhenAvailable,
                    _ => SecureSocketOptions.Auto
                };

                await imapClient.ConnectAsync(account.ImapHost.Trim(), account.ImapPort, imapOptions, cts.Token);
                if (!string.IsNullOrEmpty(password))
                {
                    await imapClient.AuthenticateAsync(account.Email, password, cts.Token);
                }
                await imapClient.DisconnectAsync(true, cts.Token);

                result.ImapSuccess = true;
                result.ImapMessage = "IMAP bağlantısı ve kimlik doğrulama başarılı.";
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "IMAP connection test failed for {Email}", account.Email);
                result.ImapSuccess = false;
                result.ImapMessage = $"IMAP Hatası: {ex.Message}";
            }
        }
        else
        {
            result.ImapSuccess = false;
            result.ImapMessage = "IMAP sunucu adresi tanımlanmamış.";
        }

        // 2. Test SMTP
        if (!string.IsNullOrWhiteSpace(account.SmtpHost))
        {
            try
            {
                using SmtpClient smtpClient = new SmtpClient();
                smtpClient.Timeout = 10000;

                SecureSocketOptions smtpOptions = account.SmtpPort switch
                {
                    465 => SecureSocketOptions.SslOnConnect,
                    587 => SecureSocketOptions.StartTls,
                    25 => SecureSocketOptions.StartTlsWhenAvailable,
                    _ => SecureSocketOptions.Auto
                };

                await smtpClient.ConnectAsync(account.SmtpHost.Trim(), account.SmtpPort, smtpOptions, cts.Token);
                if (!string.IsNullOrEmpty(password))
                {
                    await smtpClient.AuthenticateAsync(account.Email, password, cts.Token);
                }
                await smtpClient.DisconnectAsync(true, cts.Token);

                result.SmtpSuccess = true;
                result.SmtpMessage = "SMTP bağlantısı ve kimlik doğrulama başarılı.";
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "SMTP connection test failed for {Email}", account.Email);
                result.SmtpSuccess = false;
                result.SmtpMessage = $"SMTP Hatası: {ex.Message}";
            }
        }
        else
        {
            result.SmtpSuccess = false;
            result.SmtpMessage = "SMTP sunucu adresi tanımlanmamış.";
        }

        result.Success = result.ImapSuccess && result.SmtpSuccess;
        result.Message = result.Success
            ? "IMAP ve SMTP bağlantı testleri başarıyla tamamlandı."
            : $"Bağlantı testi kısmen veya tamamen başarısız: {(result.ImapSuccess ? "" : "IMAP")} {(!result.ImapSuccess && !result.SmtpSuccess ? "ve " : "")}{(result.SmtpSuccess ? "" : "SMTP")}";

        return Result.Success(result);
    }
}

public class TestEmailAccountConnectionEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/email/accounts/{id:guid}/test-connection", async (Guid id, ISender sender, CancellationToken ct) =>
        {
            Result<TestEmailAccountConnectionResultDto> result = await sender.Send(new TestEmailAccountConnectionCommand(id), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<TestEmailAccountConnectionResultDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<TestEmailAccountConnectionResultDto>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("TestEmailAccountConnection")
        .WithTags("Email")
        .RequirePermission("Emails.ManageAccounts");
    }
}
