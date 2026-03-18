# PathFinder — Coding Standards

## TypeScript

### Strict Mode — No Exceptions

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Type Rules

- **No `any`.** Use `unknown` and narrow with type guards.
- **No `@ts-ignore` / `@ts-expect-error`.** Fix the type, don't suppress it.
- **No type assertions (`as`)** unless interfacing with untyped third-party APIs — and add a `// SAFETY:` comment explaining why.
- **Prefer `interface`** for object shapes. Use `type` for unions, intersections, and mapped types.
- **Explicit return types** on all exported functions and hooks.

### Naming Conventions

| Element         | Convention         | Example                     |
| --------------- | ------------------ | --------------------------- |
| Components      | PascalCase         | `ActivityCard`              |
| Hooks           | camelCase, `use*`  | `useTrackingStore`          |
| Utilities       | camelCase          | `formatDistance`            |
| Constants       | SCREAMING_SNAKE    | `MAX_COORDINATE_BUFFER`     |
| Types/Interfaces| PascalCase         | `Coordinate`, `Activity`    |
| Files           | camelCase / kebab  | `useTrackingStore.ts`       |
| Directories     | kebab-case         | `components/tracking-stats` |

---

## Component Architecture

### NativeWindUI First (Mandatory)

**NativeWindUI is the primary component library.** Before creating any UI component, follow this decision tree:

```
1. Does NativeWindUI provide this component?
   ├── YES → Use it directly. Do NOT recreate it.
   ├── PARTIALLY → Extend/wrap the NativeWindUI component.
   └── NO → Create a custom component aligned with NativeWindUI patterns.
```

**Commonly available NativeWindUI components** (always prefer these):
- `Button`, `Text`, `TextField`, `Toggle`, `Slider`
- `List`, `ListItem`, `ListSection`
- `Sheet`, `BottomSheet`
- `Avatar`, `Badge`, `Chip`
- `Card`, `Separator`
- `ActivityIndicator`, `ProgressIndicator`
- `Alert`, `Dialog`
- `DatePicker`, `Picker`
- `ThemeToggle`

> **Rule:** If you generate a custom `<Button>`, `<Card>`, `<List>`, or any component that NativeWindUI already ships — that is a **code review failure**.

### Functional Components Only

- All components must be functional. No class components.
- Use `React.memo` for components rendered inside lists or passed as children to frequently updating parents.

### Component File Structure

```typescript
// 1. Imports (external → internal → types → styles)
import { View, Text } from 'react-native';
import { useTrackingStore } from '@/stores/useTrackingStore';
import type { Activity } from '@/types';

// 2. Props interface
interface ActivityCardProps {
  activity: Activity;
  onPress: (id: string) => void;
}

// 3. Component
export function ActivityCard({ activity, onPress }: ActivityCardProps): JSX.Element {
  // hooks first
  // derived state
  // handlers
  // render
  return (
    <View className="rounded-2xl bg-white/80 p-4 shadow-sm">
      <Text className="text-lg font-semibold text-neutral-900">
        {activity.title}
      </Text>
    </View>
  );
}
```

### Component Rules

- **NativeWindUI first.** Always check NativeWindUI before writing a custom component.
- **One component per file.** Small helper sub-components are the only exception.
- **No inline styles.** Use NativeWind classNames exclusively. Use Tailwind classes only for layout and minor adjustments.
- **No business logic in components.** Delegate to hooks or store actions.
- **Prop drilling limit: 2 levels.** Beyond that, use Zustand or context.
- **Custom components must extend NativeWindUI patterns.** Match the same prop conventions, theming approach, and accessibility behavior.

---

## NativeWindUI + NativeWind / Styling

### Component Styling Hierarchy

1. **NativeWindUI components** — Use as-is. Customize via their supported props and variants.
2. **NativeWind className** — For layout adjustments (`flex`, `gap`, `p`, `m`, `rounded`, etc.) and minor visual tweaks.
3. **Inline styles** — **Last resort only.** Permitted when a dynamic value cannot be expressed as a Tailwind class (e.g., animated transforms).

### Design Philosophy: Apple HIG-Inspired Minimalism

> Every screen must feel like it belongs in a premium, thoughtfully designed product.
> If a UI element doesn't serve a clear purpose, remove it.

### Visual Principles

1. **Whitespace is a feature.** Generous padding and margins. Content breathes.
2. **Restrained color palette.** Neutral base (grays, whites) with a single accent color for primary actions.
3. **Typography hierarchy.** Maximum 2-3 font weights per screen. Size communicates importance.
4. **Subtle depth.** Use `shadow-sm` and translucent backgrounds (`bg-white/80`) sparingly.
5. **No visual noise.** No gradients, no borders for decoration, no drop shadows on every element.
6. **Rounded corners.** `rounded-2xl` as the default radius for cards and containers.

### Color System

```typescript
// constants/colors.ts
export const Colors = {
  // Neutral scale
  background: '#F8F8F8',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#8E8E93',
  textTertiary: '#C7C7CC',

  // Accent — one primary action color
  accent: '#007AFF',     // iOS system blue
  accentLight: '#E5F1FF',

  // Semantic
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',

  // Map
  polyline: '#007AFF',
  polylineGlow: 'rgba(0, 122, 255, 0.15)',
} as const;
```

### Layout Guidelines

- Use `SafeAreaView` as the root of every screen.
- Standardize horizontal padding: `px-5` for screens, `px-4` for cards.
- Minimum tap target: 44×44pt (Apple HIG requirement).
- Use `gap-*` utilities for spacing between siblings, not margins.

### Forbidden Patterns

```
❌ Custom <Button> when NativeWindUI has one → Use NativeWindUI's <Button>
❌ Custom <Card> / <List> / <Sheet>         → Use NativeWindUI equivalents
❌ style={{ marginTop: 12 }}                → Use className="mt-3"
❌ <View style={styles.container}>          → Use className="flex-1 bg-background"
❌ Bright/saturated backgrounds             → Use muted neutrals
❌ Heavy borders on cards                   → Use subtle shadow-sm or bg-white/80
❌ More than one accent color               → Single accent for primary actions
```

---

## Hooks

### Custom Hook Rules

- Prefix with `use`.
- Must return a well-typed object or tuple — never `any`.
- Keep hooks focused: one responsibility per hook.
- Document the hook's purpose with a JSDoc comment.

### Example

```typescript
/**
 * Manages the location permission lifecycle.
 * Returns current status and a request function.
 */
export function useLocationPermission(): {
  status: PermissionStatus;
  request: () => Promise<PermissionStatus>;
  isGranted: boolean;
} {
  // implementation
}
```

---

## Imports

- Use path aliases: `@/components/*`, `@/stores/*`, `@/services/*`, etc.
- Import order (enforced by ESLint):
  1. React / React Native
  2. External libraries
  3. Internal modules (`@/`)
  4. Types (use `import type`)
  5. Assets / constants
