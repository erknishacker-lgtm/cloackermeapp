# Design System — Cloaker.lol

## Theme

Dark operational console for night-desk traffic operators.  
**Color strategy: Restrained** — cool slate neutrals + one blue accent ≤10%.

Physical scene: operator at a dim desk, secondary monitor, scanning metrics and lists — trust Linear/Stripe density, not neon cyberpunk.

## Colors

| Token | Value | Role |
|-------|--------|------|
| `--bg` | `#0a0c10` | Canvas |
| `--sidebar` | `#0c0f14` | Nav rail |
| `--panel` | `#12161d` | Surfaces |
| `--field` | `#0f1319` | Inputs |
| `--border` | `#242a35` | Structure |
| `--text` | `#eef1f6` | Primary copy |
| `--muted` | `#a8b0bd` | Secondary (readable) |
| `--accent` | `#3d9cfd` | Primary actions / active |
| Semantic | green / red / amber | Status only |

No gradient text. No cyan glow stacks. Active nav = soft accent fill + thin border.

## Typography

- Family: **IBM Plex Sans** (single family, product register)
- H1 ~1.5rem / 600 / -0.02em
- Body 14px, labels 12–13px
- Numbers: tabular-nums on metrics

## Layout

- Sidebar 260px desktop; icon rail tablet; drawer mobile
- Content max ~1280px, padding scale 4/8/12/16/20/24/32
- Radius: 8px controls, 12px panels (never 32px+)
- Elevation: **border only** on panels (no fat drop + border combo)

## Components

- Nav, panels, fields, primary/ghost buttons, metric cards, pills, tables, tutorial steps
- Focus ring: 3px accent-soft
- Hover: quiet surface lift, 160ms ease-out

## Motion

160ms `cubic-bezier(0.22, 1, 0.36, 1)` on color/border.  
`prefers-reduced-motion: reduce` disables transitions.

## Anti-patterns (project)

- WhatsApp chrome in chrome
- Loud cyan gradients on every CTA
- Hero-metric SaaS template with huge numbers + glow
