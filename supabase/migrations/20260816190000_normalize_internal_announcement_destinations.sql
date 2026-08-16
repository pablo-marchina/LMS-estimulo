-- Keep application-internal announcement destinations environment-neutral.
-- Historical rows using the former Vercel application origin are normalized to
-- relative participant paths so preview/homologation does not redirect to production.

begin;

update engagement.announcements
set cta_url = regexp_replace(
      cta_url,
      '^https://lms-estimulo-web\.vercel\.app',
      '',
      'i'
    ),
    updated_at = now()
where cta_url ~* '^https://lms-estimulo-web\.vercel\.app/empreendedor(?:/|\?|#|$)';

commit;
