using System.Collections.Generic;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace CRM.Modules.Orders.Services;

/// <summary>
/// Simple Handlebars-like renderer without external Handlebars.Net dependency.
/// Replaces {{var}} and {{{var}}} with HTML-encoded values (except itemsTable raw).
/// Falls back to plain text on error. Sanitizes &lt;script&gt; tags.
/// Future: swap to Handlebars.Net Handlebars.Create().Compile with zero API change.
/// </summary>
public class HandlebarsRenderer(ILogger<HandlebarsRenderer> logger) : ITemplateRenderer
{
    // Matches {{var}}, {{ var }}, {{{var}}}, {{{ var }}}
    private static readonly Regex HandlebarsRegex = new(
        @"\{\{\{?\s*(\w+)\s*\}?\}\}",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Regex ScriptTagRegex = new(
        @"<script[^>]*>.*?</script>",
        RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.Singleline);

    // Raw HTML variables that should NOT be HtmlEncoded
    private static readonly HashSet<string> RawVariables = new(StringComparer.OrdinalIgnoreCase)
    {
        "itemsTable"
    };

    public Task<string> RenderAsync(
        string? subjectTemplate,
        string? htmlBodyTemplate,
        IDictionary<string, object> variables,
        CancellationToken ct = default)
    {
        // Spec expects htmlBody rendering; subjectTemplate is ignored here (caller uses RenderSingleAsync for subject).
        // Keep API compatible: render htmlBodyTemplate.
        return RenderSingleAsync(htmlBodyTemplate, variables, ct);
    }

    public Task<string> RenderSingleAsync(
        string? template,
        IDictionary<string, object> variables,
        CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(template))
        {
            return Task.FromResult(string.Empty);
        }

        try
        {
            string rendered = HandlebarsRegex.Replace(template, match =>
            {
                string key = match.Groups[1].Value;
                if (!variables.TryGetValue(key, out object? value) || value is null)
                {
                    // Fallback empty string if var not found (spec requirement)
                    return string.Empty;
                }

                string stringValue = value.ToString() ?? string.Empty;

                if (RawVariables.Contains(key))
                {
                    // itemsTable is pre-rendered HTML table — inject raw
                    return stringValue;
                }

                // HTML-encode all other variables (Handlebars {{var}} escaping)
                return WebUtility.HtmlEncode(stringValue);
            });

            // Sanitize: strip <script> tags (Ganss.XSS alternative for phase 1)
            rendered = ScriptTagRegex.Replace(rendered, string.Empty);

            return Task.FromResult(rendered);
        }
        catch (Exception ex)
        {
            // Compile errors caught and returned as plain text fallback (spec)
            logger.LogWarning(ex, "Template render failed, returning fallback plain text");
            string fallback = WebUtility.HtmlEncode(template);
            return Task.FromResult(fallback);
        }
    }
}
