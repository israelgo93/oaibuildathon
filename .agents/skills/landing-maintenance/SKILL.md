---
name: landing-maintenance
description: Protect and maintain the OpenAI Build Week Manta cinematic landing. Use when changing src/App.tsx, src/styles.css, SpaceField, public assets, event content, landing CTAs, the public project showcase, responsive behavior, motion, performance, or accessibility.
---

# Landing Maintenance

Maintain the published landing without diluting its visual system, scroll narrative, performance, or accessibility. Treat the operational Buildathon platform as a separate product surface.

## Start here

1. Read `AGENTS.md` and `PRODUCT.md`.
2. Read `references/landing-map.md` before changing layout, content, assets, or motion.
3. Inspect the exact component and CSS selectors involved. Do not broadly redesign the page.
4. Preserve all unrelated landing content and behaviors.

## Boundaries

- Keep `/` as the cinematic landing and use `/registro`, `/equipo`, `/login`, `/admin`, `/jurado`, and `/mentor` for operational flows.
- The system entry point on the landing is the `Registra tu equipo` header button.
- The project showcase is conditional: render it only when `/api/showcase` returns published projects.
- Never fetch Supabase with a secret key from landing code. Public data goes through `/api/showcase`; authentication uses the publishable key only in the login surface.
- Reuse responsive WebP assets from `public/assets/`. Do not ship source PNG files from `Assets/` to the browser.
- Preserve `prefers-reduced-motion`, semantic headings, focus visibility, keyboard access, alternative text, and the skip link.

## Change workflow

1. Locate the smallest insertion or selector that solves the request.
2. Check desktop, tablet, and mobile rules that affect it.
3. Confirm motion has a reduced-motion fallback and that content remains usable without WebGL.
4. Run `npm run typecheck`, `npm test`, and `npm run build`.
5. For visible changes, verify `/` at desktop and mobile widths before committing.

## Content changes

Event dates, URLs, prizes, model names, and external program information can change. Verify current official sources before editing those claims. Keep the Spanish voice energetic, precise, inclusive, and oriented toward building a working demo.
