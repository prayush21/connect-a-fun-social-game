# Signull Design System

A comprehensive guide to the design language, tokens, and patterns used across the Signull application.

---

## 🎨 Design Philosophy

Signull uses a **Neobrutalist** design language characterized by:

- High contrast black/white palette
- Hard offset shadows with no blur
- Bold 2px black borders
- Large rounded corners
- Tactile, press-down interaction patterns
- Playful yet minimal aesthetic

---

## 📐 Design Tokens

### Shadows (Neobrutalist)

Use these semantic shadow utilities consistently:

| Token                       | Value                           | Usage                               |
| --------------------------- | ------------------------------- | ----------------------------------- |
| `shadow-neobrutalist-sm`    | `2px 2px 0px 0px rgba(0,0,0,1)` | Buttons, small interactive elements |
| `shadow-neobrutalist`       | `4px 4px 0px 0px rgba(0,0,0,1)` | Cards, primary containers           |
| `shadow-neobrutalist-lg`    | `8px 8px 0px 0px rgba(0,0,0,1)` | Modals, overlays                    |
| `shadow-neobrutalist-hover` | `1px 1px 0px 0px rgba(0,0,0,1)` | Hover state (with translate)        |

**Interaction Pattern:**

```tsx
className =
  "shadow-neobrutalist-sm hover:translate-y-[1px] hover:shadow-neobrutalist-hover active:translate-y-[2px] active:shadow-none";
```

---

### Border Radius

| Token          | Value  | Usage                                     |
| -------------- | ------ | ----------------------------------------- |
| `rounded-full` | 9999px | Buttons, pills, badges, circular elements |
| `rounded-3xl`  | 24px   | Primary cards, main containers            |
| `rounded-2xl`  | 16px   | Secondary/nested cards, modals            |
| `rounded-xl`   | 12px   | Inputs, form elements, toasts             |
| `rounded-lg`   | 8px    | Small nested elements (rarely used)       |

**Hierarchy:**

- Page-level cards → `rounded-3xl`
- Nested cards/modals → `rounded-2xl`
- Interactive elements → `rounded-full` or `rounded-xl`

---

### Colors

#### Core Palette

| Token           | Hex       | Usage                               |
| --------------- | --------- | ----------------------------------- |
| `primary`       | `#1a1f2e` | Primary brand color, filled buttons |
| `primary-light` | `#2a3142` | Hover states                        |
| `primary-dark`  | `#0f1219` | Active states                       |
| `surface`       | `#F2F3F5` | Page backgrounds                    |
| `surface-light` | `#FFFFFF` | Card backgrounds                    |

#### Card States

| Token           | Hex       | Usage                   |
| --------------- | --------- | ----------------------- |
| `card-bg`       | `#FFFFFF` | Card backgrounds        |
| `card-border`   | `#000000` | All card borders        |
| `card-active`   | `#000000` | Active state indicator  |
| `card-inactive` | `#E5E5E5` | Inactive/disabled state |
| `card-hover`    | `#F9F9F9` | Hover backgrounds       |

#### Draft States (Pending/Uncommitted)

| Token          | Hex       | Usage                 |
| -------------- | --------- | --------------------- |
| `draft-bg`     | `#F5F5F5` | Draft card background |
| `draft-border` | `#A3A3A3` | Draft card border     |
| `draft-text`   | `#525252` | Draft text color      |
| `draft-muted`  | `#737373` | Draft secondary text  |
| `draft-accent` | `#404040` | Draft emphasis        |

#### Semantic Colors

| Category | 50 (bg)   | 500 (text) | 600 (emphasis) |
| -------- | --------- | ---------- | -------------- |
| Success  | `#f0fdf4` | `#22c55e`  | `#16a34a`      |
| Warning  | `#fffbeb` | `#f59e0b`  | `#d97706`      |
| Error    | `#fef2f2` | `#ef4444`  | `#dc2626`      |

#### Notification Tints

| Token            | Hex       | Usage                 |
| ---------------- | --------- | --------------------- |
| `notify-info`    | `#F0F9FF` | Info notifications    |
| `notify-success` | `#F0FDF4` | Success notifications |
| `notify-warning` | `#FFFBEB` | Warning notifications |
| `notify-error`   | `#FEF2F2` | Error notifications   |

---

### Typography

#### Font Families

