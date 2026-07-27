# Production redeploy after Supabase service-role rotation

Date: 2026-07-27
Environment: Vercel Production
Project: `lms-estimulo-web`
Supabase project reference: `cfpfeavjlgheqqiaqtzv`

The `SUPABASE_SERVICE_ROLE_KEY` environment variable was rotated in Vercel Production by the project owner.

This audit-only commit intentionally contains no credential value. Its purpose is to trigger a new production deployment so the updated environment snapshot is incorporated and the following checks can be repeated:

- `/api/health/live`
- `/api/health/ready`
- public routes
- unauthenticated redirects for protected routes
- authentication and privileged storage flows
