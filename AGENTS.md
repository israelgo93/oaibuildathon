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

## Seguridad obligatoria

- El navegador solo puede usar `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
- `SUPABASE_SECRET_KEY` y `TEAM_SESSION_SECRET` son exclusivos de Vercel Functions. Nunca usar el prefijo `VITE_` en secretos.
- Cualquier secreto de correo, incluido `RESEND_API_KEY`, tambien es exclusivo de servidor y nunca usa el prefijo `VITE_`.
- Nunca versionar `.env`, `.env.local`, tokens, claves, contrasenas ni respuestas que las contengan.
- Mantener RLS habilitado y revisar grants de cada tabla o funcion nueva.
- Validar entradas publicas con Zod. No devolver errores internos o detalles SQL al publico.
- Los tokens de equipos se guardan como HMAC; la cookie debe ser HTTP-only, SameSite y Secure en produccion.
- El codigo de recuperacion nunca se incluye en query strings, logs, analitica ni URLs de correo. Un fallo de correo no puede revertir ni duplicar un registro valido.
- No crear endpoints publicos capaces de enviar destinatarios, asuntos o HTML arbitrarios.
- Toda mutacion administrativa debe verificar el rol en servidor y dejar auditoria cuando corresponda.

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
- La rubrica es dinamica y una evaluacion final incluye todos los criterios activos.
- Mentores y jurados se crean como usuarios Auth con perfiles de rol explicito.

## Estado actual que no debe sobreestimarse

- Las superficies operativas seleccionan el evento mas reciente; el panel no crea eventos.
- Supabase produccion ya aplica `20260714131805_complete_submission_deadlines_and_email_outbox.sql`, `20260714131931_index_registration_email_outbox_team_event.sql` y `20260714132323_fix_assignment_role_trigger.sql`; la aplicacion conserva el contrato anterior hasta desplegar y verificar el codigo.
- El arbol local agrega `20260714205820_add_challenge_themes.sql` para ejes tematicos y temas sugeridos; todavia no esta verificada en la aplicacion de produccion.
- El arbol local ya aplica el menor deadline global/por reto, oculta borradores al jurado y muestra `submitted_at`; no describir la experiencia completa como produccion hasta verificar el despliegue.
- Resend, el outbox, el dominio remitente y las variables de Production estan desplegados y verificados.
- `results_public` no tiene endpoint ni vista publica consumidora.

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
