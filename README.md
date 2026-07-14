# OpenAI Build Week Manta

Landing y plataforma operativa para la Community Buildathon de OpenAI Build Week en Manta, Ecuador. El sistema acompana el evento: registro global de equipos, seleccion de retos, entrega de demos, mentoria, jurado, rubrica configurable, ranking privado y vitrina publica.

La experiencia conserva la landing cinematografica existente. La integracion visible se limita al boton **Registra tu equipo** y a una seccion de proyectos que solo aparece cuando administracion publica entregas verificadas.

## Estado verificado

- Produccion: `https://oaibuildathon.vercel.app`.
- Repositorio: `israelgo93/oaibuildathon`.
- Supabase: proyecto `buildathon`, referencia publica `iexmlbslfnckrdtkwuir`.
- Estado real, endpoints, migraciones y brechas: [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md).
- Alcance autocontenido para la siguiente iteracion: [`docs/NEXT_ITERATION_PROMPT.md`](docs/NEXT_ITERATION_PROMPT.md).

La siguiente iteracion esta **implementada, desplegada y verificada en produccion**: incluye obligatorios visibles, borrador incompleto, entrega final estricta, selector de tecnologias, deadline por reto, restricciones para jurado y confirmacion transaccional con Resend. Las siete migraciones, los tipos remotos y las variables de Production estan reconciliados. Un registro real confirmo el envio del correo mediante el outbox.

## Ejes tematicos desplegados

Produccion incorpora ejes tematicos y listas de ideas para cada reto. El panel administrativo puede editar ambas listas; el registro, el portal del equipo y mentoria las presentan como contexto de construccion. La migracion `20260714205820_add_challenge_themes.sql` precarga contenido para agentes y automatizacion, herramientas para builders e impacto local.

La migracion, los tipos, la API publica, el registro y el portal del equipo estan verificados en produccion. Una prueba temporal de recuperacion mostro los 6 ejes y 8 ideas del reto de agentes y elimino todos sus datos al terminar. La ruta administrativa mantiene autenticacion obligatoria y el bundle desplegado contiene ambos campos y sus payloads; esta verificacion no repitio un guardado autenticado porque no habia una sesion administrativa disponible.

## Capacidades

- Registro unico por equipo para 1, 2 o 3 participantes.
- Un reto activo por equipo y control opcional de cupos.
- Ejes tematicos y temas sugeridos editables por reto y visibles durante seleccion, construccion y mentoria.
- Sesion de equipo mediante cookie HTTP-only y codigo de recuperacion.
- Portal para guardar el proyecto como borrador o enviarlo al jurado.
- Vitrina publica de proyectos aprobados en la landing.
- Supabase Auth para administradores, jurados y mentores.
- Panel administrativo para el evento existente mas reciente, etapas, fechas globales, limites, retos, rubrica, equipos, participantes, staff, asignaciones, proyectos y ranking privado.
- Panel de jurado con formulario dinamico de calificacion.
- Panel de mentor con equipos, integrantes, reto, avance y enlaces.
- Rubrica inicial de 100 puntos orientada a construccion.
- Auditoria de mutaciones de gestion y staff, y validacion Zod en las Functions.

## Limites actuales de produccion

- El panel modifica el evento mas reciente, pero no crea eventos.
- Staff se crea y lista desde administracion, pero la UI no desactiva, elimina ni restablece usuarios.
- El campo `results_public` existe, pero no hay una vista ni un endpoint publico de resultados.
- El registro manual que reutiliza `/api/registrations` todavia no crea una entrada propia de auditoria administrativa.
- No existe webhook de entrega, rebote o queja; el estado `sent` confirma que Resend acepto el mensaje, no su entrega final en el buzon.

Supabase contiene el deadline por reto, el outbox y las invariantes nuevas. La aplicacion publicada hace cumplir los deadlines, oculta borradores al jurado y exige una entrega final completa. El detalle verificable esta en la documentacion de estado y en el prompt archivado de la iteracion.

## Rutas

