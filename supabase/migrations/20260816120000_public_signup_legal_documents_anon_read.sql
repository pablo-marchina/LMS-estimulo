begin;

-- Public signup must be able to render the currently published legal documents
-- without requiring a service-role secret in the web runtime. The underlying
-- governance tables remain fully revoked/RLS-protected; only this narrow
-- SECURITY DEFINER projection is executable by public/session clients.
revoke all on function public.get_signup_legal_documents(uuid[]) from public;
grant execute on function public.get_signup_legal_documents(uuid[]) to anon, authenticated, service_role;

commit;
