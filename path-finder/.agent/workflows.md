# PathFinder — Development Workflows

## The Vibe Coding Loop

Every feature is developed through a disciplined 4-phase cycle. No phase is skippable.

```
┌──────────────────────────────────────────────────┐
│                                                  │
│   1. PROMPT    →   2. GENERATE   →   3. REVIEW  │
│       ↑                                  │       │
│       └──────────── 4. REFINE ◄──────────┘       │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

### Phase 1: Prompt (Define Intent)

Write a clear, scoped request that includes:

- [ ] **What** — The feature or fix to implement.
- [ ] **Where** — The files, layers, or components affected.
- [ ] **Constraints** — Any performance, UX, or architectural requirements.
- [ ] **Edge Cases** — Known failure modes to handle upfront.

**Template:**
```
Implement [feature] in [file/layer].
It should [expected behavior].
Handle edge cases: [list].
Follow the coding standards in .agent/coding-standards.md.
```

---

### Phase 2: Generate (AI Code Output)

The AI produces code that must satisfy:

- [ ] Compiles with zero TypeScript errors.
- [ ] Follows the layered architecture (UI → State → Service → Data).
- [ ] Uses NativeWind for all styling — no inline styles.
- [ ] Includes proper error handling and loading states.
- [ ] All exported functions have explicit return types.

---

### Phase 3: Review (Rigorous Edge-Case Audit)

Before accepting generated code, validate against this checklist:

#### Correctness
- [ ] Does it handle `null` / `undefined` / empty arrays?
- [ ] Are all async paths wrapped in try/catch?
- [ ] Are permission states handled exhaustively?

#### Performance
- [ ] Are expensive computations memoized?
- [ ] Will this cause unnecessary re-renders?
- [ ] Are list components using `FlatList` with proper `keyExtractor`?

#### Architecture
- [ ] Is business logic in the correct layer (service, not component)?
- [ ] Is state managed through Zustand, not local state hacks?
- [ ] Are DB operations going through the repository layer?

#### UX / Design
- [ ] Does the UI follow Apple HIG minimalism?
- [ ] Are loading, empty, and error states implemented?
- [ ] Is the tap target ≥ 44×44pt?

---

### Phase 4: Refine (Iterate Until Clean)

If any review item fails:

1. Identify the specific violation.
2. Re-prompt with targeted instructions.
3. Re-generate only the affected code.
4. Re-review the changed section.
5. Repeat until all checks pass.

---

## Feature Development Workflow

```
1. Check product.md for feature scope
2. Check architecture.md for affected layers
3. Draft implementation in the correct files
4. Run: npx expo start (verify it compiles)
5. Manual device testing on Expo Go
6. Review against coding-standards.md
7. Commit with conventional commit message
```

---

## Git Conventions

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(tracking): add live distance calculation
fix(permissions): handle iOS restricted state
refactor(db): extract activity repository
style(history): adjust card padding for consistency
chore(deps): bump expo-location to 18.x
```

### Branch Strategy

```
main ──── stable, deployable
  └── feat/[feature-name]   ── feature branches
  └── fix/[bug-description] ── bugfix branches
```
