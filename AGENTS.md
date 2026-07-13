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

## Arquitectura

- `src/App.tsx` y `src/styles.css`: landing; no redisenar ni mover contenido sin una solicitud explicita.
- `src/Router.tsx`: rutas de React.
- `src/pages/`: registro y paneles de equipo, administracion, jurado y mentor.
- `src/system.css`: interfaz operativa; no mezclar selectores con la landing.
- `api/`: Vercel Functions, validacion y autorizacion de cada operacion.
- `server/`: utilidades exclusivas de servidor.
- `supabase/migrations/`: esquema, funciones, RLS y datos iniciales.
- `src/types/database.ts`: tipos de base de datos usados por cliente y servidor.

## Seguridad obligatoria

- El navegador solo puede usar `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
- `SUPABASE_SECRET_KEY` y `TEAM_SESSION_SECRET` son exclusivos de Vercel Functions. Nunca usar el prefijo `VITE_` en secretos.
- Nunca versionar `.env`, `.env.local`, tokens, claves, contrasenas ni respuestas que las contengan.
- Mantener RLS habilitado y revisar grants de cada tabla o funcion nueva.
- Validar entradas publicas con Zod. No devolver errores internos o detalles SQL al publico.
- Los tokens de equipos se guardan como HMAC; la cookie debe ser HTTP-only, SameSite y Secure en produccion.
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
6. Validar localmente con Supabase CLI cuando Docker este disponible y ejecutar asesores despues de enlazar un proyecto.

## Invariantes de dominio

- Un equipo tiene entre 1 y 3 participantes; tres es el limite absoluto.
- Una sola persona registra al equipo completo.
- Cada equipo elige exactamente un reto activo.
- Cada equipo tiene una entrega; solo administracion puede publicarla en la landing.
- Los jurados califican unicamente equipos asignados y durante la etapa abierta.
- La rubrica es dinamica y una evaluacion final incluye todos los criterios activos.
- Mentores y jurados se crean como usuarios Auth con perfiles de rol explicito.

## Verificacion y commits

Antes de cualquier commit solicitado:

1. Ejecutar `npm run typecheck`, `npm test`, `npm audit` y `npm run build`.
2. Corregir todos los errores y warnings relevantes.
3. Ejecutar nuevamente `npm run build` y confirmar que termina limpio.
4. Revisar `git diff`, `git status` y comprobar que no se incluyan credenciales.
5. Escribir el mensaje del commit en espanol y sin caracteres especiales.

PowerShell no soporta HEREDOC; usar comandos y parches compatibles. No usar comandos destructivos sobre cambios de otras personas.

## Documentacion y coordinacion

Actualizar `README.md`, `AGENTS.md` y las skills cuando cambien arquitectura, variables, flujos o reglas. Publicar un resumen en Slack o actualizar Linear solo cuando exista un workspace/proyecto identificado y la tarea autorice esa coordinacion externa.
