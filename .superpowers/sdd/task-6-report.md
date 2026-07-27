# Task 6 Report — Aulas nested inside each trilha

**Status:** DONE_WITH_CONCERNS

**Branch:** `refactor/web-frontend-rebuild`

**Final implementation head reviewed:** `68cbf3d79c90593d36ee293f2c85ef39eb58a4da`

## Delivered

- Replaced the standalone activity/path-step authoring surfaces with an aula flow inside each selected jornada's trilhas.
- Added `TrilhaAulaBuilder`, which:
  - lists existing aulas in position order;
  - displays quiz/practice state;
  - creates content aulas with up to six structured prompt blocks;
  - creates a closing aula with a five-question quiz and practice checklist;
  - keeps `organization_id`, `journey_version_id`, and `path_template_id` as hidden contextual values rather than admin-entered IDs.
- Added `saveAulaAction`, which:
  - validates and assembles structured quiz questions/options;
  - stores prompt blocks and the practice checklist in `activity_versions.configuration`;
  - creates the activity first, then links it to the selected trilha through `path_step`;
  - preserves the selected journey version in redirects after success/failure.
- Added `scripts/application/admin-produto-aula-builder.test.mjs` as a structural regression test.
- Removed the old standalone “Atividade e conteúdo” and “Trilha e bloco” authoring sections from the page; advanced rule configuration remains separate.

## Corrections to the written plan

1. **No nested forms.** The plan's sample placed each add-aula `<form>` inside the jornada `<form>`, which is invalid HTML and creates unpredictable submissions. The implementation closes the jornada form before rendering trilha/aula forms.
2. **Closing aulas use `activity_type='practice'`.** The current `save_admin_product_resource` implementation creates `assessment.practice_specs` only for activities whose type is `practice`. Using the plan's `content` value would persist the quiz but silently skip the practice specification.
3. **`path_step` includes a valid shared `code`.** `save_admin_product_resource` validates `p_payload.code` before branching by resource type, so omitting it would fail even though the path-step branch primarily uses `step_code`.
4. **Codes strip accents before slugging.** Portuguese titles such as “Gestão” now produce stable valid codes rather than losing accented letters unpredictably.

## Verification

- Vercel preview deployment for commit `68cbf3d79c90593d36ee293f2c85ef39eb58a4da`: **READY**.
- Production build completed successfully:
  - Next.js compilation passed;
  - TypeScript passed;
  - static page generation passed;
  - `/admin/produto` was included as a dynamic route.
- The new Node structural test is committed. No GitHub Actions workflow ran for this branch, so the test was not independently executed by GitHub CI.

## Concerns / follow-ups

1. **Selo wiring remains deferred.** The form captures `badge_title`, but Task 6 intentionally does not create the path-scoped credential rule and badge. Tasks 7–9 must wire the real Selo after the final `path_template_id` exists.
2. **Two-RPC write is not atomic.** Activity creation and path-step creation are separate RPC calls. A second-call failure can leave an unlinked draft activity. A future backend command should wrap both writes in one transaction or provide compensating cleanup.
3. **Task 7 data is absent in the configured dev project.** Querying `catalog.journey_definitions` for `code='capacitacao_ia_mei_openai'` returned no rows, so Task 8 cannot safely assume an existing jornada/trilha seed.
4. **Source documents are not committed on this branch.** The exact `ref/estimulo-ref/.../trilha-0{1,2,3}-*.docx.md` files referenced by the plan were not retrievable through GitHub. Do not invent final prompts, quiz answers, or checklists; restore the source files before seeding Tasks 7–9.
