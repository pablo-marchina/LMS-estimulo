-- certificate_template_active_scope (20260730211500) and
-- uq_certificate_template_assignments_active_scope (20260816011759) are
-- functionally identical unique partial indexes on
-- engagement.certificate_template_assignments(owner_organization_id,
-- scope_type, coalesce(scope_id, ...)) where active. The second migration
-- used "if not exists" with a different name instead of recognizing the
-- existing index, so both were created. Drop the older, non-conventionally
-- named one and keep uq_certificate_template_assignments_active_scope.
drop index if exists engagement.certificate_template_active_scope;
