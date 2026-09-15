# React & Next.js Conventions

## React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

## Next.js

- Use the Next.js `<Image>` component — never a raw `<img>` tag
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

## React 19+

- Use ref as a prop instead of `React.forwardRef`

## Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

## Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)

## CRM UI & Architecture Standards

- For design language, border radius (`--radius: 0.5rem`), primitives (`@workspace/ui`), and the ~300 line coordinator rule, see [CRM UI Standards](../crm-ui-standards.md) and [ADR-0003](../adr/0003-crm-ui-ux-modernization-and-component-architecture.md).
