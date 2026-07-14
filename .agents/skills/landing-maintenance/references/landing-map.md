# Landing map

## Runtime

- Entry: `src/main.tsx` renders `src/Router.tsx`.
- Landing route: `/` renders `src/App.tsx`.
- Main landing CSS: `src/styles.css`.
- Three.js ambient layer: `src/components/SpaceField.tsx`.
- Conditional public projects: `src/components/ShowcaseSection.tsx` using `/api/showcase`.
- Operational UI CSS: `src/system.css`; do not mix dashboard selectors into landing sections.
- Event dates, countdown target, external URLs, prizes, model names, agenda, and most narrative copy are maintained in `src/App.tsx`.
- Orbital runtime video: `public/assets/video-orbital.mp4`, requested as `/assets/video-orbital.mp4`.
- Orbital source copy: `Assets/video-orbital.mp4`.
- Image sources live under `Assets/`; browser-ready derivatives live under `public/assets/` and are regenerated with `npm run optimize:assets` according to `Assets/Generated/README.md`.
- Community logo sources are `Assets/TheBuildersLogo.png`, `Assets/logo-kriuu.png`, and `Assets/logo-clubia-uleam2.jpeg`; their optimized WebP derivatives use the `community-*.webp` names in `public/assets/`.

## Narrative order

1. Fixed header and scroll progress.
2. Orbital hero, countdown, Luma CTA, and agenda CTA.
3. Manta experience and event poster.
4. Global Build Week context.
5. Model family narrative.
6. Agenda.
7. Prizes.
8. Takeaways.
9. Conditional showcase for published projects.
10. Final Luma/community CTA.
11. Organization and coorganizing communities: The Builders first as principal organizer, followed by Kriuu and Club IA ULEAM.
12. Footer.

## Visual invariants

- Dark orbital palette with pink primary, blue accents, and warm sun highlights.
- OpenAI Sans Wordmark for display text; system font for long copy.
- Motion supports narrative and never hides information.
- Assets use `srcSet` at 1280, 2560, and 3840 where available.
- Mobile changes begin at 760px; broad tablet changes begin at 1100px.
- The desktop orbital video scrubs through the first 72% of its duration to avoid the excessively close final frames.
- At 760px and below, the hero omits the video source and uses the responsive static WebP background.
- `prefers-reduced-motion` removes the scroll-scrubbed orbital video and preserves a static, usable hero.

## Allowed system integration

The landing may expose one direct system entry, `Registra tu equipo`, and a public showcase backed by `/api/showcase`. The endpoint selects published submissions from the most recent event with showcase visibility enabled and must project only approved project fields.

Registration forms, authentication, team recovery, required-field rules, deadlines, transactional email, administration, scoring, and mentoring belong to their dedicated routes. `results_public` currently has no landing section or public endpoint; do not imply that rankings are public merely because the flag exists.
