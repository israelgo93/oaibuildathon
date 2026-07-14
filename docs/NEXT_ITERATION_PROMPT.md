# Prompt para la siguiente iteracion

Usa el siguiente texto como solicitud inicial en una conversacion nueva. Es autocontenido y describe funcionalidades **pendientes**; no asumas que ya existen.

---

Trabaja en el repositorio `israelgo93/oaibuildathon`, ubicado localmente en `C:\Users\USER\Documents\Buildathon Codex` y desplegado en `https://oaibuildathon.vercel.app`.

El objetivo es completar la siguiente iteracion de la plataforma operativa de OpenAI Build Week Manta: campos obligatorios accesibles, entrega final estricta, tecnologias seleccionables, correo de confirmacion, deadline por reto y visibilidad correcta para el jurado. No redisenes ni modifiques la landing cinematografica; conserva `/` y su vitrina. No expongas ni solicites credenciales en el chat, Git, logs o archivos versionados.

## Contexto obligatorio antes de editar

1. Lee completamente `AGENTS.md`, `README.md`, `PRODUCT.md` y `docs/IMPLEMENTATION_STATUS.md`.
2. Usa `.agents/skills/buildathon-operations/SKILL.md` y lee sus referencias.
3. Usa `.agents/skills/landing-maintenance/SKILL.md` solo para respetar el limite de no modificar la landing.
4. Para Supabase, consulta primero documentacion/changelog oficial actual y descubre los comandos del CLI con `--help`.
5. Inspecciona el estado Git. Preserva cambios ajenos y archivos sin seguimiento; no uses comandos destructivos.
6. Verifica mediante MCP que el proyecto objetivo sea `buildathon` con referencia `iexmlbslfnckrdtkwuir` antes de cualquier cambio remoto.

## Estado actual que debes corregir

- El registro ya valida en servidor los campos esenciales, pero no muestra asteriscos ni una leyenda accesible.
- La entrega usa texto libre para tecnologias y permite una lista vacia.
- Al enviar, demo y repositorio son alternativos; el nuevo contrato exige ambos.
- Nombre, descripcion corta, problema y solucion son obligatorios incluso para borradores; debe permitirse un borrador incompleto y aplicar la regla estricta al enviar.
- Existe `events.submissions_close_at`, pero `PATCH /api/team` no lo hace cumplir por hora.
- No existe deadline por reto.
- El jurado recibe entregas en borrador y puede calificarlas si la etapa esta abierta.
- `submitted_at` existe, pero no se muestra al jurado ni al administrador.
- No existe integracion de correo ni dependencia Resend.

## 1. Registro de equipos: obligatorios visibles y accesibles

Actualiza tanto el registro publico como el formulario manual de administracion.

Campos obligatorios:

- nombre del equipo;
- ciudad base;
- reto;
- por cada participante: nombre completo, correo, WhatsApp/telefono y ciudad.

Campos opcionales:

- organizacion o comunidad;
- rol o fortaleza del participante.

Requisitos:

- Mostrar un asterisco visible junto a cada etiqueta obligatoria y una leyenda `* Campo obligatorio` al inicio del formulario.
- El asterisco debe ser `aria-hidden`; la etiqueta o ayuda accesible debe comunicar que el campo es obligatorio.
- Mantener `required`, tipos HTML correctos y la validacion Zod equivalente.
- Marcar los campos opcionales con `(opcional)`.
- Tratar el grupo de retos como un `fieldset` obligatorio con `legend`; no depender solo de que el primer reto aparezca preseleccionado.
- Conservar un solo registro por equipo, de uno a tres participantes y exactamente un contacto principal.

## 2. Entrega del proyecto

Mantener dos acciones distintas:

- `Guardar borrador`: permite informacion incompleta.
- `Enviar al jurado`: aplica todas las reglas obligatorias en cliente y servidor.

Campos obligatorios para enviar:

- nombre del proyecto;
- descripcion corta, porque alimenta la vitrina publica;
- problema;
- solucion construida;
- al menos una tecnologia;
- URL valida de demo;
- URL valida de repositorio.

Campos opcionales:

- URL de presentacion;
- URL de video.

Aplica la misma regla final en Zod, `PATCH /api/team`, cambios administrativos a `submitted`, publicacion administrativa y cualquier funcion SQL relevante. No confies solo en atributos HTML. Los errores deben identificar el campo y no revelar detalles SQL.

