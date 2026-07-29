update experience.interface_content
set is_active = false,
    draft_value = null,
    updated_at = now()
where content_key = 'admin.nav.maturity'
   or (area = 'admin' and (page = 'maturity' or route_pattern like '/admin/maturidade%'));

delete from public.interface_content_public_projection
where content_key = 'admin.nav.maturity'
   or (area = 'admin' and (page = 'maturity' or route_pattern like '/admin/maturidade%'));
