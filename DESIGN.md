# Design System — Cloaker.lol

## Theme

Dark operational console. Restrained: tinted neutrals + cyan/blue accent for active/primary only.

## Colors (CSS variables)

| Token | Role |
|-------|------|
| `--bg` | App background |
| `--sidebar` | Nav surface |
| `--panel` | Cards / panels |
| `--field` | Inputs |
| `--text` | Primary text |
| `--muted` | Secondary text (≥ readable on dark) |
| `--cyan` / `--blue` | Accent / active |
| `--green` / `--red` / `--amber` | Semantic |

## Typography

Single stack: system Inter/ui-sans. Scale fixed rem; no display fonts in UI.

## Layout

- Desktop: sticky sidebar + content
- Mobile: top bar + horizontal/scroll nav or collapsible drawer
- Content max-width comfortable; panels stack on small screens

## Components

- Nav items, panels, fields, submit buttons, status pills, lists
- Same radius 10–14px; avoid 32px+ cards
- One elevation language (soft shadow OR border, not both heavy)

## Motion

150–220ms ease-out on hover/active; respect `prefers-reduced-motion`.
