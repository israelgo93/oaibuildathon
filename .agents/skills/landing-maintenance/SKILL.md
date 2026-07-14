---
name: landing-maintenance
description: Protect and maintain the OpenAI Build Week Manta cinematic landing. Use when changing src/App.tsx, src/styles.css, SpaceField, public assets, event content, landing CTAs, the public project showcase, responsive behavior, motion, performance, or accessibility.
---

# Landing Maintenance

Maintain the published landing without diluting its visual system, scroll narrative, performance, or accessibility. Treat the operational Buildathon platform as a separate product surface.

## Start here

1. Read `AGENTS.md` and `PRODUCT.md`.
2. Read `docs/IMPLEMENTATION_STATUS.md` so public claims match deployed system behavior.
3. Read `references/landing-map.md` before changing layout, content, assets, or motion.
4. Inspect the exact component and CSS selectors involved. Do not broadly redesign the page.
5. Preserve all unrelated landing content and behaviors.

## Boundaries

- Keep `/` as the cinematic landing and use `/registro`, `/equipo`, `/login`, `/admin`, `/jurado`, and `/mentor` for operational flows.
- The system entry point on the landing is the `Registra tu equipo` header button.
- The project showcase is conditional: render it only when `/api/showcase` returns published projects.
- Keep registration forms, required-field UX, team recovery, deadlines, email, administration, scoring, and mentoring outside the landing route.
- Never fetch Supabase with a secret key from landing code. Public data goes through `/api/showcase`; authentication uses the publishable key only in the login surface.
- Reuse responsive WebP assets from `public/assets/`. Source files live in `Assets/`; regenerate derivatives with `npm run optimize:assets` and follow `Assets/Generated/README.md`.
- The orbital runtime video is `public/assets/video-orbital.mp4`, served as `/assets/video-orbital.mp4`; `Assets/video-orbital.mp4` is the source copy.
- Preserve `prefers-reduced-motion`, semantic headings, focus visibility, keyboard access, alternative text, and the skip link.

## Change workflow

1. Locate the smallest insertion or selector that solves the request.
2. Check desktop, tablet, and mobile rules that affect it.
3. Confirm motion has a reduced-motion fallback and that content remains usable without WebGL.
4. If assets changed, run `npm run optimize:assets` and inspect generated sizes before staging only intended files.
5. Run `npm run typecheck`, `npm test`, `npm audit`, and `npm run build`.
6. For visible changes, verify `/` at desktop and mobile widths before committing.

## Content changes

Event dates, URLs, prizes, model names, and external program information are constants or content in `src/App.tsx` and can change. Verify current official sources before editing those claims. Keep the Spanish voice energetic, precise, inclusive, and oriented toward building a working demo.

The showcase may expose only fields approved by `/api/showcase`. Never add participant emails, phone numbers, recovery codes, internal notes, or draft submissions to the landing.