Cuando un equipo guarde cambios despues de un envio, la entrega vuelve a borrador hasta que se envie nuevamente. Define `submitted_at` como la hora del **ultimo envio final exitoso**. Publicar desde administracion no debe reemplazar esa hora.

## 3. Selector de tecnologias

Reemplaza el input unico por checkboxes basados en una constante tipada y reutilizable. Incluye como minimo:

- OpenAI API
- Responses API
- Realtime API
- OpenAI Agents SDK
- Codex
- TypeScript
- JavaScript
- Python
- React
- Next.js
- Vite
- Node.js
- FastAPI
- Supabase
- PostgreSQL
- Vercel
- Docker
- Flutter
- React Native
- Tailwind CSS

Incluye la opcion `Otras`. Al seleccionarla, muestra un campo donde se escriban tecnologias adicionales separadas por comas.

Normalizacion obligatoria:

- recortar espacios;
- descartar entradas vacias;
- eliminar duplicados sin distinguir mayusculas/minusculas;
- conservar una representacion legible estable;
- maximo 20 tecnologias y 60 caracteres por tecnologia;
- al editar una entrega existente, mapear tecnologias conocidas a checkboxes y dejar las desconocidas en `Otras`.

`project_submissions.tech_stack` ya es `text[]`; evita una migracion innecesaria si el tipo actual cubre el contrato.

## 4. Deadline por reto

Crea una migracion nueva con Supabase CLI; no edites migraciones aplicadas.

- Agrega `challenges.submission_deadline_at timestamptz`.
- Para retos existentes, rellena desde `events.submissions_close_at`; si falta, usa `events.ends_at`.
- Exige fecha y hora al crear o editar un reto y actualiza tipos, Zod, API y panel administrativo.
- Conserva `events.submissions_open` como interruptor general.
- Define el corte efectivo como el menor entre `challenge.submission_deadline_at` y `events.submissions_close_at` cuando el cierre global exista.
- Rechaza en servidor guardados y envios cuando `now() >= deadline efectivo` o la etapa este cerrada.
- Guarda UTC y muestra `America/Guayaquil (UTC-5)` en registro, portal del equipo, administracion, correo y jurado.
- La UI debe quedar de solo lectura al vencer, pero la seguridad real debe estar en servidor.

## 5. Envio real al jurado

- El dashboard del jurado puede listar un equipo pendiente, pero no debe exponer el contenido de una entrega `draft`.
- Solo entregas `submitted` o `published` pueden calificarse.
- Refuerza esta regla en la Vercel Function y en la funcion SQL de evaluacion para evitar saltos de UI.
- Deshabilita la rubrica y muestra `Pendiente de entrega` cuando corresponda.
- Muestra a simple vista: estado, `Ultimo envio`, deadline, indicador `A tiempo` o `Fuera de plazo`, tecnologias y enlaces de demo, repositorio, presentacion y video.
- Muestra tambien `submitted_at` en administracion.
- Formatea fechas con `Intl.DateTimeFormat` y zona `America/Guayaquil`, conservando ISO 8601 en API y base de datos.

## 6. Correo de confirmacion con Resend

Recomendacion: usa la integracion nativa de Resend en Vercel Marketplace. Verifica primero si ya esta instalada. Si no lo esta, no inventes ni solicites la clave por chat: pide al usuario instalar/autorizar la integracion, pero continua implementando codigo y pruebas con mocks.

Variables esperadas al implementar:

- `RESEND_API_KEY`: secreto exclusivo del servidor, nunca `VITE_`.
- `RESEND_FROM`: remitente sobre un dominio verificado.
- `RESEND_REPLY_TO`: contacto real de organizacion.
- `APP_BASE_URL=https://oaibuildathon.vercel.app`: URL canonica; no construir enlaces con el header `Host`.
- Opcionales si se agregan webhooks/reintentos: `RESEND_WEBHOOK_SECRET` y `CRON_SECRET`.

Actualiza `.env.example` y README con marcadores vacios, nunca con valores reales. Separa Production de Preview para no enviar correos reales desde despliegues de prueba.

Implementa un outbox confiable:

