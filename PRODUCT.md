# Product

## Producto

OpenAI Build Week Manta combina una landing publica con una plataforma operativa para una Buildathon presencial de una jornada.

## Estado de producto

La fuente de verdad sobre lo disponible es [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md). El alcance de [`docs/NEXT_ITERATION_PROMPT.md`](docs/NEXT_ITERATION_PROMPT.md) esta implementado y verificado en produccion: indicadores de obligatorio, borrador flexible, entrega final estricta, tecnologias seleccionables, deadline por reto, acceso correcto del jurado y correo transaccional mediante Resend. Las migraciones, los tipos remotos, la aplicacion desplegada y las variables de correo estan reconciliados.

## Usuarios

- Builders: desarrolladores, estudiantes, disenadores, fundadores, emprendedores y creadores de Ecuador.
- Organizacion: configura el evento y opera registro, retos, staff, equipos, entregas y resultados.
- Jurado: revisa proyectos asignados y completa una rubrica dinamica.
- Mentores: acompanan equipos asignados durante el sprint de construccion.
- Visitantes: conocen el evento y exploran proyectos publicados.

## Proposito

Promocionar la OpenAI Build Week Community Buildathon de Manta y llevar a cada equipo desde el registro hasta una demo funcional. El sistema debe reducir coordinacion manual y mantener en un solo flujo los retos, equipos, participantes, mentoria, entregas, evaluacion y vitrina.

No es un proceso extenso de ideacion. La experiencia prioriza construir, probar, iterar, documentar y demostrar dentro del tiempo disponible.

## Principios funcionales

- Un registro por equipo: una sola persona registra entre uno y tres participantes.
- Construir es el centro: retos y rubrica valoran producto funcional, uso de OpenAI/Codex y ejecucion tecnica.
- Un dato, un origen: equipos, entregas y evaluaciones viven en Supabase; no se duplican en formularios aislados.
- Privacidad por defecto: participantes no son publicos; solo proyectos aprobados aparecen en la landing.
- Operacion configurable: fechas, etapas, limites, retos, criterios, jurados, mentores y asignaciones se administran sin cambiar codigo.
- Separacion visual: la landing conserva su narrativa; los paneles optimizan claridad, velocidad y control.
- Borrador sin friccion, entrega rigurosa: un equipo puede avanzar por partes, pero el envio final debe cumplir todos los campos y enlaces definidos.
- Tiempo explicito: cada reto debe comunicar y hacer cumplir su fecha y hora limite desde el servidor.
- Jurado con contexto: estado, ultima hora de envio, deadline, tecnologias y enlaces deben poder leerse a simple vista antes de calificar.
- Recuperacion confiable: al registrar, el contacto principal conserva el codigo y recibe confirmacion sin que un fallo del proveedor de correo invalide el equipo.

## Personalidad de marca

Cosmica, ambiciosa y precisa. La voz debe sentirse energetica, inclusiva y orientada a la accion, con confianza tecnologica y orgullo por el hito para la comunidad de builders de Ecuador.

## Anti-referencias

Evitar la estetica gamer de neon saturado, dashboards SaaS genericos, plantillas corporativas sin personalidad, exceso de tarjetas intercambiables y efectos espaciales que sacrifiquen legibilidad o rendimiento. No imitar literalmente la pagina global de OpenAI ni el layout de Luma.

## Principios de diseno

- Convertir informacion en impulso: cada bloque acerca a construir, registrar o presentar.
- Conectar Manta con el mundo: la escala global refuerza el protagonismo local.
- Hacer visible el proceso: explicar que se aprende construyendo y que la meta es una demo funcional.
- Movimiento con proposito: scroll, transiciones y profundidad apoyan la narrativa de lanzamiento.
- Claridad bajo espectaculo: fechas, agenda, premios y llamadas a la accion permanecen inequivocas.
- Paneles accionables: estado, siguiente accion y permisos deben ser evidentes para cada rol.

## Accesibilidad e inclusion

Objetivo WCAG 2.2 AA, navegacion por teclado, contraste suficiente, estructura semantica, foco visible y contenido comprensible en espanol. Todas las animaciones respetan `prefers-reduced-motion`; el contenido funciona sin movimiento avanzado ni WebGL.

Los formularios deben marcar visualmente los campos obligatorios con `*`, explicar su significado y comunicar la obligatoriedad a tecnologias de asistencia sin depender solo del color. Los campos opcionales deben indicarse de forma explicita, y los errores deben identificar el campo y la accion necesaria.