| Ruta | Uso |
| --- | --- |
| `/` | Landing y vitrina condicional |
| `/registro` | Registro global de un equipo |
| `/equipo` | Recuperacion de sesion y entrega del proyecto |
| `/login` | Acceso de organizacion, jurado y mentores |
| `/admin` | Centro de control de la Buildathon |
| `/jurado` | Evaluacion de equipos asignados |
| `/mentor` | Seguimiento de equipos asignados |

## Arquitectura

```mermaid
flowchart LR
  Browser["React en Vercel"] -->|"Auth: publishable key"| Auth["Supabase Auth"]
  Browser -->|"/api/*"| Functions["Vercel Functions"]
  Functions -->|"secret key en servidor"| Database["Supabase Postgres"]
  Database --> Tables["RLS + grants restringidos"]
  Functions --> Public["Config y vitrina segura"]
  Public --> Browser
```

El navegador no consulta tablas de negocio directamente. La clave publicable moderna se usa solo para Supabase Auth. Las Vercel Functions aplican validacion y autorizacion antes de usar `SUPABASE_SECRET_KEY`.

### Por que no usar `service_role` en el navegador

Supabase recomienda las claves modernas:

- `sb_publishable_...`: segura para el navegador cuando RLS y grants estan bien definidos.
- `sb_secret_...`: exclusiva de servidores confiables; tiene acceso elevado y nunca debe incluirse en una variable `VITE_`.

La clave legada `service_role` no es necesaria para esta implementacion. Si un proyecto antiguo aun la usa, debe migrarse a una secret key moderna antes de produccion.

## Stack

- React 19, React Router y TypeScript estricto.
- Vite y Framer Motion.
- Three.js para la escena ambiental de la landing.
- Vercel Functions para la API.
- Supabase Postgres y Supabase Auth.
- Resend para correo transaccional mediante outbox, remitente verificado e idempotencia.
- Zod para contratos de entrada.
- Vitest para reglas de dominio.

## Desarrollo local

Requisitos: Node.js 22 o 24 LTS, npm y, para ejecutar Supabase local, Docker Desktop.

```powershell
npm install
Copy-Item .env.example .env.local
npm run typecheck
npm test
npm run build
```

Para trabajar solo en la landing:

```powershell
npm run dev
```

Para probar tambien `/api/*`, usa el runtime local de Vercel una vez configuradas las variables:

```powershell
npx vercel@latest dev
```

## Configuracion de Supabase

No reutilices un proyecto de otra aplicacion. Crea o identifica un proyecto exclusivo para la Buildathon y conserva su `project ref`.

### 1. Enlazar y aplicar la migracion

Descubre primero las opciones actuales del CLI:

```powershell
npx supabase@2.109.1 --help
npx supabase@2.109.1 link --help
npx supabase@2.109.1 db push --help
```

Luego enlaza y aplica:

```powershell
npx supabase@2.109.1 link --project-ref TU_PROJECT_REF
npx supabase@2.109.1 db push
```

El historial aplicado es:

1. `supabase/migrations/20260713232939_buildathon_initial_schema.sql`: esquema, RLS, funciones transaccionales, retos iniciales y rubrica.
2. `supabase/migrations/20260713233118_harden_security_and_indexes.sql`: endurecimiento de funciones e indices para claves foraneas.
3. `supabase/migrations/20260714000143_fix_profile_role_trigger.sql`: corrige el trigger de perfiles para altas Auth con rol explicito.
4. `supabase/migrations/20260714131805_complete_submission_deadlines_and_email_outbox.sql`: deadline por reto, invariantes de entrega final, restriccion SQL de jurado y outbox transaccional de registro.
5. `supabase/migrations/20260714131931_index_registration_email_outbox_team_event.sql`: indice compuesto para la clave foranea del outbox.
6. `supabase/migrations/20260714132323_fix_assignment_role_trigger.sql`: corrige el trigger compartido para asignar jurados y mentores sin acceder a columnas de la otra tabla.
7. `supabase/migrations/20260714205820_add_challenge_themes.sql`: agrega `thematic_axes text[]` y `suggested_topics text[]`, precarga los tres retos y limita el numero de elementos de cada lista.

No edites migraciones aplicadas; crea una nueva con:

```powershell
npx supabase@2.109.1 migration new nombre_descriptivo
```

### 2. Auth

En Supabase Dashboard:

