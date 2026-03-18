# PathFinder — Frontend Context

## Design System: Ultra-Minimalist, Apple HIG-Inspired

### Core Principles

1. **Clarity.** Every element on screen has a purpose. If it doesn't communicate or enable action, remove it.
2. **Deference.** The UI gets out of the way of the content — the map and the user's data are the focus.
3. **Depth.** Use subtle layering (translucency, shadow) to establish hierarchy without visual noise.

---

## NativeWindUI — Component-First Development

**NativeWindUI is the primary UI component library.** All UI must be built using NativeWindUI components where available.

### Decision Tree

```
Need a UI element?
  1. Check NativeWindUI → Component exists? → USE IT.
  2. Component partially fits? → EXTEND / WRAP it.
  3. No equivalent? → Create a custom component following NativeWindUI's patterns.
```

### Key NativeWindUI Components to Prefer

| Need                  | Use NativeWindUI's...         | NOT...                          |
| --------------------- | ----------------------------- | ------------------------------- |
| Buttons               | `<Button>`                    | Custom `<Pressable>` wrapper    |
| Lists                 | `<List>`, `<ListItem>`        | Custom FlatList item components |
| Cards                 | `<Card>`                      | Styled `<View>` with shadow     |
| Bottom sheets         | `<Sheet>`                     | Third-party sheet library       |
| Text display          | `<Text>`                      | Raw RN `<Text>` (unless needed) |
| Loading indicators    | `<ActivityIndicator>`         | Custom spinner                  |
| Dialogs / Alerts      | `<Alert>`, `<Dialog>`         | Custom modal                    |
| Toggles / Switches    | `<Toggle>`                    | Custom switch component         |
| Progress bars         | `<ProgressIndicator>`         | Custom progress view            |

### Extension Pattern

When extending NativeWindUI components, wrap — don't fork:

```tsx
import { Button } from '@/components/nativewindui/Button';

interface TrackingButtonProps {
  isTracking: boolean;
  onPress: () => void;
}

export function TrackingButton({ isTracking, onPress }: TrackingButtonProps): JSX.Element {
  return (
    <Button
      variant={isTracking ? 'destructive' : 'primary'}
      size="lg"
      onPress={onPress}
    >
      {isTracking ? 'Stop' : 'Start Tracking'}
    </Button>
  );
}
```

---

## Screen States

Every screen and interactive component **must** implement all four states:

### 1. Loading State
- Use skeleton placeholders that match the layout of the loaded content.
- Never show a blank screen or a spinner in isolation.
- For the map: show a muted placeholder with a subtle pulse animation.

### 2. Empty State
- Provide a friendly, actionable message.
- Include an illustration or icon that matches the minimalist aesthetic.
- Always offer a clear CTA (e.g., "Start your first activity").

```
Example (History screen, no activities):
┌──────────────────────────┐
│                          │
│       🏃 (icon)         │
│                          │
│   No activities yet      │
│   Start tracking to see  │
│   your routes here.      │
│                          │
│   [ Start Tracking ]     │
│                          │
└──────────────────────────┘
```

### 3. Error State
- Display a concise, non-technical error message.
- Always provide a retry action.
- Never show raw error messages, stack traces, or error codes to the user.

### 4. Success / Loaded State
- The default, fully populated state.
- Transitions smoothly from the loading state (fade in, not a hard swap).

---

## Interaction Guidelines

### Animations & Transitions
- Use `react-native-reanimated` for all animations.
- Transitions between states should be **300ms or less**.
- Preferred easing: `Easing.out(Easing.cubic)` — fast start, gentle stop.
- Page transitions follow Expo Router defaults (stack push/pop).

### Touch Feedback
- All tappable elements must have visible press feedback (opacity reduction or scale down).
- Use NativeWindUI's `<Button>` for actions. Use `Pressable` only for non-button tappable areas.
- Never use `TouchableOpacity`.
- Minimum tap target: **44×44pt** (Apple HIG baseline).

### Gestures
- Swipe-to-delete on history items (if implemented).
- Map supports pinch-to-zoom and pan natively via MapLibre.
- No custom gestures that conflict with system gestures (edge swipe for back).

---

## Layout Patterns

### Screen Container

```tsx
<SafeAreaView className="flex-1 bg-neutral-50">
  <View className="flex-1 px-5">
    {/* Screen content */}
  </View>
</SafeAreaView>
```

### Card Component

Use NativeWindUI's `<Card>` as the base. Apply layout adjustments via className:

```tsx
import { Card } from '@/components/nativewindui/Card';

<Card className="p-4">
  {/* Card content */}
</Card>
```

### Stats Row

```tsx
<View className="flex-row items-center justify-between py-3">
  <View className="items-center">
    <Text className="text-2xl font-bold text-neutral-900">5.2</Text>
    <Text className="text-xs text-neutral-400">km</Text>
  </View>
  {/* More stat items */}
</View>
```

---

## Typography Scale

| Use Case            | Class                                         |
| ------------------- | --------------------------------------------- |
| Screen title        | `text-3xl font-bold text-neutral-900`         |
| Section header      | `text-lg font-semibold text-neutral-900`      |
| Body text           | `text-base text-neutral-700`                  |
| Secondary / caption | `text-sm text-neutral-400`                    |
| Stat value (large)  | `text-4xl font-bold tracking-tight text-neutral-900` |
| Stat label          | `text-xs uppercase tracking-wide text-neutral-400`   |

---

## Button Styles

All buttons use NativeWindUI's `<Button>` component with variant props:

### Primary Action

```tsx
import { Button } from '@/components/nativewindui/Button';

<Button variant="primary" size="lg">
  Start Tracking
</Button>
```

### Secondary / Ghost

```tsx
<Button variant="secondary">
  Cancel
</Button>
```

### Destructive

```tsx
<Button variant="destructive">
  Discard
</Button>
```

---

## Permission UI

### Location Permission Flow

1. **Pre-prompt screen** (before system dialog):
   - Explain _why_ PathFinder needs location access.
   - Use a single illustration and a concise 1-2 sentence explanation.
   - CTA: "Enable Location" triggers the system permission dialog.

2. **Denied state**:
   - Show a non-blocking card explaining that tracking requires location.
   - Provide a "Open Settings" button linking to the app's system settings page.
   - Never repeatedly prompt. Respect the user's choice.

3. **Restricted state** (iOS parental controls):
   - Show a read-only message: "Location access is restricted on this device."
   - Do not offer a settings button (it won't help).

---

## Accessibility

- All images and icons must have `accessibilityLabel`.
- Interactive elements must have `accessibilityRole` and `accessibilityHint`.
- Ensure sufficient color contrast (4.5:1 minimum for text).
- Support Dynamic Type scaling where possible.
- Screen reader navigation order must be logical (top-to-bottom, left-to-right).
