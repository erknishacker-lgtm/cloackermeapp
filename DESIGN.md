# Design System — Cloaker.lol

## Theme

Minimal black/white ops console (Cloakup-level density).  
**Color strategy: Restrained monochrome** — pure dark surfaces + white text + gray borders. Accent = white for primary actions only.

Physical scene: operator at a dim desk; interface should disappear into the task.

## Colors

Dark tokens from the new theme model (adapted; fonts kept local):

| Token | Value | Role |
|-------|--------|------|
| `--background` | oklch(0 0 0) | Canvas pure black |
| `--sidebar` | oklch(0.18) | Nav rail gray |
| `--card` / `--panel` | oklch(0.14) | Surfaces |
| `--secondary` / accent-bg | oklch(0.25–0.32) | Hover / soft |
| `--border` | oklch(0.26) | Structure |
| `--muted-foreground` | oklch(0.72) | Secondary text |
| `--primary` | oklch(1 0 0) | White CTAs |
| `--radius` | 0.5rem | Squarer corners |
| `--shadow-sm` | 1–2px soft | Subtle elevation |

No traffic chart on dashboard. Density: compact.

## Typography (kept)

- Sans: **Oxanium**
- Serif: **Merriweather** (`.serif`)
- Mono: **Fira Code**
- Brand: logo + **ZGHOST**

## Layout

- Sidebar ~232px, logo + **ZGHOST** stacked below
- Radius 10–12px panels, 8px controls
- Elevation: 1px border only

## Brand

Ghost mark (`/logo.png`) on black. Wordmark under logo: **ZGHOST**.