- Deshabilita el registro publico de usuarios.
- Configura el Site URL de produccion y las URLs de preview autorizadas.
- Usa contrasenas de al menos 10 caracteres.
- Crea staff desde `/admin`; no crees participantes como usuarios Auth.

### 3. Variables

Copia `.env.example` y completa solo el archivo local ignorado por Git:

| Variable | Exposicion | Proposito |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Navegador | URL del proyecto |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Navegador | Login de staff |
| `SUPABASE_URL` | Servidor | URL para Functions |
| `SUPABASE_SECRET_KEY` | Servidor | Operaciones privilegiadas |
| `TEAM_SESSION_SECRET` | Servidor | HMAC de sesiones de equipo |
| `VITE_TURNSTILE_SITE_KEY` | Navegador, opcional | Widget anti-bots |
| `TURNSTILE_SECRET_KEY` | Servidor, opcional | Verificacion anti-bots |
| `RESEND_API_KEY` | Servidor | Credencial de Resend; instalar mediante Vercel Marketplace |
| `RESEND_FROM` | Servidor | Remitente sobre dominio verificado |
| `RESEND_REPLY_TO` | Servidor | Correo real de soporte u organizacion |
| `APP_BASE_URL` | Servidor | URL canonica HTTPS usada en correos; produccion usa `https://oaibuildathon.vercel.app` |

La integracion oficial de Supabase en Vercel genera `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY`. Para esta aplicacion Vite crea en Vercel los alias `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` con los valores publicos correspondientes, y genera `TEAM_SESSION_SECRET` de forma independiente. Nunca crees un alias `VITE_` para `SUPABASE_SECRET_KEY`.

Genera `TEAM_SESSION_SECRET` en PowerShell sin reutilizar otra clave:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

### 4. Administrador inicial

Agrega temporalmente a `.env.local`:

```text
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_PASSWORD=
BOOTSTRAP_ADMIN_NAME=
```

Ejecuta:

```powershell
npm run admin:bootstrap
```

Antes de ejecutarlo, confirma que `SUPABASE_URL` y `SUPABASE_SECRET_KEY` corresponden al proyecto esperado. Despues:

1. Inicia sesion en `/login` con el usuario creado.
2. Confirma el rol `admin` y el acceso real a `/api/admin/dashboard`.
3. Elimina `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` y `BOOTSTRAP_ADMIN_NAME` de todos los entornos.
4. Rota o elimina cualquier cuenta temporal de prueba que ya no sea necesaria.

Nunca documentes ni publiques las credenciales del administrador inicial. Los siguientes usuarios se crean desde `/admin`.

### 5. Comprobaciones de base de datos

Con Docker y Supabase local activos:

```powershell
npx supabase@2.109.1 start
npx supabase@2.109.1 db reset
npx supabase@2.109.1 db lint --local
```

Despues de enlazar produccion, revisa los asesores de seguridad y rendimiento en Supabase Dashboard o mediante las herramientas del proyecto.

### 6. Tipos de base de datos

El codigo de la aplicacion importa los tipos revisados desde `src/types/database.ts`. El comando:

```powershell
npm run supabase:types
```

genera `src/types/database.generated.ts`. No sustituye automaticamente el archivo usado por la aplicacion: compara ambos, incorpora las tablas o columnas nuevas en `database.ts` y ejecuta el typecheck antes de confirmar el cambio.

## Despliegue en Vercel

1. Enlaza el repositorio `israelgo93/oaibuildathon` con el proyecto Vercel.
2. Configura todas las variables para Production y las necesarias para Preview/Development.
3. No pegues secretos en comandos, commits, issues o logs compartidos; usa el formulario seguro de Vercel o `vercel env add` de forma interactiva.
4. Despliega y valida `/`, `/registro`, `/equipo`, `/login` y los paneles por rol.

`vercel.json` configura el build de Vite, el fallback del SPA y cabeceras de seguridad. Las rutas `/api/*` permanecen como Functions.

## Flujo operativo recomendado

