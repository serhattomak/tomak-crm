/**
 * Utility for rendering safe, styled HTML previews inside sandboxed iframes.
 * Ensures high contrast and readability across both light and dark themes.
 */
export function renderEmailPreviewHtml(
  content: string,
  isDark: boolean
): string {
  const bg = isDark ? "#09090b" : "#ffffff";
  const text = isDark ? "#f4f4f5" : "#18181b";
  const linkColor = isDark ? "#38bdf8" : "#0284c7";
  const border = isDark ? "#27272a" : "#e4e4e7";
  const tableHeaderBg = isDark ? "#18181b" : "#f4f4f5";
  const blockquoteBorder = isDark ? "#3f3f46" : "#d4d4d8";
  const blockquoteText = isDark ? "#a1a1aa" : "#71717a";

  const safeContent =
    content.trim() ||
    `<div style="font-family: sans-serif; color: ${isDark ? "#a1a1aa" : "#71717a"}; padding: 24px; text-align: center;">
      <p style="font-size: 14px; margin-bottom: 8px; color: ${isDark ? "#e4e4e7" : "#27272a"}; font-weight: 500;">İçerik bulunmuyor</p>
      <p style="font-size: 12px; color: ${isDark ? "#71717a" : "#a1a1aa"};">Önizlenecek şablon veya e-posta gövdesi boş.</p>
    </div>`;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <base target="_blank">
    <style>
      html, body {
        background-color: ${bg} !important;
        color: ${text} !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 13px;
        line-height: 1.6;
        margin: 0;
        padding: 14px;
        word-break: break-word;
      }
      p, span, div, li, td, th, h1, h2, h3, h4, h5, h6 {
        color: inherit;
      }
      a {
        color: ${linkColor} !important;
        text-decoration: underline;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        max-width: 100%;
        margin: 8px 0;
      }
      th, td {
        border: 1px solid ${border};
        padding: 6px 10px;
        text-align: left;
      }
      th {
        background-color: ${tableHeaderBg};
        color: inherit;
      }
      hr {
        border: 0;
        border-top: 1px solid ${border};
        margin: 16px 0;
      }
      blockquote {
        border-left: 3px solid ${blockquoteBorder};
        margin: 8px 0;
        padding-left: 12px;
        color: ${blockquoteText};
      }
      img {
        max-width: 100%;
        height: auto;
      }
    </style>
  </head>
  <body>
    ${safeContent}
  </body>
</html>`;
}
