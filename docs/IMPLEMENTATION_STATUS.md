# Estado de implementacion

Ultima verificacion tecnica: 14 de julio de 2026.

Este documento separa el comportamiento disponible del alcance aprobado para una siguiente iteracion. No contiene credenciales, contrasenas, codigos de equipo ni secretos.

## Cambio local implementado y pendiente de produccion

El arbol local agrega `challenges.thematic_axes text[]` y `challenges.suggested_topics text[]` mediante `20260714205820_add_challenge_themes.sql`. La migracion precarga listas para los tres retos y aplica limites de 1 a 8 ejes y de 1 a 12 temas.

El panel administrativo edita las listas con un elemento por linea. La configuracion publica, el portal del equipo y mentoria las exponen mediante contratos tipados; registro y portal las muestran como ejes e ideas de construccion. Este alcance todavia no esta aplicado en Supabase ni desplegado o verificado en Vercel Production.

La verificacion local termino con TypeScript estricto, 37 pruebas, `npm audit` sin vulnerabilidades y dos builds consecutivos correctos. La comparacion remota se realiza contra el proyecto `buildathon` antes de aplicar la migracion.

## Implementacion desplegada y verificada

El alcance de `NEXT_ITERATION_PROMPT.md` esta desplegado en produccion. La verificacion del 14 de julio de 2026 confirma:

- las seis migraciones locales coinciden con el historial remoto y las tres migraciones de esta iteracion estan aplicadas;
- `src/types/database.generated.ts` fue regenerado desde el esquema remoto y reconciliado con `src/types/database.ts`;
- el codigo esta publicado en Vercel y el alias canonico apunta a un deployment Production en estado `READY`;
- `/`, `/registro`, `/equipo`, `/login`, la configuracion publica y la vitrina responden correctamente;
- una prueba real de navegador completo registro, sesion automatica, guardado de borrador incompleto y envio final `submitted`; los datos temporales se eliminaron al terminar;
- TypeScript estricto, 34 pruebas, `npm audit` sin vulnerabilidades y dos builds consecutivos terminaron correctamente.

Resend esta autorizado mediante Vercel Marketplace. `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO` y `APP_BASE_URL` estan configuradas en Production. Un registro real devolvio `201` y su outbox termino en `sent` al primer intento, con ID de proveedor y sin error; el equipo temporal se elimino despues. Docker Desktop no estuvo disponible para `supabase db reset`; el esquema, las transacciones, el historial y los asesores se verificaron directamente contra el proyecto remoto.

## Entornos conectados

- Repositorio: `israelgo93/oaibuildathon`.
- Produccion: `https://oaibuildathon.vercel.app`.
- Supabase: proyecto `buildathon`, referencia publica `iexmlbslfnckrdtkwuir`.
- Vercel y Supabase estan integrados. Vercel administra las variables de servidor y los alias publicos requeridos por Vite.
- Existe un administrador inicial verificado mediante login y acceso real a `/api/admin/dashboard`. Sus credenciales no se documentan en el repositorio.

## Matriz funcional

| Area | Estado | Disponible ahora | Limitaciones conocidas |
| --- | --- | --- | --- |
| Landing | Implementado | Landing cinematografica, CTA `Registra tu equipo` y vitrina condicional | La landing no administra equipos ni entregas; esas funciones viven en rutas separadas |
| Registro de equipos | Implementado | Registro unico de 1 a 3 integrantes, obligatorios accesibles, contacto principal, reto, cupos, Turnstile opcional, cookie, codigo de recuperacion y confirmacion por correo | Un fallo de correo no invalida ni duplica el registro |
| Portal del equipo | Implementado | Recuperacion por correo y codigo, borrador incompleto, envio final estricto, tecnologias tipadas, enlaces, deadline y estado | No hay edicion colaborativa simultanea |
| Retos | Implementado; ampliacion local pendiente | Produccion: titulo, descripcion, requisitos, estado, cupo opcional y deadline propio. Local: ejes tematicos y temas sugeridos editables | La UI administra retos del evento existente mas reciente; la ampliacion local aun no esta desplegada |
| Administracion | Implementado con alcance acotado | Configuracion del evento mas reciente, retos, rubrica, equipos, staff, asignaciones, entregas y ranking privado | No crea eventos; staff se crea/lista pero no se elimina, desactiva ni restablece desde la UI |
| Jurado | Implementado | Equipos asignados con entrega final, estado, deadline, `submitted_at`, tecnologias, enlaces y rubrica dinamica | Solo puede evaluar mientras la etapa esta abierta |
| Mentoria | Implementado | Equipos asignados, integrantes, reto, entrega y notas de organizacion | No modifica entregas ni calificaciones |
| Vitrina | Implementado | Solo muestra entregas publicadas por administracion y campos aprobados | Usa el evento mas reciente con vitrina habilitada |
| Resultados publicos | No implementado | Existe el campo `results_public` y ranking privado en administracion | No hay endpoint ni vista publica de resultados |
| Correo transaccional | Implementado | SDK Resend, remitente verificado, HTML/texto, outbox transaccional, idempotencia, reintentos y accion administrativa | No existe webhook de entrega, rebote o queja; `sent` representa aceptacion del proveedor |

## Contrato actual de registro

El servidor exige:

