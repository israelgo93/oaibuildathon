# Estado de implementacion

Ultima verificacion tecnica: 14 de julio de 2026.

Este documento separa el comportamiento disponible del alcance aprobado para una siguiente iteracion. No contiene credenciales, contrasenas, codigos de equipo ni secretos.

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
| Registro de equipos | Implementado con pendientes UX | Registro unico de 1 a 3 integrantes, contacto principal, reto, cupos, Turnstile opcional y codigo de recuperacion | Los campos obligatorios usan validacion nativa/Zod, pero no muestran asteriscos; no existe correo de confirmacion |
| Portal del equipo | Implementado con reglas parciales | Recuperacion por correo y codigo, borrador, envio, enlaces y estado | Tecnologias es texto libre; demo y repositorio son alternativos; el cierre por fecha/hora no se aplica en servidor |
| Retos | Implementado con pendiente de deadline | Titulo, descripcion, requisitos, estado y cupo opcional | No existe fecha y hora limite por reto |
| Administracion | Implementado con alcance acotado | Configuracion del evento mas reciente, retos, rubrica, equipos, staff, asignaciones, entregas y ranking privado | No crea eventos; staff se crea/lista pero no se elimina, desactiva ni restablece desde la UI |
| Jurado | Implementado con brecha de acceso | Equipos asignados, enlaces, contexto y rubrica dinamica | Recibe borradores, no muestra `submitted_at`, tecnologias, presentacion ni video; la evaluacion no exige entrega final |
| Mentoria | Implementado | Equipos asignados, integrantes, reto, entrega y notas de organizacion | No modifica entregas ni calificaciones |
| Vitrina | Implementado | Solo muestra entregas publicadas por administracion y campos aprobados | Usa el evento mas reciente con vitrina habilitada |
| Resultados publicos | No implementado | Existe el campo `results_public` y ranking privado en administracion | No hay endpoint ni vista publica de resultados |
| Correo transaccional | No implementado | Ninguno | No existe proveedor, outbox, plantilla, webhook ni variables Resend |

## Contrato actual de registro

El servidor exige:

- nombre y ciudad base del equipo;
- un reto activo;
- entre uno y tres participantes;
- nombre, correo, telefono y ciudad de cada participante;
- exactamente un contacto principal cuyo correo coincide con el correo de contacto.

Organizacion/comunidad y rol/fortaleza son opcionales. El registro publico y el registro manual desde administracion usan `/api/registrations`.

La RPC `register_team` crea de forma atomica el equipo, integrantes, reto y una entrega inicial en borrador. El codigo se devuelve y se muestra en pantalla; actualmente no se envia por correo.

## Contrato actual de entrega

- `projectName`, `shortDescription`, `problem` y `solution` son obligatorios por Zod incluso al guardar borrador.
- `techStack` puede quedar vacio y se captura como texto separado por comas.
- Para enviar se exige una URL de demo **o** una URL de repositorio, no ambas.
- Presentacion y video son opcionales.
- `submitted_at` representa el envio mas reciente o un cambio administrativo a estado `submitted`; no se muestra en la UI del jurado.
- Guardar de nuevo como borrador elimina `submitted_at`; reenviar asigna una nueva hora del servidor.
- Administracion puede publicar con nombre, descripcion corta y demo o repositorio.

## Fechas y seleccion de evento

- Registro y calificacion usan banderas y ventanas del evento.
- `events.submissions_close_at` existe como cierre global, pero `PATCH /api/team` solo comprueba `submissions_open`; hoy no compara la hora del servidor con ese cierre.
- `challenges` no tiene deadline propio.
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

No se editan migraciones aplicadas. Cada cambio futuro usa `npx supabase@2.109.1 migration new nombre_descriptivo` y se reconcilia con el historial remoto.

## Seguridad vigente

- El navegador solo recibe URL y publishable key de Supabase.
- `SUPABASE_SECRET_KEY` y `TEAM_SESSION_SECRET` son exclusivos de Vercel Functions.
- RLS esta habilitado y `anon`/`authenticated` no tienen grants directos sobre tablas de negocio.
- El token de sesion de equipo se guarda como HMAC y la cookie es HTTP-only.
- Los datos personales no se publican en la vitrina.
- La creacion de staff y las acciones de `/api/admin/manage` dejan auditoria. El registro manual que reutiliza `/api/registrations` todavia no crea una entrada de auditoria administrativa.

## Proxima iteracion aprobada, aun no implementada

El alcance de campos obligatorios, selector de tecnologias, email con Resend, deadline por reto y visibilidad para jurado esta definido en [`NEXT_ITERATION_PROMPT.md`](./NEXT_ITERATION_PROMPT.md).

No debe marcarse como implementado hasta que existan migraciones, tipos, validacion de servidor, UI, pruebas, variables documentadas y verificacion desplegada.
