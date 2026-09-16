# Testing Conventions

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests — use `async/await` instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat — avoid excessive `describe` nesting