- nombre y ciudad base del equipo;
- un reto activo;
- entre uno y tres participantes;
- nombre, correo, telefono y ciudad de cada participante;
- exactamente un contacto principal cuyo correo coincide con el correo de contacto.

Organizacion/comunidad y rol/fortaleza son opcionales. El registro publico y el registro manual desde administracion usan `/api/registrations`.

La RPC `register_team` crea de forma atomica el equipo, integrantes, reto, entrega inicial y notificacion de outbox. El codigo siempre se devuelve y se muestra en pantalla, incluso si el correo no esta configurado o el proveedor falla.

## Contrato actual de entrega

- Guardar borrador permite informacion incompleta.
- El envio final exige `projectName`, `shortDescription`, `problem`, `solution`, al menos una tecnologia, URL de demo y URL de repositorio.
- Las tecnologias se seleccionan desde una lista tipada; `Otras` normaliza entradas personalizadas, elimina duplicados y aplica limites.
- Presentacion y video son opcionales.
- `submitted_at` representa el ultimo envio final exitoso y se muestra a administracion y jurado.
- Guardar de nuevo como borrador elimina `submitted_at`; reenviar asigna una nueva hora del servidor.
- Administracion solo puede llevar una entrega completa a `submitted` o `published`; publicar conserva `submitted_at`.

## Fechas y seleccion de evento

- Registro y calificacion usan banderas y ventanas del evento.
- `PATCH /api/team` hace cumplir el cierre efectivo en servidor: el menor entre `events.submissions_close_at` y `challenges.submission_deadline_at`.
- Las fechas se guardan en UTC y se muestran en `America/Guayaquil (UTC-5)`.
- La configuracion publica, jurado, mentor y vitrina operan sobre el evento mas reciente. El panel actualiza eventos existentes, pero no incluye creacion de eventos.

## API desplegada

| Endpoint | Acceso | Funcion |
| --- | --- | --- |
| `/api/public-config` | Publico | Evento y retos activos |
| `/api/showcase` | Publico | Entregas publicadas aprobadas |
| `/api/registrations` | Publico o admin | Registro atomico de equipos |
| `/api/team` | Cookie de equipo | Recuperacion, lectura y entrega |
| `/api/admin/dashboard` | Admin | Datos operativos y ranking |
| `/api/admin/manage` | Admin | Mutaciones administrativas auditadas |
| `/api/admin/staff` | Admin | Creacion de admin, jurado o mentor |
| `/api/judge/dashboard` | Jurado | Asignaciones, entregas y rubrica |
| `/api/judge/evaluations` | Jurado | Borradores y envio de calificaciones |
| `/api/mentor/dashboard` | Mentor | Equipos asignados |

## Migraciones aplicadas

1. `20260713232939_buildathon_initial_schema.sql`: entidades, funciones, RLS, datos iniciales y rubrica.
2. `20260713233118_harden_security_and_indexes.sql`: endurecimiento de funciones e indices.
3. `20260714000143_fix_profile_role_trigger.sql`: evita insertar un perfil con rol nulo durante el alta Auth y permite crear correctamente administradores, jurados y mentores.
4. `20260714131805_complete_submission_deadlines_and_email_outbox.sql`: agrega `challenges.submission_deadline_at`, `registration_email_outbox`, restricciones de entrega final, preservacion de `submitted_at` al publicar y bloqueo SQL de evaluaciones sobre borradores.
5. `20260714131931_index_registration_email_outbox_team_event.sql`: agrega el indice compuesto que cubre la clave foranea del outbox.
6. `20260714132323_fix_assignment_role_trigger.sql`: corrige el trigger de asignaciones compartido y permite validar jurados y mentores contra su columna correspondiente.

No se editan migraciones aplicadas. Cada cambio futuro usa `npx supabase@2.109.1 migration new nombre_descriptivo` y se reconcilia con el historial remoto.

### Migracion local pendiente

- `20260714205820_add_challenge_themes.sql`: agrega ejes tematicos y temas sugeridos, precarga contenido para los tres retos y limita la cardinalidad de ambas listas. Esta aplicada en Supabase y pendiente de verificar con la aplicacion desplegada.

## Seguridad vigente

- El navegador solo recibe URL y publishable key de Supabase.
- `SUPABASE_SECRET_KEY` y `TEAM_SESSION_SECRET` son exclusivos de Vercel Functions.
- RLS esta habilitado y `anon`/`authenticated` no tienen grants directos sobre tablas de negocio.
- El token de sesion de equipo se guarda como HMAC y la cookie es HTTP-only.
- Los datos personales no se publican en la vitrina.
- La creacion de staff y las acciones de `/api/admin/manage` dejan auditoria. El registro manual que reutiliza `/api/registrations` todavia no crea una entrada de auditoria administrativa.

## Iteracion aprobada y desplegada

El alcance de campos obligatorios, selector de tecnologias, email con Resend, deadline por reto y visibilidad para jurado definido en [`NEXT_ITERATION_PROMPT.md`](./NEXT_ITERATION_PROMPT.md) esta implementado y verificado en produccion.

No queda configuracion externa pendiente en esta iteracion. El registro y el correo transaccional estan activos; el outbox conserva la independencia del registro frente a fallos y permite reintentos administrativos.
