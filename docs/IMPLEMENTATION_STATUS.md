# Estado de implementacion

Ultima verificacion tecnica: 14 de julio de 2026.

Este documento separa el comportamiento disponible del alcance aprobado para una siguiente iteracion. No contiene credenciales, contrasenas, codigos de equipo ni secretos.

## Acceso de staff y difusion en despliegue

Las migraciones `20260714223749_add_staff_access_and_broadcasts.sql`, `20260714224056_index_broadcast_campaign_foreign_keys.sql`, `20260714230812_harden_broadcast_retry_and_idempotency.sql` y `20260714230821_harden_staff_access_and_password_recovery.sql` estan aplicadas en Supabase. Son aditivas: no contienen borrado ni desactivacion de cuentas. La verificacion posterior conserva 13 perfiles y 13 usuarios Auth: 1 administrador, 7 jurados y 5 mentores activos. Todos mantienen `must_change_password = false`, `access_email_status = not_sent`; existen cero campanas y cero solicitudes de recuperacion. Por tanto, aplicar el esquema no ha rotado claves ni enviado correos.

El codigo local incorpora:

- clave temporal manual u opcionalmente generada en servidor al crear staff;
- correo HTML/texto con instrucciones separadas para administracion, jurado y mentoria;
- acciones individuales, solo pendientes o todos los mentores/jurados activos, siempre confirmadas y sin incluir administradores;
- bloqueo server-side hasta cambiar la clave temporal y ruta `/cambiar-contrasena`;
- recuperacion con respuesta neutral inmediata, cuota HMAC atomica por correo/IP y enlace generado por Supabase Auth enviado mediante Resend;
- activacion de una nueva clave existente solo despues de que Resend acepta el mensaje, conservando la clave anterior ante fallos del proveedor;
- campanas de hasta 500 destinatarios, TXT/CSV con columna de correo, vista previa, CTA interna, lotes de 100, idempotencia estable, estado durable y recuperacion de envios interrumpidos o transitorios.

La verificacion integrada termina con TypeScript estricto, 94 pruebas, `npm audit` sin vulnerabilidades y build de produccion correcto. Una prueba SQL transaccional confirmo creacion/reanudacion de campana y cuota atomica de recuperacion con `ROLLBACK`. La aplicacion aun no se describe como desplegada hasta publicar y verificar las rutas canonicas. Ninguna prueba envia correos a mentores, jurados o administradores reales.

## Ejes tematicos desplegados y verificados

Produccion agrega `challenges.thematic_axes text[]` y `challenges.suggested_topics text[]` mediante `20260714205820_add_challenge_themes.sql`. La migracion precarga listas para los tres retos y aplica limites de 1 a 8 ejes y de 1 a 12 temas.

El panel administrativo edita las listas con un elemento por linea. La configuracion publica, el portal del equipo y mentoria las exponen mediante contratos tipados; registro y portal las muestran como ejes e ideas de construccion.

La verificacion del 14 de julio de 2026 confirma que el historial remoto contiene la septima migracion, las restricciones de cardinalidad estan activas y los datos remotos conservan 6/8 elementos para agentes, 6/8 para builders y 8/10 para impacto local. La API publica devolvio esas mismas cantidades; `/registro` mostro las seis listas completas y una sesion temporal de `/equipo` mostro los 6 ejes y 8 ideas del reto de agentes. El equipo temporal fue eliminado y la consulta de limpieza devolvio cero registros.

El deployment Production del commit `7dff353` termino en estado `READY`, el alias canonico fue actualizado y Vercel no reporto errores de ejecucion en la hora de verificacion. `/admin` rechazo correctamente el acceso sin sesion y el bundle desplegado contiene los campos `thematicAxes` y `suggestedTopics`, sus etiquetas y su payload de actualizacion. No se repitio un guardado administrativo autenticado porque no habia una sesion disponible en el entorno; el contrato de mutacion y validacion queda cubierto por las pruebas automatizadas.

La verificacion local termino con TypeScript estricto, 37 pruebas, `npm audit` sin vulnerabilidades y dos builds consecutivos correctos.

## Implementacion desplegada y verificada

El alcance de `NEXT_ITERATION_PROMPT.md` esta desplegado en produccion. La verificacion del 14 de julio de 2026 confirma:

