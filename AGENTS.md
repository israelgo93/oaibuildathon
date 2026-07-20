# AGENTS.md

## Mision del repositorio

Este repositorio combina dos superficies que deben evolucionar sin confundirse:

1. La landing cinematografica de OpenAI Build Week Manta en `/`.
2. La plataforma operativa de la Buildathon para registro, equipos, retos, entregas, mentoria, jurado, calificacion y administracion.

La Buildathon esta orientada a construir y demostrar un producto funcional. Las decisiones de producto, rubrica y contenido deben priorizar ejecucion, demo, uso de OpenAI/Codex y aprendizaje durante la jornada.

## Contexto antes de trabajar

- Para cambios en la landing, usa `.agents/skills/landing-maintenance/SKILL.md`.
- Para registro, Supabase, Vercel Functions o paneles, usa `.agents/skills/buildathon-operations/SKILL.md`.
- Lee `PRODUCT.md` para marca y accesibilidad.
- Lee `README.md` para instalacion, variables y despliegue.
- Lee `docs/IMPLEMENTATION_STATUS.md` para distinguir lo desplegado de lo pendiente.
- Si la tarea corresponde a obligatorios, entrega final, tecnologias, deadlines, jurado o correo, toma `docs/NEXT_ITERATION_PROMPT.md` como alcance aprobado y vuelve a verificar el codigo antes de asumir su estado.

## Arquitectura

- `src/App.tsx` y `src/styles.css`: landing; no redisenar ni mover contenido sin una solicitud explicita.
- `src/Router.tsx`: rutas de React.
- `src/pages/`: registro y paneles de equipo, administracion, jurado y mentor.
- `src/system.css`: interfaz operativa; no mezclar selectores con la landing.
- `api/`: Vercel Functions, validacion y autorizacion de cada operacion.
- `server/`: utilidades exclusivas de servidor.
- `supabase/migrations/`: esquema, funciones, RLS y datos iniciales.
- `src/types/database.ts`: tipos de base de datos usados por cliente y servidor.
- `server/registration-email.ts`: plantilla, idempotencia, clasificacion de reintentos y procesamiento del outbox de registro.
- `server/submission-analysis-*.ts`: evidencia externa acotada, agentes especialistas, sintesis, persistencia y proyeccion publica del analisis IA de entregas.
- `submission_ai_analyses`: outbox durable por revision final; usa estados, intentos, cooldown, cuota automatica y leases con token para recuperar trabajo sin aceptar escrituras tardias.

## Seguridad obligatoria

