# Serie orbital generada

Imágenes creadas con la herramienta integrada de Imagegen para ampliar el universo visual de OpenAI Build Week Manta. Ninguna contiene texto, logos ni marcas de agua; el contenido tipográfico se compone en la interfaz.

## Masters 4K

- `4K/global-orbit-4k.png` — órbita cislunar oblicua, Sudamérica iluminada, Luna distante y espacio negativo a la izquierda. Se utiliza en la sección de Build Week global.
- `4K/solar-limb-4k.png` — aproximación tangencial al limbo solar, plasma y arcos coronales con espacio negativo. Se utiliza en la sección de premios.
- `4K/lunar-horizon-4k.png` — vuelo bajo sobre la superficie lunar con la Tierra distante. Se utiliza en el CTA final.

Cada master mide 3840 × 2160. Las salidas originales de Imagegen se conservan en `Sources/`; `npm run optimize:assets` reconstruye los masters y genera WebP de 1280, 2560 y 3840 px en `public/assets/`.

## Prompts finales

### Órbita global

Arte de campaña fotorrealista inspirado en fotografía orbital: Tierra en el sector derecho con Sudamérica visible, Luna distante, amanecer azul y ámbar, perspectiva cislunar oblicua y 55 % de espacio negativo oscuro a la izquierda. Sin texto, logos, naves ni interfaces.

### Limbo solar

Astrofotografía solar de aproximación extrema: superficie de plasma detallada entrando desde la esquina inferior derecha, arcos coronales controlados y 60 % de espacio negro a la izquierda. Paleta ámbar, oro y naranja quemado. Sin planetas, texto, logos ni elementos de ciencia ficción.

### Horizonte lunar

Vista cinematográfica a baja altura sobre cráteres lunares, horizonte diagonal, Tierra pequeña y distante en la esquina superior derecha, rim light azul y espacio negativo negro a la izquierda. Sin astronautas, banderas, estructuras, texto ni interfaces.
