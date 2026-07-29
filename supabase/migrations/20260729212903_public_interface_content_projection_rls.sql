alter table public.interface_content_public_projection enable row level security;

drop policy if exists interface_content_public_projection_read on public.interface_content_public_projection;
create policy interface_content_public_projection_read
on public.interface_content_public_projection
for select
to anon,authenticated
using (true);

grant select on public.interface_content_public_projection to anon,authenticated,service_role;
