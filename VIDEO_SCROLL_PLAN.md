# Video orbital sincronizado con scroll

## Estado actual

El hero usa `public/assets/video-orbital.mp4`, servido como `/assets/video-orbital.mp4`, como plano orbital continuo. La copia fuente editable se conserva en `Assets/video-orbital.mp4`. El video no se reproduce automáticamente: la posición del scroll controla su tiempo para que avanzar y retroceder por la página mueva la cámara en ambos sentidos. Con `prefers-reduced-motion`, el video no se monta y se conserva la imagen estática.

## Prompt final para generación

> Create a single uninterrupted 10-second cinematic orbital shot for the OpenAI Build Week Manta landing page. 4K UHD, 3840×2160, 24 fps, photorealistic physically plausible NASA-style orbital cinematography, deep blacks, restrained blue-white starlight and a subtle warm sunrise accent; no cyberpunk neon. Start in deep space with a softly lit crescent Moon occupying the far left edge, an Ecuador-facing Earth horizon across the bottom 22% of frame, a small distant sun glow in the upper right, and generous clean negative space through the central 60% for a large countdown overlay. The camera makes one slow continuous forward orbital approach: Earth’s curved horizon rises smoothly from 22% to about 58% of frame, South America becomes subtly readable without labels, the Moon drifts slowly farther left and out of frame, and a controlled sunrise grazes the atmosphere to create a natural curved wipe. End with the dark Earth limb and thin atmospheric glow filling the lower half, ready to transition into the next section. No cuts, no camera shake, no speed ramps, no zoom pulses, no scene changes, no text, no letters, no numbers, no logos, no UI, no HUD, no spacecraft, no people, no extra planets, no meteor streaks, no square particles. Stars must be tiny soft circular points with stable positions; preserve temporal coherence, stable geography, stable exposure and crisp frames with minimal motion blur so every frame works when scrubbed forward or backward. Hold the opening and closing composition for 8 frames. Keep all essential subjects inside a center-safe crop that can also produce a 9:16 mobile version.

## Entregables recomendados

- Master 4K, 3840 × 2160, 24 fps, sin audio.
- MP4 H.264 de 2560 × 1440 para escritorio, idealmente menor a 10 MB.
- Versión 1080 × 1920 o imagen estática dedicada para móvil.
- Keyframe cada 4–6 fotogramas y `faststart` para permitir búsquedas fluidas.
- Primer fotograma idéntico al póster estático para evitar destellos durante la carga.

## Integración implementada

1. Una sección de `185svh` contiene un escenario sticky de `100svh` para dar recorrido suficiente al plano de 10 segundos.
2. El progreso crudo de `useScroll` calcula `targetTime = progress × duration`; el spring queda reservado para la salida del overlay HTML.
3. El `<video muted playsInline preload="auto" poster="…">` espera metadata y comprueba el rango `seekable` antes de cada salto.
4. Los cambios de `currentTime` se agrupan en un único `requestAnimationFrame`, se omiten diferencias menores a `1 / 24` segundos y nunca se busca el último fotograma exacto.
5. Solo se permite un seek activo. El evento `seeked` procesa el destino más reciente acumulado para evitar saltos residuales.
6. Un `IntersectionObserver` detiene el planificador fuera de la escena y el cleanup cancela RAF, listeners, observer y suscripción.
7. El campo WebGL fue retirado del hero; permanece únicamente en la escena final y se carga de forma diferida.
8. El countdown y los dos CTA permanecen como HTML accesible, centrados y utilizables durante toda la secuencia.

El archivo actual mide 1280 × 720 y 2.7 MB. Funciona bien para esta integración, pero una futura sustitución 4K debería mantener keyframes cada 4–6 fotogramas y `faststart` para mejorar la nitidez y la respuesta de los seeks en pantallas grandes.