| Token   | Stack                                                   | Usage                           |
| ------- | ------------------------------------------------------- | ------------------------------- |
| Primary | `Bricolage Grotesque`                                   | All UI text (set in layout.tsx) |
| Mono    | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas` | Room codes, code display        |

#### Text Patterns

| Pattern          | Classes                                                 | Usage              |
| ---------------- | ------------------------------------------------------- | ------------------ |
| **Card Title**   | `text-sm font-bold uppercase tracking-wider text-black` | All card headers   |
| **Card Body**    | `text-base leading-relaxed text-black`                  | Card content text  |
| **Label**        | `text-xs uppercase tracking-wide text-neutral-500`      | Form labels, hints |
| **Room Code**    | `font-mono text-5xl font-bold tracking-widest`          | Large room codes   |
| **Button Text**  | `text-sm font-bold uppercase tracking-wider`            | Button labels      |
| **Notification** | `text-xs font-medium`                                   | Toast/banner text  |

---

### Spacing

#### Card Spacing

| Token            | Value         | Usage                     |
| ---------------- | ------------- | ------------------------- |
| `--card-padding` | `2rem` (32px) | Internal card padding     |
| `--card-gap`     | `1rem` (16px) | Gap between card elements |

#### Card Sizes

| Token     | Value   | Usage        |
| --------- | ------- | ------------ |
| `card-sm` | `320px` | Small cards  |
| `card-md` | `400px` | Medium cards |
| `card-lg` | `480px` | Large cards  |

---

### Animations

#### Timing Functions

| Token        | Value                                    | Usage                      |
| ------------ | ---------------------------------------- | -------------------------- |
| `card-swipe` | `cubic-bezier(0.4, 0, 0.2, 1)`           | Card swipe gestures        |
| `card-snap`  | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | Card snap-back             |
| `smooth`     | `cubic-bezier(0.4, 0, 0.2, 1)`           | General smooth transitions |

#### Durations

| Token   | Value   | Usage                |
| ------- | ------- | -------------------- |
| `card`  | `300ms` | Card transitions     |
| `swipe` | `250ms` | Swipe gestures       |
| `snap`  | `400ms` | Snap-back animations |

#### Animation Classes

| Class                       | Description                     |
| --------------------------- | ------------------------------- |
| `animate-fade-in`           | Simple fade in (0.2s)           |
| `animate-scale-in`          | Scale + fade in (0.2s)          |
| `animate-slide-up`          | Slide up + fade in (0.3s)       |
| `animate-card-enter`        | Card entrance with scale (0.4s) |
| `animate-card-exit`         | Card exit with scale (0.3s)     |
| `animate-letter-slide-up`   | Letter blocks slide up (0.4s)   |
| `animate-notification-fade` | Notification fade (0.3s)        |

#### Framer Motion Spring Config

Use this consistent spring configuration across components:

```tsx
const SPRING_CONFIG = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};
```

---

## 🧩 Component Patterns

### Button Variants

#### Round Button (Icon)

```tsx
className="flex items-center justify-center rounded-full border-2 border-black bg-white
  shadow-neobrutalist-sm hover:translate-y-[1px] hover:shadow-neobrutalist-hover
  active:translate-y-[2px] active:shadow-none"
```

#### Primary Button

```tsx
className="rounded-full border-2 border-black bg-primary text-white
  shadow-neobrutalist-sm hover:translate-y-[1px] hover:shadow-neobrutalist-hover
  active:translate-y-[2px] active:shadow-none"
```

#### Secondary Button

```tsx
className="rounded-full border-2 border-black bg-white text-black
  shadow-neobrutalist-sm hover:translate-y-[1px] hover:shadow-neobrutalist-hover
  active:translate-y-[2px] active:shadow-none"
```

### Card Pattern

```tsx
className =
  "w-full bg-white rounded-3xl border-2 border-black shadow-neobrutalist p-6";
```

### Modal Pattern

```tsx
className =
  "w-full max-w-md rounded-2xl border-2 border-black bg-white shadow-neobrutalist-lg p-6";
```

### Input Pattern

```tsx
className="w-full rounded-xl border-2 border-neutral-200 px-4 py-2 text-base
  transition-all focus:border-primary focus:outline-none"
```

---

## ✅ Do's and Don'ts

### ✅ Do

- Use `border-2 border-black` for interactive elements
- Apply neobrutalist shadows consistently by depth level
- Use `uppercase tracking-wider` for labels and titles
- Implement press-down interaction (translate + shadow reduce)
- Use the semantic color tokens for status indicators
- Apply `rounded-3xl` for primary cards, `rounded-2xl` for nested

### ❌ Don't

- Mix shadow colors (always use pure black `rgba(0,0,0,1)`)
- Use blur on shadows (keep them hard-edged)
- Apply random border radius values
- Use raw color values instead of tokens
- Skip the hover/active states on interactive elements
- Use thin borders (1px) on primary elements

---

## 📱 Responsive Considerations

### Mobile-First Patterns

- Letter blocks use `clamp()` for responsive sizing
- Cards stretch to full width on mobile (`max-w-md` on larger screens)
- Touch targets minimum 44x44px
- Safe area insets for iOS notch support

### CSS Variables for Responsive Elements

```css
--letter-block-size: clamp(2rem, 8vw, 3rem);
--letter-font-size: clamp(1rem, 4vw, 1.5rem);
--letter-gap: clamp(0.25rem, 1vw, 0.5rem);
```

---

## ♿ Accessibility

### Built-in Support

- `prefers-reduced-motion`: Animations disabled/reduced
- `prefers-contrast: high`: Increased border width
- `:focus-visible`: Clear focus indicators
- Safe area insets for iOS devices

### Focus States

```css
:focus-visible {
  outline: 2px solid var(--card-active);
  outline-offset: 2px;
}
```

---

## 🚀 Usage for New Features

When building new features (blogs, challenges, marketing):

1. **Start with tokens** - Use design tokens, not raw values
2. **Match depth** - Use appropriate shadow level for element hierarchy
3. **Consistent radius** - Follow the radius hierarchy
4. **Typography patterns** - Use established text patterns
5. **Interaction states** - Always include hover/active/disabled states
6. **Test accessibility** - Check reduced motion and high contrast modes

### Quick Reference

```tsx
// Card with interaction
<div className="rounded-3xl border-2 border-black bg-white p-6 shadow-neobrutalist">
  <h2 className="text-sm font-bold uppercase tracking-wider text-black">Title</h2>
  <p className="text-base leading-relaxed text-black">Content</p>
</div>

// Interactive Button
<button className="rounded-full border-2 border-black bg-white px-6 py-3
  text-sm font-bold uppercase tracking-wider shadow-neobrutalist-sm
  hover:translate-y-[1px] hover:shadow-neobrutalist-hover
  active:translate-y-[2px] active:shadow-none">
  Click Me
</button>
```