- El navegador solo puede usar `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
- `SUPABASE_SECRET_KEY` y `TEAM_SESSION_SECRET` son exclusivos de Vercel Functions. Nunca usar el prefijo `VITE_` en secretos.
- Cualquier secreto de correo, incluido `RESEND_API_KEY`, tambien es exclusivo de servidor y nunca usa el prefijo `VITE_`.
- `OPENAI_API_KEY`, `GITHUB_TOKEN` y `CRON_SECRET` son secretos exclusivos de servidor. `OPENAI_ANALYSIS_MODEL` es configuracion de servidor y tampoco usa el prefijo `VITE_`.
- Nunca versionar `.env`, `.env.local`, tokens, claves, contrasenas ni respuestas que las contengan.
- Mantener RLS habilitado y revisar grants de cada tabla o funcion nueva.
- Validar entradas publicas con Zod. No devolver errores internos o detalles SQL al publico.
- Los tokens de equipos se guardan como HMAC; la cookie debe ser HTTP-only, SameSite y Secure en produccion.
- El codigo de recuperacion nunca se incluye en query strings, logs, analitica ni URLs de correo. Un fallo de correo no puede revertir ni duplicar un registro valido.
- No crear endpoints publicos capaces de enviar destinatarios, asuntos o HTML arbitrarios.
- Toda mutacion administrativa debe verificar el rol en servidor y dejar auditoria cuando corresponda.
- El analisis IA trata HTML, README, nombres de archivos y codigo externo como datos no confiables. La recoleccion valida destinos y limites antes del modelo, nunca ejecuta codigo del equipo y no entrega herramientas de red a los agentes.
- Un informe IA solo puede exponerse a administracion o al jurado asignado. Nunca escribe `evaluations` ni `evaluation_scores`, y su sugerencia no es una calificacion ni un veredicto.

## TypeScript y JavaScript

- NUNCA usar `any` ni `as any`.
- Usar las interfaces y tipos existentes; agregar propiedades al tipo correcto cuando falten.
- Usar `Tables<>`, `TablesInsert<>` y `TablesUpdate<>` desde `@/types/database`.
- Toda consulta Supabase que retorne `data` debe asignar un tipo explicito.
- Para listas:

```ts
const { data, error } = await supabase.from('teams').select('*')
const teams: Tables<'teams'>[] = data ?? []
```

- Para `.single()` o `.maybeSingle()`:

```ts
const { data: teamRaw } = await supabase.from('teams').select('*').eq('id', id).single()
if (!teamRaw) throw new Error('No encontrado')
const team = teamRaw as Tables<'teams'>
```

- Para joins, declarar el tipo completo del resultado. No ignorar inferencias `never`.
- Todo `switch` sobre una union discriminada o enum debe tener un `default` con comprobacion `never`.

## Cambios de base de datos

1. Consultar primero las novedades actuales de Supabase si la decision depende de comportamiento reciente.
2. Descubrir los comandos del CLI con `--help`.
3. Crear migraciones con `npx supabase@2.109.1 migration new nombre_descriptivo`.
4. No inventar nombres con timestamp ni editar una migracion ya aplicada en produccion.
5. Actualizar los tipos y documentar el cambio.
6. Reconciliar `src/types/database.generated.ts` con `src/types/database.ts`; el archivo generado no reemplaza automaticamente al importado por la aplicacion.
7. Validar localmente con Supabase CLI cuando Docker este disponible y ejecutar asesores despues de enlazar un proyecto.
8. Confirmar que el historial local coincide con las migraciones remotas antes y despues de aplicar DDL.

## Invariantes de dominio

- Un equipo tiene entre 1 y 3 participantes; tres es el limite absoluto.
- Una sola persona registra al equipo completo.
- Cada equipo elige exactamente un reto activo.
- Cada equipo tiene una entrega; solo administracion puede publicarla en la landing.
- Los jurados califican unicamente equipos asignados y durante la etapa abierta. El objetivo aprobado es que solo puedan calificar entregas finales `submitted` o `published`; consulta el estado actual antes de modificar este flujo.
- Cada nueva revision final en estado `submitted` encola un analisis IA no vinculante. Un envio identico solo es idempotente durante 30 segundos; despues puede reflejar cambios externos aunque conserve las URLs. Publicar sin cambiar `submitted_at` no crea otro; volver a borrador o reenviar invalida el informe anterior. Cinco revisiones son automaticas y administracion puede autorizar manualmente las siguientes.
- La rubrica es dinamica y una evaluacion final incluye todos los criterios activos.
- Mentores y jurados se crean como usuarios Auth con perfiles de rol explicito.

## Estado actual que no debe sobreestimarse

- Las superficies publicas y de jurado/mentor seleccionan el evento mas reciente por `starts_at`. El panel administrativo desplegado incluye selector de evento, creacion de eventos (accion `create_event` con copia opcional de rubrica) y asignacion aleatoria de jurados/mentores por evento. La vitrina publica agrega todos los eventos con vitrina habilitada agrupados por edicion.
- Supabase produccion contiene dos eventos: Manta (15 de julio, cerrado, vitrina y resultados activos) y Portoviejo (`openai-build-week-portoviejo-2026`, 21 de julio, creado con la rubrica copiada y todos los interruptores apagados; hay que crear sus retos y abrir el registro desde el panel antes del evento).
- El deployment vigente verificado es `dpl_FbbFjdiZXdFB2G8gG6Dve3Q8DnRc` (`READY`, 20 de julio) en `https://oaibuildathon.vercel.app`; `public-config` sirve Portoviejo y `showcase` conserva los tres proyectos publicados de Manta.
- Supabase produccion aplica doce migraciones locales, incluida `20260715051406_add_submission_ai_analysis.sql`; el historial remoto esta reconciliado.
- La aplicacion de produccion expone ejes tematicos y temas sugeridos en la configuracion publica, registro, portal del equipo y mentoria. Registro y portal fueron verificados con navegador; el formulario administrativo desplegado y su proteccion se verificaron, pero esta comprobacion no repitio un guardado autenticado por falta de una sesion disponible.
- Produccion aplica el menor deadline global/por reto, oculta borradores al jurado y muestra `submitted_at`.
- Resend, el outbox, el dominio remitente y las variables de Production estan desplegados y verificados.
- Produccion incorpora correo de acceso, recuperacion de contrasena y difusion; nunca ejecutar acciones masivas como parte de una prueba.
- `results_public` no tiene endpoint ni vista publica consumidora.
- Produccion incorpora analisis IA con OpenAI Agents SDK, panel lateral para administracion/jurado y recuperacion durable. `OPENAI_API_KEY` y `CRON_SECRET` estan configuradas como Sensitive; el worker autorizado proceso una entrega que termino `completed` con `gpt-5.5`, cuatro especialistas y resultados estructurados persistidos. No se repitio visualmente el panel desplegado por falta de una sesion autenticada disponible.

Estas brechas estan documentadas en `docs/IMPLEMENTATION_STATUS.md`. No marques una capacidad como implementada hasta completar migraciones, tipos, servidor, UI, pruebas y verificacion desplegada.

## Verificacion y commits

Antes de cualquier commit solicitado:

1. Ejecutar `npm run typecheck`, `npm test`, `npm audit` y `npm run build`.
2. Corregir todos los errores y warnings relevantes.
3. Ejecutar nuevamente `npm run build` y confirmar que termina limpio.
4. Revisar `git diff`, `git status` y comprobar que no se incluyan credenciales.
5. Escribir el mensaje del commit en espanol y sin caracteres especiales.

PowerShell no soporta HEREDOC; usar comandos y parches compatibles. No usar comandos destructivos sobre cambios de otras personas.

## Documentacion y coordinacion

Actualizar `README.md`, `AGENTS.md`, `PRODUCT.md`, `docs/IMPLEMENTATION_STATUS.md` y las skills cuando cambien arquitectura, variables, flujos o reglas. Mantener `docs/NEXT_ITERATION_PROMPT.md` alineado mientras su alcance siga pendiente; al implementarlo, convertir sus puntos en estado verificado o archivarlos claramente.

Publicar un resumen en Slack o actualizar Linear solo cuando exista un workspace/proyecto identificado y la tarea autorice esa coordinacion externa.
