create index broadcast_campaigns_event_idx
  on public.broadcast_campaigns (event_id);

create index broadcast_campaigns_created_by_idx
  on public.broadcast_campaigns (created_by);
