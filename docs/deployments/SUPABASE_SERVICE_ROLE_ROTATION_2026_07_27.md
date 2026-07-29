# Production redeploy after Supabase service-role rotation

Date: 2026-07-27  
Environment: Vercel Production  
Project: `lms-estimulo-web`  
Supabase project reference: `cfpfeavjlgheqqiaqtzv`

The `SUPABASE_SERVICE_ROLE_KEY` environment variable was rotated in Vercel Production by the project owner.

This audit record intentionally contains no credential value. Its purpose is to record the required redeployment and the checks that must be repeated after an environment-secret rotation:

- `/api/health/live`;
- `/api/health/ready`;
- public routes;
- unauthenticated redirects for protected routes;
- authentication and privileged storage flows.

A secret rotation is complete only when the deployment ID, source commit, readiness result and rollback target are attached to the release evidence.
