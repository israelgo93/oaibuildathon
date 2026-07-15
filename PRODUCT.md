# Product

## Producto

OpenAI Build Week Manta combina una landing publica con una plataforma operativa para una Buildathon presencial de una jornada.

## Estado de producto

La fuente de verdad sobre lo disponible es [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md). El alcance de [`docs/NEXT_ITERATION_PROMPT.md`](docs/NEXT_ITERATION_PROMPT.md) esta implementado y verificado en produccion: indicadores de obligatorio, borrador flexible, entrega final estricta, tecnologias seleccionables, deadline por reto, acceso correcto del jurado y correo transaccional mediante Resend. Las migraciones, los tipos remotos, la aplicacion desplegada y las variables de correo estan reconciliados.

Produccion incluye ejes tematicos y ejemplos concretos para los tres retos. La migracion, los contratos tipados, la API publica, el registro y el portal del equipo fueron verificados contra el despliegue canonico.

Produccion extiende la operacion con alta y re-notificacion de staff, cambio obligatorio, recuperacion de contrasena y difusion a participantes. El esquema, la API y las vistas estan desplegados y verificados sin alterar cuentas existentes ni ejecutar notificaciones reales durante la comprobacion.

Produccion incorpora un analisis IA de apoyo para entregas finales: cuatro especialistas revisan reto/propuesta, demo, codigo/arquitectura e integracion de OpenAI, y un sintetizador presenta un informe y una ponderacion sugerida conforme a la rubrica. Es una ayuda no vinculante, nunca un veredicto ni una calificacion automatica. La migracion, configuracion server-only, worker y persistencia estructurada estan verificados; el ultimo despliegue no se recorrio visualmente con una sesion autenticada de administrador o jurado.

## Diseno de retos

Cada reto conserva un enfoque breve y requisitos verificables, pero orienta la ideacion mediante dos listas administrables:

- **Ejes tematicos:** dominios amplios que permiten participar a estudiantes, profesionales, emprendedores, empresas y personas no tecnicas.
- **Temas sugeridos:** problemas o tipos de herramienta concretos que inspiran sin convertir el reto en una solucion unica.

Para herramientas de builders, la seleccion reconoce las superficies actuales de Codex: [skills como flujos reutilizables](https://learn.chatgpt.com/docs/build-skills.md) y [plugins como paquetes distribuibles de skills, conectores, configuracion MCP, hooks y recursos](https://learn.chatgpt.com/docs/build-plugins.md).

Para impacto local, los ejes priorizan economia costera, agro y agua, turismo, educacion e inclusion digital, servicios, empleo, resiliencia y ambiente. La curacion se apoya en el [PDOT Manta 2024-2035](https://manta.gob.ec/wp-content/uploads/2024/11/01-PDOT-Diagnostico-2024-2035.pdf), los [indicadores TIC del INEC](https://www.ecuadorencifras.gob.ec/tecnologias-de-la-informacion-y-comunicacion-tic/), las [estadisticas agropecuarias de Manabi](https://sipa.agricultura.gob.ec/index.php/situacionales-provinciales/estadisticas-manabi) y el [escenario nacional de respuesta ante sismo y tsunami](https://www.gestionderiesgos.gob.ec/wp-content/uploads/downloads/2018/05/Plan-de-Respuesta-Ecuador.pdf).

## Usuarios

- Builders: desarrolladores, estudiantes, disenadores, fundadores, emprendedores y creadores de Ecuador.
- Organizacion: configura el evento y opera registro, retos, staff, equipos, entregas y resultados.
- Jurado: revisa proyectos asignados, contrasta un analisis IA no vinculante cuando este disponible y completa una rubrica dinamica con criterio propio.
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
- IA como copiloto, no como arbitro: el informe debe separar evidencia, inferencias y limitaciones; su ponderacion permanece secundaria, nunca precarga la rubrica y no modifica evaluaciones oficiales.
- Evidencia segura: demo y repositorio se inspeccionan con destinos y limites controlados, sin ejecutar codigo; contenido externo se trata como dato no confiable y los agentes no navegan por su cuenta.
- Acceso minimo: solo administracion y el jurado asignado pueden consultar el analisis de una entrega.
- Recuperacion confiable: al registrar, el contacto principal conserva el codigo y recibe confirmacion sin que un fallo del proveedor de correo invalide el equipo.
- Acceso interno recuperable: cada cuenta recibe una credencial temporal, debe cambiarla y puede solicitar un enlace neutral sin revelar si el correo existe.
- Difusion deliberada: cada campana exige vista previa y confirmacion, usa destinatarios deduplicados y solo admite texto y enlaces internos predefinidos.
- Preservacion de cuentas: notificar o desplegar nunca elimina usuarios; la accion masiva solo puede rotar claves de mentores y jurados activos.

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

El informe IA se presenta como panel lateral con semantica de dialogo, foco administrado, cierre por teclado y disposicion adaptable a pantallas pequenas. El aviso de que es una ayuda no vinculante debe permanecer visible; la ponderacion sugerida se mantiene en un detalle secundario para no competir con la evaluacion humana.
