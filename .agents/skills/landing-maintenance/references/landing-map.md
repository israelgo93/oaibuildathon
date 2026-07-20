# Landing map

## Runtime

- Entry: `src/main.tsx` renders `src/Router.tsx`.
- Landing route: `/` renders the thin `src/App.tsx` entry, which delegates to `src/landing/LandingPage.tsx`.
- Scene orchestration lives in `src/landing/scenes/`; shared header, footer, orbit and countdown pieces live directly in `src/landing/`.
- Cinematic layout and motion CSS: `src/landing/landing-cinematic.css`; `src/styles.css` remains the global/base stylesheet and keeps the conditional showcase styles.
- Three.js ambient layer: `src/components/SpaceField.tsx`.
- Conditional public projects: `src/components/ShowcaseSection.tsx` using `/api/showcase`.
- Operational UI CSS: `src/system.css`; do not mix dashboard selectors into landing sections.
- Frozen event dates, external URLs, assets, prizes, model names, agenda, takeaways and community metadata live in `src/landing/content.ts` and are protected by `src/landing/content.test.ts`.
- `src/landing/LandingCountdown.tsx` reads `/api/public-config`, uses the earliest global/challenge deadline and keeps `SUBMISSION_DEADLINE_FALLBACK` only for transient API failures. Countdown arithmetic is shared through `src/hooks/useCountdown.ts` and `src/lib/countdown.ts`.
- `src/landing/useLandingMotion.ts` selects the cinematic or linear composition. `src/landing/useHeroVideoScrub.ts` is the only owner of video seeking and receives the hero spring (not the raw progress) so fast scrolls animate through frames.
- `src/landing/scenes/ModelOrbit3D.tsx` renders Sol/Terra/Luna as lazy-loaded Three.js spheres with procedural textures inside the models scene; on WebGL failure it falls back to the CSS orbs.
- Orbital runtime video: `public/assets/video-orbital.mp4`, requested as `/assets/video-orbital.mp4`. It is re-encoded from the source copy with keyframes every 4 frames (`-g 4 -sc_threshold 0 -movflags +faststart`) so scroll seeks resolve instantly; keep that GOP when replacing it.
- Orbital source copy: `Assets/video-orbital.mp4`.
- `vite.config.ts` proxies only `/api/showcase` and `/api/public-config` to production during `npm run dev`, because Vite does not execute the Vercel Functions in `api/`.
- Image sources live under `Assets/`; browser-ready derivatives live under `public/assets/` and are regenerated with `npm run optimize:assets` according to `Assets/Generated/README.md`.
- Community logo sources are `Assets/openai-com-wordmark.png`, `Assets/TheBuildersLogo.png`, `Assets/logo-kriuu.png`, `Assets/logo-clubia-uleam2.jpeg`, and `Assets/PUCE.jpeg`; their optimized WebP derivatives use the `community-*.webp` names in `public/assets/`.

## Narrative order

1. Fixed header and scroll progress.
2. Orbital hero, submission-deadline countdown, Luma CTA, and agenda CTA.
3. Portoviejo experience scene, which keeps the inaugural Manta poster as historic material.
4. Global Build Week context.
5. Model family narrative.
6. Agenda.
7. Prizes.
8. Takeaways.
9. Conditional showcase for the published winning projects from the inaugural Manta edition.
10. Final Luma/community CTA.
11. Official sponsor: OpenAI, above the principal organizer.
12. Organization and coorganizing communities: The Builders first as principal organizer, followed by Kriuu and Club IA ULEAM side by side.
13. Venue: PUCE Manabí, centered after the coorganizing communities with an enlarged logo.
14. Footer.

The active edition is Portoviejo (July 21, 2026, `https://luma.com/buildathon.porto`). Manta (July 15) remains referenced only as history: the inaugural poster in the experience scene and the showcase heading. The countdown ignores the API deadline when it belongs to an expired earlier edition and keeps `SUBMISSION_DEADLINE_FALLBACK`.

## Visual invariants

- Dark orbital palette with pink primary, blue accents, and warm sun highlights.
- OpenAI Sans Wordmark for display text; system font for long copy.
- There is no persistent orbit overlay: no decorative ellipse crosses the hero, the final CTA or the communities section. The only orbital ring belongs to the Sol/Terra/Luna scene and is drawn inside its Three.js canvas.
- The hero countdown block has no horizontal rule above or below its digits.
- The prizes scene has no magenta band: the solar photograph is the permanent full-bleed background with a left scrim, and the ghost `8.500` figure is light-toned over the image.
- Motion supports narrative and never leaves hidden interactive controls in the focus order.
- Assets use `srcSet` at 1280, 2560, and 3840 where available.
- The scroll-scrubbed cinematic composition is enabled only for `(min-width: 960px) and (min-height: 700px) and (orientation: landscape)` without reduced motion.
- The agenda is never pinned: it scrolls as a normal readable document with a sticky date column, even in cinematic mode.
- The scene index rail is a minimal fixed column of numbers and ticks with `mix-blend-mode: difference` (no panel background) and the active scene is derived from scroll position, not `IntersectionObserver` ratios.
- Scene reveals must complete early (clip/opacity done before ~20% of scene progress) so no text is ever shown cropped or straddling a background boundary; the prizes image keeps a left scrim for permanent copy legibility.
- All other viewports use a shorter vertical document with no horizontal choreography and no video element.
- The desktop orbital video scrubs through the first 72% of its duration to avoid the excessively close final frames.
- The 1280x720 runtime video is rendered at no more than its intrinsic 1280px width, contained at 16:9 and blended into the static deep-space field.
- `prefers-reduced-motion` activates the complete linear document at any width: no pinning, video, horizontal displacement, masks that hide content or WebGL.
- The showcase slot has zero height when `/api/showcase` returns no projects and remains between takeaways and the final CTA when populated.

## Allowed system integration

The landing may expose one direct system entry, `Registra tu equipo`, and a public showcase backed by `/api/showcase`. The endpoint selects published submissions from the most recent event with showcase visibility enabled and must project only approved project fields.

Registration forms, authentication, team recovery, required-field rules, deadlines, transactional email, administration, scoring, and mentoring belong to their dedicated routes. `results_public` currently has no landing section or public endpoint; do not imply that rankings are public merely because the flag exists.