- las primeras siete migraciones de ese alcance coinciden con el historial remoto;
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
| Retos | Implementado | Titulo, enfoque, requisitos, estado, cupo opcional, deadline propio, ejes tematicos y temas sugeridos editables | La UI administra retos del evento existente mas reciente |
| Administracion | Implementado con alcance acotado | Configuracion del evento mas reciente, retos, rubrica, equipos, staff, asignaciones, entregas y ranking privado | No crea eventos; la nueva UI de acceso y difusion esta pendiente de verificacion desplegada |
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

El arbol pendiente de despliegue agrega `/api/auth/me`, `/api/auth/password-recovery`, `/api/admin/staff-access` y `/api/admin/broadcasts`. No se consideran endpoints de produccion hasta verificar el deployment.

## Migraciones aplicadas

1. `20260713232939_buildathon_initial_schema.sql`: entidades, funciones, RLS, datos iniciales y rubrica.
2. `20260713233118_harden_security_and_indexes.sql`: endurecimiento de funciones e indices.
3. `20260714000143_fix_profile_role_trigger.sql`: evita insertar un perfil con rol nulo durante el alta Auth y permite crear correctamente administradores, jurados y mentores.
4. `20260714131805_complete_submission_deadlines_and_email_outbox.sql`: agrega `challenges.submission_deadline_at`, `registration_email_outbox`, restricciones de entrega final, preservacion de `submitted_at` al publicar y bloqueo SQL de evaluaciones sobre borradores.
5. `20260714131931_index_registration_email_outbox_team_event.sql`: agrega el indice compuesto que cubre la clave foranea del outbox.
6. `20260714132323_fix_assignment_role_trigger.sql`: corrige el trigger de asignaciones compartido y permite validar jurados y mentores contra su columna correspondiente.
7. `20260714205820_add_challenge_themes.sql`: agrega ejes tematicos y temas sugeridos, precarga contenido para los tres retos y limita la cardinalidad de ambas listas.
8. `20260714223749_add_staff_access_and_broadcasts.sql`: agrega estado de credenciales, rate limit de recuperacion, campanas/destinatarios, RLS, grants service-only y RPC atomicas.
9. `20260714224056_index_broadcast_campaign_foreign_keys.sql`: agrega indices para las claves foraneas de campanas.
10. `20260714230812_harden_broadcast_retry_and_idempotency.sql`: persiste clasificacion e idempotencia por lote y agrega reanudacion atomica para campanas recuperables.
11. `20260714230821_harden_staff_access_and_password_recovery.sql`: preserva el cambio obligatorio durante la activacion y hace atomica la cuota de recuperacion por correo/IP.

No se editan migraciones aplicadas. Cada cambio futuro usa `npx supabase@2.109.1 migration new nombre_descriptivo` y se reconcilia con el historial remoto.

## Seguridad vigente

- El navegador solo recibe URL y publishable key de Supabase.
- `SUPABASE_SECRET_KEY` y `TEAM_SESSION_SECRET` son exclusivos de Vercel Functions.
- RLS esta habilitado y `anon`/`authenticated` no tienen grants directos sobre tablas de negocio.
- El token de sesion de equipo se guarda como HMAC y la cookie es HTTP-only.
- Los datos personales no se publican en la vitrina.
- La creacion de staff y las acciones de `/api/admin/manage` dejan auditoria. El registro manual que reutiliza `/api/registrations` todavia no crea una entrada de auditoria administrativa.
- Las claves temporales no se persisten ni aparecen en respuestas o auditoria; cada re-notificacion genera una nueva.
- Recuperacion y difusion usan contenido fijo o texto escapado, remitente de servidor y CTA internas; el navegador no puede elegir HTML, remitente o URL.

## Iteracion aprobada y desplegada

El alcance de campos obligatorios, selector de tecnologias, email con Resend, deadline por reto y visibilidad para jurado definido en [`NEXT_ITERATION_PROMPT.md`](./NEXT_ITERATION_PROMPT.md) esta implementado y verificado en produccion.

No queda configuracion externa pendiente en la iteracion archivada. Para la extension de acceso y difusion falta publicar el codigo y verificar las rutas sin ejecutar notificaciones reales. `RESEND_FROM` ya esta fijado en Production como `OpenAI Build Week Manta <noreply@datatensei.ai>`. El enlace de recuperacion vuelve al Site URL y el cliente enruta el evento `PASSWORD_RECOVERY`, por lo que no depende de incluir tokens en URLs propias.
