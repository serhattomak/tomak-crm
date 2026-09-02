using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace CRM.Modules.Orders.Services;

/// <summary>
/// Renders Handlebars-like templates with variable substitution.
/// Phase 1 uses simple string replacement (no Handlebars.Net dependency) to avoid
/// external package restore issues; API matches spec for future Handlebars.Net swap.
/// Variables are HTML-encoded via WebUtility.HtmlEncode except itemsTable which is raw HTML.
/// </summary>
public interface ITemplateRenderer
{
    /// <summary>
    /// Renders htmlBodyTemplate with variables. SubjectTemplate is accepted for spec compatibility
    /// but rendering focuses on htmlBody; callers needing subject should use RenderSingleAsync.
    /// </summary>
    Task<string> RenderAsync(
        string? subjectTemplate,
        string? htmlBodyTemplate,
        IDictionary<string, object> variables,
        CancellationToken ct = default);

    /// <summary>
    /// Renders a single template string with variables (used for subject and htmlBody separately).
    /// </summary>
    Task<string> RenderSingleAsync(
        string? template,
        IDictionary<string, object> variables,
        CancellationToken ct = default);
}

/// <summary>
/// Result of rendering both subject and html body.
/// </summary>
public record TemplateRenderResult(string Subject, string Html);
