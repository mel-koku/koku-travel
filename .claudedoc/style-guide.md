# Koku Travel Style Guide

Design system reference for consistent styling across the application.

---

## Type Scale (Augmented Fourth)

Based on ratio **1.414** (√2) for harmonious typography.

| Class | Size | Use Case |
|-------|------|----------|
| `text-caption` | 8px / 0.5rem | Legal text, fine print |
| `text-small` | 11px / 0.707rem | Labels, metadata, timestamps |
| `text-base` | 16px / 1rem | Body text, paragraphs |
| `text-lg` | 23px / 1.414rem | Lead paragraphs, card titles |
| `text-xl` | 32px / 2rem | H4, subheadings |
| `text-2xl` | 45px / 2.828rem | H3, section headings |
| `text-3xl` | 64px / 4rem | H2, page headings |
| `text-4xl` | 90px / 5.657rem | H1, hero headings |
| `text-display` | 128px / 8rem | Hero headlines, display text |

### CSS Variables
```css
--text-caption: 0.5rem;
--text-small: 0.707rem;
--text-base: 1rem;
--text-lg: 1.414rem;
--text-xl: 2rem;
--text-2xl: 2.828rem;
--text-3xl: 4rem;
--text-4xl: 5.657rem;
--text-display: 8rem;
```

---

## Color Palette

### Semantic Colors (Use These)

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `bg-background` | #fffcf9 | #1a1917 | Page backgrounds |
| `bg-surface` | #f7f4f0 | #2d2a26 | Cards, elevated surfaces |
| `text-foreground` | #2d2a26 | #f5f2ec | Primary text |
| `text-foreground-secondary` | #6b6560 | #a39e93 | Secondary text |
| `border-border` | #e8e4de | #3d3a36 | All borders |
| `bg-brand-primary` | #8b7355 | #a68b6a | Primary buttons, accents |
| `bg-brand-secondary` | #c4846c | #d4967e | Secondary accents |

### Earthy Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `text-charcoal` | #2d2a26 | Headings, primary text |
| `text-warm-gray` | #6b6560 | Labels, secondary text |
| `text-stone` | #a39e93 | Muted text, placeholders |
| `bg-sand` | #e8e4de | Hover states, subtle backgrounds |
| `text-sage` | #607263 | Links, success states, accents |
| `text-terracotta` | #c4846c | Warm accents |
| `bg-cream` | #f5f2ec | Alternative light background |

### Semantic States

| Token | Hex | Usage |
|-------|-----|-------|
| `text-success` / `bg-success` | #607263 | Success messages, confirmations |
| `text-warning` / `bg-warning` | #c9a227 | Warnings, cautions |
| `text-error` / `bg-error` | #ab4225 | Errors, destructive actions |

---

## Common Patterns

### Page Backgrounds
```jsx
// Standard page
<div className="min-h-screen bg-surface">

// Card on page
<div className="rounded-2xl border border-border bg-background shadow-md">
```

### Text Hierarchy
```jsx
// Page heading
<h1 className="text-3xl font-bold text-charcoal">

// Section heading
<h2 className="text-xl font-semibold text-charcoal">

// Body text
<p className="text-base text-foreground">

// Secondary/helper text
<p className="text-sm text-foreground-secondary">

// Muted/meta text
<span className="text-xs text-stone">
```

### Buttons

```jsx
// Primary action button (pill shape)
<button className="rounded-full bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary/90">

// Secondary/outline button (pill shape)
<button className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-warm-gray hover:bg-sand">

// Destructive button
<button className="rounded-full border border-error/30 bg-error/10 px-4 py-2 text-sm text-error hover:bg-error/20">

// Link-style button
<button className="text-sage hover:text-sage/80">

// Small/inline buttons (use rounded-lg)
<button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-warm-gray hover:bg-sand">
```

### Form Inputs
```jsx
// Text input
<input className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />

// Select dropdown
<select className="h-10 w-full rounded-lg border border-border bg-background px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">

// Label
<label className="text-sm text-warm-gray">
```

### Links
```jsx
// Navigation link
<a className="transition-colors hover:text-brand-primary">

// Text link
<a className="text-sage underline hover:text-sage/80">
```

### Cards
```jsx
<div className="rounded-2xl border border-border bg-background p-6 shadow-md">
  <h3 className="text-lg font-semibold text-charcoal">Title</h3>
  <p className="mt-2 text-sm text-stone">Description</p>
</div>
```

### Loading Spinners
```jsx
<div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
```

### Status Messages
```jsx
// Info/neutral
<div className="text-xs text-stone">{status}</div>

// Warning
<div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">

// Error
<div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
```

---

## Migration Reference

When updating old code, use this mapping:

| Old Class | New Class |
|-----------|-----------|
| `bg-gray-50`, `bg-zinc-50` | `bg-surface` |
| `bg-white` | `bg-background` |
| `text-gray-900`, `text-zinc-900` | `text-charcoal` |
| `text-gray-700`, `text-zinc-700` | `text-warm-gray` |
| `text-gray-600` | `text-foreground-secondary` |
| `text-gray-500`, `text-zinc-500` | `text-stone` |
| `border-gray-200`, `border-zinc-200` | `border-border` |
| `hover:bg-gray-50`, `hover:bg-zinc-100` | `hover:bg-sand` |
| `bg-indigo-600` | `bg-brand-primary` |
| `text-indigo-600` | `text-sage` |
| `hover:bg-indigo-700` | `hover:bg-brand-primary/90` |
| `focus:ring-indigo-500` | `focus:ring-brand-primary` |
| `bg-indigo-100` | `bg-sage/10` |
| `border-red-500` (decorative) | `border-brand-primary` |
| `text-red-500` (decorative) | `text-brand-primary` |
| `border-red-200` (error) | `border-error/30` |
| `bg-red-50` (error) | `bg-error/10` |
| `text-red-700` (error) | `text-error` |

---

## Dark Mode

Colors automatically adapt via CSS custom properties. No need for `dark:` prefixes when using semantic tokens.

```css
/* Light mode (default) */
--background: #fffcf9;
--foreground: #2d2a26;

/* Dark mode (automatic) */
--background: #1a1917;
--foreground: #f5f2ec;
```

---

## Custom Properties Reference

All available CSS variables in `globals.css`:

```css
:root {
  /* Core */
  --background: #fffcf9;
  --foreground: #2d2a26;
  --foreground-secondary: #6b6560;
  --surface: #f7f4f0;
  --border: #e8e4de;

  /* Brand */
  --brand-primary: #8b7355;
  --brand-secondary: #c4846c;
  --accent: #607263;

  /* Semantic */
  --success: #607263;
  --warning: #c9a227;
  --error: #ab4225;

  /* Earthy palette */
  --stone: #a39e93;
  --cream: #f5f2ec;
  --sage: #607263;
  --terracotta: #c4846c;
  --charcoal: #2d2a26;
  --sand: #e8e4de;
  --warm-gray: #6b6560;
}
```
