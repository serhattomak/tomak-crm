/**
 * Utility for rendering safe, styled HTML previews inside sandboxed iframes.
 * Ensures high contrast and readability across both light and dark themes.
 *
 * Colors are sourced from the CRM design tokens in
 * `packages/ui/src/styles/globals.css` (`:root` / `.dark`) and referenced
 * below only through `--email-*` custom properties. `isDark` selects which
 * token value set is emitted — the branching is preserved, no raw palette
 * is inlined at usage sites.
 */

type EmailPreviewTokens = {
  /** Surface background — `--background` token. */
  bg: string;
  /** Primary text — `--foreground` token. */
  text: string;
  /** Links — `--primary` token (CRM blue). */
  link: string;
  /** Borders, rules, table grid — `--border` token. */
  border: string;
  /** Table header fill — `--muted` token. */
  tableHeaderBg: string;
  /** Blockquote rail — `--border` token. */
  blockquoteBorder: string;
  /** Secondary text — `--muted-foreground` token. */
  secondaryText: string;
};

const LIGHT_TOKENS: EmailPreviewTokens = {
  bg: "oklch(0.99 0.002 240)",
  blockquoteBorder: "oklch(0.91 0.005 240)",
  border: "oklch(0.91 0.005 240)",
  link: "oklch(0.55 0.22 260)",
  secondaryText: "oklch(0.48 0.02 240)",
  tableHeaderBg: "oklch(0.965 0.005 240)",
  text: "oklch(0.15 0.02 240)",
};

const DARK_TOKENS: EmailPreviewTokens = {
  bg: "oklch(0.14 0.02 260)",
  blockquoteBorder: "oklch(0.28 0.02 260)",
  border: "oklch(0.28 0.02 260)",
  link: "oklch(0.65 0.18 260)",
  secondaryText: "oklch(0.68 0.02 260)",
  tableHeaderBg: "oklch(0.24 0.02 260)",
  text: "oklch(0.96 0.005 260)",
};

export function renderEmailPreviewHtml(
  content: string,
  isDark: boolean
): string {
  const tokens: EmailPreviewTokens = isDark ? DARK_TOKENS : LIGHT_TOKENS;

  const safeContent =
    content.trim() ||
    `<div style="font-family: sans-serif; color: var(--email-secondary-text); padding: 24px; text-align: center;">
      <p style="font-size: 14px; margin-bottom: 8px; color: var(--email-text); font-weight: 500;">İçerik bulunmuyor</p>
      <p style="font-size: 12px; color: var(--email-secondary-text);">Önizlenecek şablon veya e-posta gövdesi boş.</p>
    </div>`;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <base target="_blank">
    <style>
      :root {
        --email-bg: ${tokens.bg};
        --email-text: ${tokens.text};
        --email-link: ${tokens.link};
        --email-border: ${tokens.border};
        --email-table-header-bg: ${tokens.tableHeaderBg};
        --email-blockquote-border: ${tokens.blockquoteBorder};
        --email-secondary-text: ${tokens.secondaryText};
      }
      html, body {
        background-color: var(--email-bg) !important;
        color: var(--email-text) !important;
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
        color: var(--email-link) !important;
        text-decoration: underline;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        max-width: 100%;
        margin: 8px 0;
      }
      th, td {
        border: 1px solid var(--email-border);
        padding: 6px 10px;
        text-align: left;
      }
      th {
        background-color: var(--email-table-header-bg);
        color: inherit;
      }
      hr {
        border: 0;
        border-top: 1px solid var(--email-border);
        margin: 16px 0;
      }
      blockquote {
        border-left: 3px solid var(--email-blockquote-border);
        margin: 8px 0;
        padding-left: 12px;
        color: var(--email-secondary-text);
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