1. Administracion revisa fechas, abre registro y publica los retos.
2. Una persona registra cada equipo completo.
3. Administracion crea mentores y jurados y realiza asignaciones.
4. Los equipos construyen y completan su entrega.
5. Administracion abre la etapa de calificacion.
6. Los jurados califican todos los criterios de sus equipos.
7. Administracion verifica demos, publica proyectos y revisa el ranking privado.
8. `results_public` puede configurarse, pero la exposicion publica de resultados requiere una implementacion adicional.

## Correo de registro con Resend

El repositorio incluye el SDK de Resend, plantilla HTML/texto, idempotencia, reintentos clasificados y un outbox creado en la misma transaccion del registro. Un fallo de correo no revierte ni duplica el equipo, y administracion puede reintentar pendientes. Resend esta autorizado desde Vercel Marketplace; `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO` y `APP_BASE_URL` estan configuradas en Production. Un registro real termino con estado `sent`, un intento e ID de proveedor. Preview debe usar configuracion separada para no enviar correos reales. El contrato completo esta en [`docs/NEXT_ITERATION_PROMPT.md`](docs/NEXT_ITERATION_PROMPT.md).

## Assets de la landing

Los originales se conservan en `Assets/` y el navegador consume las versiones optimizadas de `public/assets/`. Para regenerar derivados:

```powershell
npm run optimize:assets
```

Revisa `Assets/Generated/README.md` antes de sustituir archivos. El video orbital de runtime es `public/assets/video-orbital.mp4`, servido como `/assets/video-orbital.mp4`; la copia fuente esta en `Assets/video-orbital.mp4`.

## Rubrica inicial

| Criterio | Maximo |
| --- | ---: |
| Producto funcional | 30 |
| Uso de OpenAI y Codex | 25 |
| Ejecucion tecnica | 20 |
| Experiencia y demo | 15 |
| Impacto y aprendizaje | 10 |

Los criterios, maximos, pesos y estados son configurables. El ranking usa el promedio de evaluaciones finales, normalizado por el maximo ponderado activo.

## Seguridad y privacidad

- `.env*` esta ignorado; `.env.example` contiene solo marcadores.
- RLS esta habilitado en todas las tablas publicas.
- `anon` y `authenticated` no tienen grants directos sobre tablas de negocio.
- Los registros de equipos se crean en una funcion SQL transaccional.
- Correos de participantes no forman parte de la vitrina publica.
- Los tokens de sesion se guardan como HMAC y viajan en cookies HTTP-only.
- Las respuestas publicas proyectan solo campos aprobados.
- CSP, HSTS, proteccion contra iframes y politicas de permisos se configuran en Vercel.
- Turnstile puede activarse para el registro publico sin cambiar el codigo.

Antes de produccion define una politica de privacidad, retencion y eliminacion de datos personales acorde al evento.

## Calidad

```powershell
npm run typecheck
npm test
npm audit
npm run build
```

No se permite `any` ni `as any`. Toda consulta Supabase debe tener un tipo `Tables<>` explicito. Las instrucciones completas estan en `AGENTS.md`.

## Estructura relevante

```text
.
|-- .agents/skills/               # Conocimiento reusable para agentes
|-- api/                          # Vercel Functions
|   |-- admin/
|   |-- judge/
|   `-- mentor/
|-- server/                       # Seguridad, Auth, validacion y sesiones
|-- docs/                         # Estado verificado y prompt de siguiente iteracion
|-- src/
|   |-- components/
|   |-- lib/
|   |-- pages/
|   `-- types/
|-- supabase/migrations/          # Esquema versionado
|-- AGENTS.md
|-- PRODUCT.md
`-- vercel.json
```

## Documentacion para agentes

- `AGENTS.md`: reglas de implementacion y seguridad.
- `docs/IMPLEMENTATION_STATUS.md`: comportamiento desplegado, limitaciones y migraciones.
- `docs/NEXT_ITERATION_PROMPT.md`: solicitud autocontenida para el siguiente bloque de implementacion.
- `.agents/skills/landing-maintenance`: mapa y limites de la landing.
- `.agents/skills/buildathon-operations`: dominio, esquema y flujos operativos.
- `PRODUCT.md`: direccion visual, tono y accesibilidad.
- `VIDEO_SCROLL_PLAN.md`: contrato tecnico del video orbital sincronizado con scroll.
