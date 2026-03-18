# PathFinder — AI Agent Rules

## Prime Directives

1. **Zero Hallucination.** Never generate code that references APIs, props, hooks, or library features that do not exist. When uncertain, check official documentation or ask the developer.
2. **Clean Architecture First.** Every piece of generated code must follow the project's layered architecture. No shortcuts, no god-files.
3. **Type Safety is Non-Negotiable.** All code must be strict TypeScript (`strict: true`). No `any`, no `@ts-ignore`, no implicit types.
4. **Edge Cases Before Happy Path.** Always handle failure states, permission denials, empty data, and network errors _before_ implementing the success flow.

---

## Behavioral Constraints

### Code Generation
- Generate only code that compiles and runs against the **exact** dependency versions in `package.json`.
- **NativeWindUI first.** Always use NativeWindUI components when an equivalent exists. Never create a custom Button, Card, List, Sheet, Dialog, or Toggle when NativeWindUI ships one.
- Always use named exports. Default exports are reserved for Expo Router page components only.
- Never introduce a new dependency without explicit developer approval.
- Prefer composition over inheritance. Use hooks and utility functions, not class hierarchies.

### Location & Permissions (Critical Path)
- **Always** check permission status before accessing location services.
- Handle all permission states: `granted`, `denied`, `undetermined`, and the iOS-specific `restricted`.
- Provide clear, non-technical user messaging for every denial state.
- Never assume background location permission implies foreground permission.
- Implement graceful degradation — the app must remain usable even without location access.

### Error Handling
- Wrap all async operations in try/catch blocks.
- Use typed error boundaries for component trees.
- Log errors with contextual metadata (screen name, action, timestamp).
- Never swallow errors silently. Every catch block must either recover or inform.

### Performance
- Memoize expensive computations with `useMemo` / `useCallback` with correct dependency arrays.
- Use `React.memo` for list item components.
- Avoid inline object/array creation in JSX props.
- Prefer `FlatList` over `ScrollView` for any list of dynamic length.

---

## Response Protocol

1. **Think** — Analyze the request, identify affected layers (UI, state, data, service).
2. **Plan** — Outline the approach in brief before writing code.
3. **Implement** — Write clean, production-grade code.
4. **Validate** — Review for edge cases, type safety, and architectural compliance.
5. **Document** — Add inline comments only where intent is non-obvious.