- La misma transaccion que registra equipo, integrantes, reto y borrador crea una notificacion pendiente.
- El registro debe responder `201` y mostrar el codigo aunque Resend falle; nunca reviertas ni dupliques un equipo por un fallo de correo.
- Intenta el envio en servidor, preferentemente con `waitUntil`, y conserva un proceso de reintento o accion administrativa para pendientes.
- Guarda estado, intentos, proximo intento, ID del proveedor y codigo de error saneado.
- Usa una restriccion unica propia y la idempotency key `team-registration/v1/<teamId>`.
- Reintenta `429` y `5xx` respetando `Retry-After`; no repitas automaticamente errores permanentes `4xx`.
- No crees un endpoint publico que acepte destinatario, asunto o HTML arbitrarios.
- Nunca registres API keys, codigo de equipo, cuerpo completo ni correos sin enmascarar.

El correo se envia al contacto principal tanto para registro publico como manual y debe tener HTML y texto plano.

Asunto sugerido:

`Tu equipo ya esta registrado en OpenAI Build Week Manta`

Contenido minimo:

- felicitacion y nombre del equipo;
- evento y reto seleccionado;
- numero de integrantes;
- deadline exacto en `America/Guayaquil (UTC-5)`;
- enlace fijo HTTPS a `${APP_BASE_URL}/equipo`;
- codigo de equipo separado del enlace;
- indicacion de acceder con el correo del contacto principal;
- advertencia de guardar y no compartir el codigo;
- recordatorio de completar y enviar el proyecto antes del cierre;
- direccion de soporte o reply-to.

No incluyas el token de sesion ni el codigo en query string, fragmento, enlace magico, logs o analitica.

Para produccion, verifica un dominio o subdominio propio con SPF y DKIM; DMARC es recomendado. `onboarding@resend.dev` es solo para pruebas controladas.

Fuentes oficiales que debes volver a comprobar al implementar:

- `https://vercel.com/marketplace/resend`
- `https://resend.com/docs/dashboard/domains/introduction`
- `https://resend.com/docs/dashboard/emails/idempotency-keys`
- `https://resend.com/docs/knowledge-base/how-to-handle-api-keys`
- `https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package#waituntil`

## 7. Pruebas y criterios de aceptacion

Agrega pruebas para:

- registro de 1, 2 y 3 integrantes y rechazo de un cuarto;
- indicadores de obligatorio y campos opcionales;
- borrador incompleto permitido;
- envio rechazado por cada campo final faltante;
- demo ausente y repositorio ausente como errores independientes;
- tecnologias vacias, normalizacion, duplicados y limite;
- comportamiento antes, exactamente en y despues del deadline;
- cierre global y deadline por reto;
- jurado sin acceso/calificacion de borradores;
- formato visible de `submitted_at` y deadline;
- correo exitoso, fallo sin rollback, reintento e idempotencia con Resend mockeado;
- ausencia de `RESEND_API_KEY` en el bundle del cliente.

## 8. Reglas tecnicas y cierre

- NUNCA uses `any` ni `as any`.
- Toda consulta Supabase con datos debe usar tipos explicitos `Tables<>`, `TablesInsert<>` o `TablesUpdate<>`.
- Todo switch sobre unions/enums debe comprobar `never` en `default`.
- Usa Zod para entradas publicas y errores seguros.
- Revisa RLS, grants, funciones `security definer` e indices; ejecuta asesores de Supabase despues de DDL.
- Actualiza `src/types/database.ts` y reconcilia cualquier tipo generado.
- Actualiza README, AGENTS, PRODUCT, `docs/IMPLEMENTATION_STATUS.md`, `.env.example` y las referencias de las skills. Mueve cada capacidad de pendiente a implementada solo despues de probarla.
- No modifiques `src/App.tsx`, `src/styles.css` ni la composicion de la landing salvo que el usuario lo pida expresamente.
- Antes de commit ejecuta `npm run typecheck`, `npm test`, `npm audit`, `npm run build`; corrige errores/warnings relevantes y ejecuta `npm run build` nuevamente.
- Revisa diff/status y secretos. El commit debe estar en espanol, sin caracteres especiales, e incluir solo cambios de esta tarea.
- Si el usuario mantiene la autorizacion previa para publicar, sube el commit a GitHub y verifica produccion; de lo contrario, entrega los cambios listos sin asumir nuevas credenciales o permisos externos.

Entrega al final un resumen de migraciones, UX, seguridad, pruebas, configuracion manual pendiente de Resend y URLs verificadas.

---
