# Visual audit findings — 2026-08-16

Reproduced issues from the previous green visual run:

- Participant selected lesson desktop: journey root resolved into two implicit columns, squeezing hero/learning path to the right and leaving a large empty region.
- Admin `/admin/certificados` mobile: horizontal document overflow, 433 px document in a 390 px viewport.
- Admin `/admin/gamificacao?tipo=certificados` mobile: same certificate-template overflow through the canonical gamification view.

No comparable catastrophic composition defect was visible in the previously captured broad contact sheets, but the selected-lesson state was absent from that matrix. The hardened audit therefore adds explicit state discovery and geometry checks rather than relying on the previous screenshot set alone.
