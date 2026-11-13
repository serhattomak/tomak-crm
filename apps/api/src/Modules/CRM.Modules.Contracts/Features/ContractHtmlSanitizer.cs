using Ganss.Xss;

namespace CRM.Modules.Contracts.Features;

/// <summary>
/// Contract bodies arrive as HTML from an editor and are rendered with
/// dangerouslySetInnerHTML in the dashboard and on the public portal, so they are
/// sanitized at every boundary: on write, and again on read for rows stored before
/// this rule existed.
/// </summary>
internal static class ContractHtmlSanitizer
{
    private static readonly HtmlSanitizer Sanitizer = CreateSanitizer();

    public static string Sanitize(string? html) =>
        string.IsNullOrWhiteSpace(html) ? string.Empty : Sanitizer.Sanitize(html);

    private static HtmlSanitizer CreateSanitizer()
    {
        var sanitizer = new HtmlSanitizer();

        sanitizer.AllowedSchemes.Clear();
        sanitizer.AllowedSchemes.Add("http");
        sanitizer.AllowedSchemes.Add("https");
        sanitizer.AllowedSchemes.Add("mailto");
        sanitizer.AllowedSchemes.Add("tel");

        sanitizer.AllowedAttributes.Add("class");
        sanitizer.AllowedAttributes.Add("target");
        sanitizer.AllowedAttributes.Add("rel");

        sanitizer.AllowedCssProperties.Add("text-align");
        sanitizer.AllowedCssProperties.Add("font-weight");
        sanitizer.AllowedCssProperties.Add("font-style");
        sanitizer.AllowedCssProperties.Add("text-decoration");

        return sanitizer;
    }
}
