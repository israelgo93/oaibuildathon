-- Cubre el acceso de la llave foranea compuesta del outbox.

create index registration_email_outbox_team_event_idx
  on public.registration_email_outbox (team_id, event_id);
