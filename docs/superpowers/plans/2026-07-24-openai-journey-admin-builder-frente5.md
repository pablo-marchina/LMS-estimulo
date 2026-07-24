# OpenAI Demo Journey, Guided Admin Journey Builder, and Frente 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the real "Capacitação em IA para MEI/ME – Estímulo <> OpenAI" jornada
(structure now, final copy later), replace `admin/produto`'s flat ID/JSON forms with a
guided jornada→trilha→aula builder, fix the jornada/trilha terminology on the
participant catalog page, and ship Frente 5's participant screens (Home reorg,
Engajamento hub, trilha-unlock banner).

**Architecture:** No new backend engines. Reuses `catalog.journey_definitions/versions`,
`orchestration.path_templates/path_steps`, `catalog.activity_versions`,
`assessment.assessment_specs/questions/answer_options`, `assessment.practice_specs`,
`engagement.badge_definitions/versions`, and the existing `credential-v1` badge-matching
mechanism (extended with one new scope). All schema/RPC changes are additive; existing
resource types and read paths are extended, not replaced.

**Tech Stack:** Next.js 16 App Router, Server Actions, Tailwind v4, Supabase (Postgres +
plpgsql), npm workspaces monorepo. Same conventions as the Frente 3+4 plan
(`docs/superpowers/plans/2026-07-23-frente-3-4-diagnostico-arquetipo-gating.md`).

## Global Constraints

- Público leigo em tecnologia: nenhum jargão técnico em texto voltado ao admin ou ao
  participante; a nova UI do construtor de jornada nunca deve expor UUIDs ou JSON cru.
- Terminologia obrigatória em todo código/copy novo ou tocado por este plano: **jornada**
  = `catalog.journey_definitions/versions` (unidade matriculável/publicável, com gating
  por arquétipo); **trilha** = `orchestration.path_templates` (bloco dentro de uma
  jornada); **aula** = `orchestration.path_steps` + `catalog.activity_versions`
  (atividade dentro de uma trilha). Nunca usar "trilha" para se referir à jornada.
- Toda migração deve ser aplicada e verificada ao vivo via `mcp__supabase__apply_migration`
  / `execute_sql` contra o projeto Supabase de dev (`cfpfeavjlgheqqiaqtzv`) antes da
  revisão da tarefa — nunca confiar apenas em rastreamento manual do SQL.
- Antes de `create or replace` em qualquer função multi-branch compartilhada
  (`save_admin_product_resource`, `get_admin_product_workspace`,
  `app_private.learning_credential_context`, `app_private.credential_rule_matches`,
  `app_private.learning_badge_candidates`), sempre puxar o corpo ATUAL via
  `pg_get_functiondef` primeiro — arquivos de migração podem estar desatualizados em
  relação ao banco ao vivo (isso já aconteceu breakcrutas vezes na Frente 3+4).
- Nenhuma mudança neste plano deve remover ou enfraquecer o `credential-v1` scope
  `'journey'`/`'activity'` já existente — toda extensão é aditiva (nova branch `'path'`),
  nunca uma reescrita do comportamento existente.
- Conteúdo da jornada OpenAI: prompts, perguntas de quiz (aula e trilha), checklists de
  entrega prática e nomes de Selo são conteúdo final, retirados quase verbatim dos
  documentos-fonte (`ref/estimulo-ref/estimulo-ref/trilha-0{1,2,3}-*.docx.md`). O texto
  instrucional de cada aula (o parágrafo que o participante lê) é um rascunho adaptado
  do roteiro de facilitador — deve ser marcado como rascunho editável, nunca apresentado
  como copy final aprovada.
- Nunca inventar critério de aprovação de aula/trilha além do que os documentos-fonte já
  especificam (ex.: nota mínima do quiz de encerramento) — se o documento não especifica
  um valor, deixe o campo em branco/editável pelo admin, não invente um número.

---

## Task 1: Schema for trilha ordering + nested read path

**Files:**
- Create: `supabase/migrations/20260724010000_path_template_position_and_workspace_nesting.sql`
- Modify: `apps/web/lib/admin/product-management.ts` (extend `VersionSummary`/journey
  version type with the new nested fields)
- Test: `scripts/application/admin-workspace-trilha-nesting.test.mjs`

**Interfaces:**
- Produces: `orchestration.path_templates.position integer not null default 0`.
  `get_admin_product_workspace`'s `journeys[].versions[]` objects gain a `trilhas` array:
  `{ id, code, name, description, position, status, badge: {badge_version_id, title,
  description} | null, aulas: [{ step_id, code, position, is_required,
  activity_version_id, title, description, activity_type, configuration,
  assessment: {spec_id, passing_score, max_attempts, questions: [{id, code, prompt,
  position, options: [{id, code, label, is_correct, position}]}]} | null,
  practice: {submission_mode, allowed_evidence_types, review_required} | null }] }`.
- Consumes: nothing new (purely additive read-side change, same shape conventions as
  Frente 3+4 Task 1's `dimensions`/`items` nesting on the diagnostics branch).

- [ ] **Step 1: Apply the position column**

```sql
alter table orchestration.path_templates add column if not exists position integer not null default 0;
comment on column orchestration.path_templates.position is 'Display/execution order of this trilha within its jornada. Admin-editable via the guided builder.';
```
Apply via `mcp__supabase__apply_migration` name `path_template_position`. Verify:
```sql
select column_name, data_type, column_default from information_schema.columns
where table_schema='orchestration' and table_name='path_templates' and column_name='position';
```

- [ ] **Step 2: Pull the live `get_admin_product_workspace` body**

```sql
select pg_get_functiondef(oid) from pg_proc where proname='get_admin_product_workspace';
```
Use this as the base for the `create or replace` in Step 3 — reconstruct every branch
verbatim except the `journeys` branch's inner `versions` object, which gains the new
`trilhas` key described below.

- [ ] **Step 3: Add the `trilhas` nesting inside the `journeys` branch**

Inside the `'versions'` sub-select's `jsonb_build_object(...)` for each `jv` (journey
version row), add this key (alongside the existing `id/version_number/status/title/
description/configuration/content_hash/published_at/eligible_archetype_codes` keys):

```sql
'trilhas',(select coalesce(jsonb_agg(jsonb_build_object(
  'id',pt.id,'code',pt.code,'name',pt.name,'description',pt.description,
  'position',pt.position,'status',pt.status,
  'badge',(select jsonb_build_object('badge_version_id',bv.id,'title',bv.title,'description',bv.description)
    from engagement.badge_versions bv
    join orchestration.rule_versions rv on rv.id=bv.criteria_rule_version_id
    where rv.language='credential-v1' and rv.expression->>'scope'='path'
      and rv.expression->>'path_template_id'=pt.id::text
    order by bv.id desc limit 1),
  'aulas',(select coalesce(jsonb_agg(jsonb_build_object(
    'step_id',ps.id,'code',ps.code,'position',ps.position_hint,'is_required',ps.is_required,
    'activity_version_id',av.id,'title',av.title,'description',av.description,
    'activity_type',av.activity_type,'configuration',av.configuration,
    'assessment',(select jsonb_build_object(
        'spec_id',asp.id,'passing_score',asp.passing_score,'max_attempts',asp.max_attempts,
        'questions',(select coalesce(jsonb_agg(jsonb_build_object(
            'id',q.id,'code',q.code,'prompt',q.prompt,'position',q.position,
            'options',(select coalesce(jsonb_agg(jsonb_build_object(
                'id',o.id,'code',o.code,'label',o.label,'is_correct',o.is_correct,'position',o.position
              ) order by o.position),'[]'::jsonb)
              from assessment.answer_options o where o.question_id=q.id)
          ) order by q.position),'[]'::jsonb)
          from assessment.questions q where q.activity_version_id=av.id)
      ) from assessment.assessment_specs asp where asp.activity_version_id=av.id),
    'practice',(select jsonb_build_object(
        'submission_mode',pxs.submission_mode,'allowed_evidence_types',pxs.allowed_evidence_types,
        'review_required',pxs.review_required
      ) from assessment.practice_specs pxs where pxs.activity_version_id=av.id)
  ) order by ps.position_hint),'[]'::jsonb)
    from orchestration.path_steps ps join catalog.activity_versions av on av.id=ps.activity_version_id
    where ps.path_template_id=pt.id)
) order by pt.position),'[]'::jsonb) from orchestration.path_templates pt where pt.journey_version_id=jv.id),
```

Apply via `mcp__supabase__apply_migration` name `workspace_trilha_nesting`.

- [ ] **Step 4: Verify live**

Call `get_admin_product_workspace` for the actor/org used throughout this session
(`577f49e5-9b1f-4eee-b551-b2546d513190` / `427d7ce5-c341-54cf-a3a2-c2936e4a0a27`).
Confirm the existing `e14_runtime_validation_journey` version now shows a `trilhas` key
(may be `[]` since it has no path_templates today — this is the pre-existing internal
technical journey, not the OpenAI one). Confirm `dimensions`/`items`/`archetypes` on the
`diagnostics` branch and `eligible_archetype_codes` on the `journeys` branch are
unaffected (unchanged byte-for-byte) — run the byte-hash check pattern from Task 6's
review (`md5(pg_get_functiondef(...))` comparison isn't meaningful here since this task
*intentionally* changes the function; instead diff the `diagnostics`/`activities`/
`paths`/`rules`/`point_rules`/`badges`/`certificates` top-level keys of the JSON output
before/after to confirm only `journeys[].versions[].trilhas` changed shape).

- [ ] **Step 5: Extend the TypeScript read type**

In `apps/web/lib/admin/product-management.ts`, find the `VersionSummary` type (or the
journey-version-specific type if journeys have their own) and add:
```ts
export type TrilhaAula = {
  step_id: string;
  code: string;
  position: number;
  is_required: boolean;
  activity_version_id: string;
  title: string;
  description: string | null;
  activity_type: string;
  configuration: Record<string, unknown>;
  assessment: {
    spec_id: string;
    passing_score: number | null;
    max_attempts: number | null;
    questions: Array<{
      id: string;
      code: string;
      prompt: string;
      position: number;
      options: Array<{ id: string; code: string; label: string; is_correct: boolean; position: number }>;
    }>;
  } | null;
  practice: { submission_mode: string; allowed_evidence_types: string[]; review_required: boolean } | null;
};

export type Trilha = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  position: number;
  status: string;
  badge: { badge_version_id: string; title: string; description: string | null } | null;
  aulas: TrilhaAula[];
};
```
Add `trilhas?: Trilha[]` to the existing journey-version type (matching the loose,
optional-field convention already used for `dimensions`/`items`/`archetypes` on the
diagnostic version type from Frente 3+4 Task 1).

- [ ] **Step 6: Write and run the test**

`scripts/application/admin-workspace-trilha-nesting.test.mjs`:
```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile("apps/web/lib/admin/product-management.ts", "utf8");

test("admin product types expose trilhas with nested aulas, assessment, and practice", () => {
  assert.match(source, /trilhas\?:/u);
  assert.match(source, /aulas: TrilhaAula\[\]/u);
  assert.match(source, /assessment:\s*\{/u);
  assert.match(source, /practice:\s*\{/u);
});
```
Run `node --test scripts/application/admin-workspace-trilha-nesting.test.mjs` — must
pass (this is a type-shape smoke test, not exhaustive — the live RPC call in Step 4 is
the real verification for the SQL side). Run `npm run typecheck:web` — must be clean.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260724010000_path_template_position_and_workspace_nesting.sql apps/web/lib/admin/product-management.ts scripts/application/admin-workspace-trilha-nesting.test.mjs
git commit -m "feat(admin): return nested trilhas/aulas/assessment/practice from the workspace read RPC"
```

---

## Task 2: `path_template` resource type — trilha metadata CRUD

**Files:**
- Create: `supabase/migrations/20260724010100_path_template_resource_type.sql`

**Interfaces:**
- Consumes: nothing new.
- Produces: `save_admin_product_resource(p_resource_type='path_template', p_payload={
  journey_version_id, path_template_id?, name, description?, position?, is_default? })`
  → `{ journey_version_id, path_template_id }`. Later tasks (Task 5's builder UI) call
  this to create/edit/reorder a trilha independent of adding an aula to it.

- [ ] **Step 1: Pull the live `save_admin_product_resource` body**

```sql
select pg_get_functiondef(oid) from pg_proc where proname='save_admin_product_resource';
```
Use as the base for `create or replace`. Every existing branch (`journey`/`activity`/
`path_step`/`rule`/`diagnostic`/`point_rule`/`badge`/`certificate`) is copied verbatim.

- [ ] **Step 2: Add the `path_template` permission bucket and branch**

In the `v_permission:=case ... end` block, add `path_template` to the existing
`journey.definition.manage` bucket:
```sql
when p_resource_type in('journey','activity','path_step','rule','path_template') then 'journey.definition.manage'
```

Add a new branch (position it after the existing `path_step` branch, before `rule`):

```sql
  elsif p_resource_type='path_template' then
    v_path_id:=nullif(p_payload->>'path_template_id','')::uuid;
    if v_path_id is null then
      insert into orchestration.path_templates(id,journey_version_id,code,name,description,is_default,status,position)
      select gen_random_uuid(),jv.id,v_code,btrim(p_payload->>'name'),nullif(btrim(p_payload->>'description'),''),
        coalesce((p_payload->>'is_default')::boolean,false),'draft',coalesce((p_payload->>'position')::integer,0)
      from catalog.journey_versions jv join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
      where jv.id=(p_payload->>'journey_version_id')::uuid and jv.status='draft' and jd.owner_organization_id=p_organization_id
      returning id into v_path_id;
      if v_path_id is null then raise exception 'JOURNEY_DRAFT_NOT_FOUND' using errcode='P0002'; end if;
    else
      update orchestration.path_templates set
        name=btrim(p_payload->>'name'),
        description=nullif(btrim(p_payload->>'description'),''),
        position=coalesce((p_payload->>'position')::integer,position),
        is_default=coalesce((p_payload->>'is_default')::boolean,is_default)
      where id=v_path_id
        and journey_version_id in (select jv.id from catalog.journey_versions jv join catalog.journey_definitions jd on jd.id=jv.journey_definition_id where jd.owner_organization_id=p_organization_id);
      if not found then raise exception 'PATH_TEMPLATE_NOT_FOUND' using errcode='P0002'; end if;
    end if;
    v_result:=jsonb_build_object('journey_version_id',coalesce((p_payload->>'journey_version_id')::uuid,(select journey_version_id from orchestration.path_templates where id=v_path_id)),'path_template_id',v_path_id);
    v_subject_id:=v_path_id;
```

`v_path_id` is already declared (reused from the existing `path_step` branch). No new
`declare` entries needed for this task.

Apply via `mcp__supabase__apply_migration` name `path_template_resource_type`.

- [ ] **Step 2: Verify live — 4 cases**

Using an operator with `journey.definition.manage` in org
`427d7ce5-c341-54cf-a3a2-c2936e4a0a27` and the existing draft-capable journey version
(create a fresh draft journey version via the existing `journey` resource type if none
is available — do not reuse a `published` version, the trilha insert requires
`jv.status='draft'`):
1. Create a new trilha with `name`/`description`/`position=1` — confirm the row exists
   with those exact values.
2. Create a second trilha with `position=2` on the same journey version.
3. Edit the first trilha's `name`/`position` (swap to `position=2`, second trilha to
   `position=1`) — confirm both rows reflect the swap.
4. Attempt to edit a trilha under a DIFFERENT organization's actor (or a fabricated
   `path_template_id` not belonging to any journey this org owns) — confirm
   `PATH_TEMPLATE_NOT_FOUND` is raised, not a silent no-op or cross-org leak.

Clean up any throwaway journey/trilha rows created purely for this verification if the
tables allow it (`catalog.journey_versions`/`orchestration.path_templates` are not
append-only — confirm via `information_schema.triggers` before assuming, matching the
discipline established in Frente 3+4 Task 7's cleanup).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260724010100_path_template_resource_type.sql
git commit -m "feat(admin): add path_template resource type for trilha metadata CRUD"
```

---

## Task 3: Assessment payload on the `activity` branch — per-aula quiz

**Files:**
- Create: `supabase/migrations/20260724010200_activity_assessment_payload.sql`

**Interfaces:**
- Consumes: nothing new.
- Produces: `save_admin_product_resource(p_resource_type='activity', p_payload={...,
  assessment?: { passing_score?, max_attempts?, questions: [{ code, prompt, points?,
  position?, options: [{ code, label, is_correct, position? }] }] } })`. When
  `p_payload.assessment` is present, the activity's `assessment.assessment_specs` row
  and all its `questions`/`answer_options` are rebuilt (existing questions/options
  deleted and reinserted) — same pattern as Frente 3+4 Task 2's diagnostic child rebuild.
  This is independent of `activity_type` — any activity can carry an assessment.

- [ ] **Step 1: Confirm the immutability guard shape**

```sql
select pg_get_functiondef(p.oid) from pg_proc p
where p.proname='e14_reject_published_assessment_child';
```
Confirm it raises when the parent `activity_versions.status='published'` (mirroring
`e14_reject_published_diagnostic_child` from Frente 3+4 Task 2) — this determines that
the rebuild-on-edit below must run while the activity_version is still `'draft'`,
exactly like Task 2's diagnostic children.

- [ ] **Step 2: Pull the live `save_admin_product_resource` body and add the assessment block**

Pull `pg_get_functiondef` fresh (Task 2 will have already changed this function; use
whatever is live at the time this task executes, not this plan's earlier snippet).

Add three declare entries: `v_assessment_spec_id uuid;`, `v_question_id uuid;` — reuse
the existing `v_item jsonb;`/`v_option jsonb;` loop variables (already declared, used by
the `diagnostic` branch).

In the `activity` branch, immediately after the existing practice-spec block
(`if btrim(p_payload->>'activity_type')='practice' and ... on conflict(activity_version_id) do update ...`),
add:

```sql
    if p_payload?'assessment' and jsonb_typeof(p_payload->'assessment')='object' then
      insert into assessment.assessment_specs(id,activity_version_id,grading_mode,passing_score,max_attempts,time_limit_seconds,randomization_policy,feedback_policy)
      values(gen_random_uuid(),v_activity_version_id,'auto',
        nullif(p_payload#>>'{assessment,passing_score}','')::numeric,
        nullif(p_payload#>>'{assessment,max_attempts}','')::integer,
        null,'{}'::jsonb,'{}'::jsonb)
      on conflict(activity_version_id) do update set
        passing_score=excluded.passing_score,
        max_attempts=excluded.max_attempts
      returning id into v_assessment_spec_id;
      delete from assessment.answer_options where question_id in (select id from assessment.questions where activity_version_id=v_activity_version_id);
      delete from assessment.questions where activity_version_id=v_activity_version_id;
      for v_item in select value from jsonb_array_elements(coalesce(p_payload#>'{assessment,questions}','[]'::jsonb)) loop
        insert into assessment.questions(id,activity_version_id,code,question_type,prompt,points,position,configuration)
        values(gen_random_uuid(),v_activity_version_id,lower(btrim(v_item->>'code')),
          coalesce(nullif(v_item->>'question_type',''),'single_choice'),
          btrim(v_item->>'prompt'),coalesce((v_item->>'points')::numeric,1),
          coalesce((v_item->>'position')::integer,1),'{}'::jsonb)
        returning id into v_question_id;
        for v_option in select value from jsonb_array_elements(coalesce(v_item->'options','[]'::jsonb)) loop
          insert into assessment.answer_options(id,question_id,code,label,value,is_correct,position)
          values(gen_random_uuid(),v_question_id,lower(btrim(v_option->>'code')),btrim(v_option->>'label'),
            '{}'::jsonb,coalesce((v_option->>'is_correct')::boolean,false),coalesce((v_option->>'position')::integer,1));
        end loop;
      end loop;
    end if;
```

This must run while `v_activity_version_id`'s row is still `status='draft'` — confirm
the existing `activity` branch's insert/update sequence already keeps the row draft
until a separate publish step (mirroring the diagnostic branch's deferred-publish
pattern); if the `activity` branch currently has no separate draft/publish distinction
at all (check the live pulled body from Step 2), note this as a `DONE_WITH_CONCERNS` for
the controller rather than silently publishing prematurely — do not invent a publish
flip that the existing branch doesn't already have.

`assessment.assessment_specs.activity_version_id` is confirmed to be the table's PRIMARY
KEY (verified live in this session), so `on conflict(activity_version_id)` is valid.

Apply via `mcp__supabase__apply_migration` name `activity_assessment_payload`.

- [ ] **Step 3: Verify live**

Create a throwaway draft activity (any `activity_type`, e.g. `content`) and save it with
an `assessment` payload containing 2 questions, one with 2 options (one `is_correct`),
one with 4 options (one `is_correct`). Confirm via `execute_sql`:
- `assessment.assessment_specs` has exactly 1 row for this `activity_version_id`.
- `assessment.questions` has exactly 2 rows, correct `prompt`/`position`.
- `assessment.answer_options` totals exactly 6 rows (2+4) with exactly one
  `is_correct=true` per question.

Re-save the same activity with a *different* set of questions (1 question, 3 options).
Confirm the old 2 questions/6 options are gone and only the new 1 question/3 options
remain (proves rebuild-on-edit, not append). Confirm saving an activity WITHOUT an
`assessment` key leaves any pre-existing `assessment_specs`/`questions`/`answer_options`
untouched (proves this is opt-in per save, not a destructive default).

Clean up the throwaway activity if the tables allow it (not append-only — confirm via
`information_schema.triggers` on `assessment.assessment_specs`, which only blocks
mutation once the parent activity_version is *published*, per Step 1 — a `draft`
throwaway should be fully deletable).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260724010200_activity_assessment_payload.sql
git commit -m "feat(admin): let any activity carry an admin-editable quiz (assessment_specs/questions/answer_options)"
```

---

## Task 4: Path-scoped (trilha) credential wiring

**Files:**
- Create: `supabase/migrations/20260724010300_path_scoped_credentials.sql`

**Interfaces:**
- Consumes: `orchestration.path_steps.path_template_id` (existing column),
  `orchestration.path_assignments.status` (existing, flipped to `'completed'` by the
  existing `app_private.e14_complete_path_state`, called automatically inside the E14
  runtime's step-completion state machine — confirmed live in this session, no app-layer
  change needed to trigger it).
- Produces: `app_private.credential_rule_matches(...)` gains a `'path'` scope case;
  `app_private.learning_credential_context(...)` returns three new keys when
  `p_step_instance_id` is given: `path_assignment_id`, `path_template_id`,
  `path_completed` (boolean), `path_required_steps_completed` (boolean),
  `path_required_assessments_passed` (boolean); `app_private.learning_badge_candidates`
  gains a third loop matching `'path'`-scoped badges when `path_completed` is true. A
  `rule_versions` row with `language='credential-v1'`, `expression={"scope":"path",
  "path_template_id":"<uuid>","requires_completed_status":true}` referenced by a
  `badge_versions.criteria_rule_version_id` is how Task 5/6's builder attaches a Selo to
  a trilha's 100%-completion event. This whole task is purely additive — the existing
  `'journey'`/`'activity'` scopes and their callers are never modified.

- [ ] **Step 1: Pull all three live function bodies**

```sql
select pg_get_functiondef(oid) from pg_proc where proname='credential_rule_matches';
select pg_get_functiondef(oid) from pg_proc where proname='learning_credential_context';
select pg_get_functiondef(oid) from pg_proc where proname='learning_badge_candidates';
```
Confirm they match what's quoted in this task (this session pulled them fresh
immediately before writing this plan) — if they've drifted, use the live versions as
the base for the `create or replace` below instead of this plan's text.

- [ ] **Step 2: Add the `'path'` case to `credential_rule_matches`**

Add one more `when` arm to the existing `case p_scope ... end` inside the function
(alongside the existing `'journey'`/`'activity'` arms), and add two new parameters,
`p_path_template_id uuid default null` and `p_path_required_steps_completed boolean
default true` (default `true` so existing callers that don't pass it are unaffected):

```sql
create or replace function app_private.credential_rule_matches(
  p_rule_version_id uuid, p_scope text, p_journey_version_id uuid,
  p_activity_version_id uuid, p_completed boolean,
  p_required_steps_completed boolean, p_assessments_passed boolean,
  p_path_template_id uuid default null
) returns boolean language sql stable as $$
  select exists (
    select 1 from orchestration.rule_versions rv
    where rv.id=p_rule_version_id and rv.status='published'
      and rv.language='credential-v1'
      and rv.expression->>'scope'=p_scope
      and case p_scope
        when 'journey' then rv.expression->>'journey_version_id'=p_journey_version_id::text
        when 'activity' then rv.expression->>'activity_version_id'=p_activity_version_id::text
        when 'path' then rv.expression->>'path_template_id'=p_path_template_id::text
        else false end
      and case lower(coalesce(rv.expression->>'requires_completed_status','true'))
        when 'true' then p_completed when 'false' then true else false end
      and case lower(coalesce(rv.expression->>'requires_required_steps_completed','false'))
        when 'true' then p_required_steps_completed when 'false' then true else false end
      and case lower(coalesce(rv.expression->>'requires_passed_assessment','true'))
        when 'true' then p_assessments_passed when 'false' then true else false end
  );
$$;
```

Every existing call site (`'journey'` and `'activity'` scopes, in `learning_badge_
candidates`/`learning_certificate_candidates`) omits the new trailing parameter and
keeps working unchanged (it defaults to `null`, never read by the `'journey'`/`'activity'`
branches of the `case`).

- [ ] **Step 3: Extend `learning_credential_context`**

Add to the `declare` block: `v_path_assignment_id uuid;`, `v_path_template_id uuid;`,
`v_path_completed boolean:=false;`, `v_path_required_total integer:=0;`,
`v_path_required_completed integer:=0;`, `v_path_required_assessments_passed
boolean:=false;`.

Extend the existing `if p_step_instance_id is not null then ... end if;` block's query
to also select `pa.id`, `pa.status='completed'`, and `ps.path_template_id` (the existing
query already joins `path_assignments pa` and `path_steps` is implied via `si.path_step_
id` — confirm the exact join shape from the live pull in Step 1 and extend it rather
than assume; the version read in this session, quoted for reference, was:

```sql
select si.activity_version_id,si.status='completed',case
  when asp.activity_version_id is null then true
  else exists(...) end
into v_step_activity_version_id,v_step_completed,v_step_assessment_passed
from orchestration.step_instances si
join orchestration.path_assignments pa on pa.id=si.path_assignment_id
left join assessment.assessment_specs asp on asp.activity_version_id=si.activity_version_id
where si.id=p_step_instance_id and pa.journey_instance_id=p_journey_instance_id;
```

extend to also join `orchestration.path_steps ps on ps.id=si.path_step_id` and select
`pa.id,pa.status='completed',ps.path_template_id` into
`v_path_assignment_id,v_path_completed,v_path_template_id`).

Immediately after that block (still inside the `if p_step_instance_id is not null`
guard), when `v_path_completed` is true, compute the path-scoped completion ratio with a
query scoped to `pa.id=v_path_assignment_id` (not the whole journey_instance):

```sql
  if v_path_completed then
    select count(*) filter(where ps2.is_required),
      count(*) filter(where ps2.is_required and si2.status='completed'),
      coalesce(bool_and(case
        when ps2.is_required and asp2.activity_version_id is not null then exists(
          select 1 from assessment.attempts a2
          join assessment.results r2 on r2.attempt_id=a2.id
          where a2.step_instance_id=si2.id and r2.passed
        ) else true end),true)
    into v_path_required_total,v_path_required_completed,v_path_required_assessments_passed
    from orchestration.step_instances si2
    join orchestration.path_steps ps2 on ps2.id=si2.path_step_id
    left join assessment.assessment_specs asp2 on asp2.activity_version_id=si2.activity_version_id
    where si2.path_assignment_id=v_path_assignment_id;
  end if;
```

Add to the final `jsonb_build_object(...)` return: `'path_assignment_id',
v_path_assignment_id,'path_template_id',v_path_template_id,'path_completed',
v_path_completed,'path_required_steps_completed',(v_path_required_total>0 and
v_path_required_completed=v_path_required_total),'path_required_assessments_passed',
v_path_required_assessments_passed`.

- [ ] **Step 4: Add the path-scoped loop to `learning_badge_candidates`**

After the existing `if p_context->>'journey_status'='completed' then ... end if;` block,
add:

```sql
  if (p_context->>'path_completed')::boolean is true then
    for v_record in
      select bv.id,bv.title,bv.description,bv.criteria_rule_version_id
      from engagement.badge_versions bv
      join engagement.badge_definitions bd on bd.id=bv.badge_definition_id
      where bv.status='published' and bd.status='active'
        and app_private.credential_rule_matches(
          bv.criteria_rule_version_id,'path',v_journey_version_id,null,true,
          (p_context->>'path_required_steps_completed')::boolean,
          (p_context->>'path_required_assessments_passed')::boolean,
          (p_context->>'path_template_id')::uuid
        )
      order by bv.id
    loop
      v_award_id:=app_private.e14_deterministic_uuid(
        'badge-award:'||v_entrepreneur_id::text||':'||v_journey_instance_id::text||':'||v_record.id::text
      );
      v_badges:=v_badges||jsonb_build_array(jsonb_build_object(
        'award_id',v_award_id,'badge_version_id',v_record.id,'title',v_record.title,
        'description',v_record.description,'scope','path',
        'path_template_id',p_context->>'path_template_id',
        'rule_version_id',v_record.criteria_rule_version_id
      ));
    end loop;
  end if;
```

Apply Steps 2-4 as one migration via `mcp__supabase__apply_migration` name
`path_scoped_credentials`.

- [ ] **Step 5: Verify live — additive, no regression**

1. Re-run (or newly exercise) an EXISTING journey-scope and activity-scope badge/
   certificate award flow (reuse a fixture from earlier in this session or construct a
   small one) and confirm both still award exactly as before — this proves the new
   parameter/branch didn't change existing behavior.
2. Build a throwaway trilha (path_template) with 2 required steps, a badge with
   `criteria_rule_version_id` pointing at a fresh `rule_versions` row
   (`language='credential-v1'`, `expression={"scope":"path","path_template_id":"<the
   trilha's id>","requires_completed_status":true}`), enroll a real (non-synthetic)
   entrepreneur, complete both steps so the path_assignment naturally transitions to
   `'completed'` via the existing runtime, then call `issue_learning_credentials` (the
   same app-facing entry point already used for journey/activity scopes) with that
   step's `step_instance_id`. Confirm the badge now appears as a candidate (query
   `learning_badge_candidates` directly with the context `learning_credential_context`
   returned) and that `engagement.badge_awards` gets a row after the full
   `issue_learning_credentials` call.
3. Clean up throwaway fixture rows where the tables allow it; if `eventing.events`/
   `diagnostics.responses`-style append-only blockers apply to any row created here
   (badge_awards, path_assignments, step_instances are NOT known to be append-only —
   confirm via `information_schema.triggers` before assuming either way), do not bypass
   governance without the same explicit-authorization discipline used earlier in this
   session — document and leave as accepted residue instead.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260724010300_path_scoped_credentials.sql
git commit -m "feat(engagement): add a path-scoped (trilha) credential match, additive to journey/activity scopes"
```

---

## Task 5: Admin journey builder — Jornada, Acesso, and Trilhas

**Files:**
- Modify: `apps/web/app/admin/produto/page.tsx`
- Modify: `apps/web/app/admin/produto/actions.ts`
- Test: `scripts/application/admin-produto-jornada-builder.test.mjs`

**Interfaces:**
- Consumes: `getAdminProductWorkspace` (now returns `trilhas` per journey version, Task
  1), `saveAdminProductResource({ resourceType: "path_template", payload })` (Task 2).
- Produces: the "Jornada" `<details>` section of `admin/produto/page.tsx` becomes the
  single entry point for creating/editing a jornada, its archetype access, and its list
  of trilhas (add/edit/reorder). The old standalone "Trilha e bloco" section (currently
  used only to create a *new* path_template as a side effect of adding its first path_
  step) is removed — trilha creation moves entirely into this section; aula creation
  moves to Task 6.

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/admin/produto/page.tsx", "utf8");
const actions = await readFile("apps/web/app/admin/produto/actions.ts", "utf8");

test("jornada form lets an admin add and reorder trilhas without typing an id", () => {
  assert.match(page, /Adicionar trilha/u);
  assert.doesNotMatch(page, /path_template_id"\s+placeholder/u);
});

test("jornada form no longer has a standalone Trilha e bloco section for creating trilhas", () => {
  assert.doesNotMatch(page, /Nova trilha<\/option>/u);
});

test("save action forwards trilha fields to the path_template resource type", () => {
  assert.match(actions, /resourceType:\s*"path_template"/u);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/application/admin-produto-jornada-builder.test.mjs`
Expected: FAIL (current page still has a standalone path_template-creating "Trilha e
bloco" section and no "Adicionar trilha" control in the Jornada section).

- [ ] **Step 3: Rebuild the Jornada section**

Read the current "Jornada" `<details>` block in `admin/produto/page.tsx` in full
(covers `program_id`/`definition_id`/`version_id`/`code`/`slug`/`name`/`purpose`/
`title`/`description`/`configuration` fields, plus Task 6 (Frente 3+4)'s archetype
chips fieldset). Keep every existing field and the archetype chips fieldset exactly as
they are. Add, after the archetype chips fieldset and before the "Salvar jornada"
button, a new fieldset:

```tsx
<fieldset className="grid gap-3">
  <legend className="text-sm font-medium text-ink">Trilhas desta jornada</legend>
  {selectedJourneyVersion?.trilhas?.length ? selectedJourneyVersion.trilhas
    .slice()
    .sort((a: Trilha, b: Trilha) => a.position - b.position)
    .map((trilha: Trilha) => (
      <div key={trilha.id} className="rounded-lg border border-border p-3">
        <p className="text-sm font-semibold text-ink">{trilha.position}. {trilha.name}</p>
        {trilha.description ? <p className="text-xs text-muted">{trilha.description}</p> : null}
        <p className="text-xs text-muted">{trilha.aulas.length} aula(s){trilha.badge ? ` · Selo: ${trilha.badge.title}` : ""}</p>
      </div>
    )) : <p className="text-sm text-muted">Nenhuma trilha ainda.</p>}
</fieldset>
<fieldset className="grid gap-3 rounded-lg border border-border p-4">
  <legend className="px-1 text-sm font-semibold text-ink">Adicionar trilha</legend>
  <form action={saveTrilhaAction} className="grid gap-3 sm:grid-cols-2">
    <input type="hidden" name="organization_id" value={organization.organization_id} />
    <input type="hidden" name="journey_version_id" value={String(selectedJourneyVersion?.id ?? "")} />
    <label className="grid gap-1.5 text-sm font-medium text-ink">Nome da trilha<Input name="name" required /></label>
    <label className="grid gap-1.5 text-sm font-medium text-ink">Posição<Input name="position" type="number" min="1" defaultValue={String((selectedJourneyVersion?.trilhas?.length ?? 0) + 1)} required /></label>
    <label className="col-span-full grid gap-1.5 text-sm font-medium text-ink">Descrição<Textarea name="description" rows={2} /></label>
    <Button type="submit" size="sm" className="w-fit">Adicionar trilha</Button>
  </form>
</fieldset>
```

`selectedJourneyVersion` must be resolved the same way Task 5 (Frente 3+4)'s diagnostic
page resolves `selectedVersion` from a `?versao=` query param — add the equivalent here
(a `?jornada=` and `?versao=` pair, or reuse the existing `definition_id`/`version_id`
selects already in this form if they already let an admin load an existing draft; read
the current page to confirm before adding a redundant selector).

Add the `Trilha`/`TrilhaAula` type import from `@/lib/admin/product-management` at the
top of the file.

Remove the old "Trilha e bloco" `<details>` section's trilha-creation half (the
`path_template_id` select's "Nova trilha" option and the fields that only apply to
*creating* a new trilha: `code`, `path_name`, `is_default`). Keep the rest of that
section (selecting an *existing* trilha and adding/editing an aula within it) — this
becomes Task 6's scope; for this task, narrow that section's `path_template_id` select
to only ever reference an already-existing trilha (no more "Nova trilha" option), since
trilha creation now lives exclusively in the Jornada section above.

- [ ] **Step 4: Add `saveTrilhaAction` to `actions.ts`**

```ts
export async function saveTrilhaAction(formData: FormData) {
  const { auth, organizationId } = await authorize(formData);
  const payload = {
    journey_version_id: text(formData, "journey_version_id"),
    name: text(formData, "name"),
    description: nullable(formData, "description"),
    position: Number(text(formData, "position") || 1),
  };
  try {
    await saveAdminProductResource({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId,
      resourceType: "path_template",
      payload,
      idempotencyKey: randomUUID(),
    });
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("FORBIDDEN") ? "sem_permissao" : "falha";
    redirect(`/admin/produto?organization=${organizationId}&erro=${reason}`);
  }
  redirect(`/admin/produto?organization=${organizationId}&sucesso=trilha_salva`);
}
```

`path_template` requires a `code` per `save_admin_product_resource`'s shared `v_code`
validation (`lower(btrim(coalesce(p_payload->>'code','')))` must match
`^[a-z][a-z0-9_-]{1,79}$`) — derive one automatically rather than asking the admin to
type it: `code: text(formData, "name").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "trilha"` added to the payload object above (matches
the low-tech-literacy principle — the admin never sees or types a code).

- [ ] **Step 5: Run test to verify it passes, typecheck**

`node --test scripts/application/admin-produto-jornada-builder.test.mjs` → PASS.
`npm run typecheck:web` → no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/admin/produto/page.tsx apps/web/app/admin/produto/actions.ts scripts/application/admin-produto-jornada-builder.test.mjs
git commit -m "feat(admin): add/reorder trilhas from inside the jornada form, no ids or JSON"
```

---

## Task 6: Admin journey builder — Aulas nested inside each trilha

**Files:**
- Modify: `apps/web/app/admin/produto/page.tsx`
- Modify: `apps/web/app/admin/produto/actions.ts`
- Test: `scripts/application/admin-produto-aula-builder.test.mjs`

**Interfaces:**
- Consumes: `saveAdminProductResource({ resourceType: "activity", payload: {...,
  assessment?} })` (Task 3), `saveAdminProductResource({ resourceType: "path_step",
  payload })` (existing, unchanged), `Trilha`/`TrilhaAula` types (Task 1).
- Produces: within each trilha block from Task 5, an "Aulas" sub-section listing
  existing aulas and an "Adicionar aula" form covering: título, tipo de conteúdo,
  descrição (draft instructional text), prompts (repeatable título+texto group written
  into `activity.configuration.prompts`), and — shown only when the admin checks
  "Esta aula encerra a trilha" — quiz questions (repeatable prompt + up to 4 options,
  marking the correct one) and entrega prática (checklist items, one per line).

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/admin/produto/page.tsx", "utf8");
const actions = await readFile("apps/web/app/admin/produto/actions.ts", "utf8");

test("trilha block offers an intuitive add-aula flow with prompts, quiz, and practice fields", () => {
  assert.match(page, /Adicionar aula/u);
  assert.match(page, /Esta aula encerra a trilha/u);
  assert.match(page, /is_correct/u);
});

test("save action assembles an assessment payload from structured quiz fields", () => {
  assert.match(actions, /assessment:\s*\{/u);
  assert.match(actions, /is_correct:/u);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/application/admin-produto-aula-builder.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Add the Aulas sub-section inside each trilha block**

Extend the trilha block from Task 5 (the `.map((trilha) => ...)` rendering) with a
nested aulas list and an add-aula form, per trilha:

```tsx
<div key={trilha.id} className="rounded-lg border border-border p-3">
  <p className="text-sm font-semibold text-ink">{trilha.position}. {trilha.name}</p>
  <div className="mt-2 grid gap-2">
    {trilha.aulas.map((aula: TrilhaAula) => (
      <p key={aula.step_id} className="text-xs text-ink">
        {aula.position}. {aula.title}
        {aula.assessment ? ` · Quiz (${aula.assessment.questions.length} pergunta(s))` : ""}
        {aula.practice ? " · Entrega prática" : ""}
      </p>
    ))}
  </div>
  <details className="mt-3">
    <summary className="cursor-pointer text-sm font-medium text-primary">Adicionar aula</summary>
    <form action={saveAulaAction} className="mt-3 grid gap-3">
      <input type="hidden" name="organization_id" value={organization.organization_id} />
      <input type="hidden" name="path_template_id" value={trilha.id} />
      <input type="hidden" name="position" value={String(trilha.aulas.length + 1)} />
      <label className="grid gap-1.5 text-sm font-medium text-ink">Título da aula<Input name="title" required /></label>
      <label className="grid gap-1.5 text-sm font-medium text-ink">Descrição (rascunho)<Textarea name="description" rows={4} /></label>
      <fieldset className="grid gap-2 rounded-lg border border-border p-3">
        <legend className="px-1 text-xs font-semibold text-ink">Prompts (opcional)</legend>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="grid gap-1.5 sm:grid-cols-2">
            <Input name={`prompt_title_${i}`} placeholder={`Título do prompt ${i + 1}`} />
            <Textarea name={`prompt_text_${i}`} rows={2} placeholder="Texto do prompt" />
          </div>
        ))}
      </fieldset>
      <label className="flex items-center gap-2.5 text-sm text-ink">
        <input type="checkbox" name="is_closing" value="on" className="size-4 accent-primary" />
        Esta aula encerra a trilha (quiz + entrega prática + Selo)
      </label>
      <fieldset className="grid gap-2 rounded-lg border border-border p-3">
        <legend className="px-1 text-xs font-semibold text-ink">Quiz de encerramento (se marcado acima)</legend>
        {[0, 1, 2, 3, 4].map((q) => (
          <div key={q} className="grid gap-1.5 rounded border border-border p-2">
            <Input name={`quiz_prompt_${q}`} placeholder={`Pergunta ${q + 1}`} />
            <div className="grid gap-1 sm:grid-cols-2">
              {[0, 1, 2, 3].map((o) => (
                <div key={o} className="flex items-center gap-1.5">
                  <input type="radio" name={`quiz_correct_${q}`} value={String(o)} className="size-4 accent-primary" />
                  <Input name={`quiz_option_${q}_${o}`} placeholder={`Alternativa ${o + 1}`} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </fieldset>
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Checklist da entrega prática (uma linha por item, se marcado acima)
        <Textarea name="practice_checklist" rows={4} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-ink">Nome do Selo desta trilha (se marcado acima)<Input name="badge_title" /></label>
      <Button type="submit" size="sm" className="w-fit">Salvar aula</Button>
    </form>
  </details>
</div>
```

- [ ] **Step 4: Add `saveAulaAction` to `actions.ts`**

```ts
function quizQuestionsFromForm(formData: FormData) {
  const questions: Array<{ code: string; prompt: string; position: number; options: Array<{ code: string; label: string; is_correct: boolean; position: number }> }> = [];
  for (let q = 0; q < 5; q += 1) {
    const prompt = text(formData, `quiz_prompt_${q}`);
    if (!prompt) continue;
    const correctIndex = text(formData, `quiz_correct_${q}`);
    const options = [];
    for (let o = 0; o < 4; o += 1) {
      const label = text(formData, `quiz_option_${q}_${o}`);
      if (!label) continue;
      options.push({ code: `opcao_${o + 1}`, label, is_correct: String(o) === correctIndex, position: o + 1 });
    }
    questions.push({ code: `pergunta_${q + 1}`, prompt, position: q + 1, options });
  }
  return questions;
}

export async function saveAulaAction(formData: FormData) {
  const { auth, organizationId } = await authorize(formData);
  const isClosing = checked(formData, "is_closing");
  const prompts = [0, 1, 2, 3, 4, 5]
    .map((i) => ({ title: text(formData, `prompt_title_${i}`), text: text(formData, `prompt_text_${i}`) }))
    .filter((prompt) => prompt.title && prompt.text);
  const checklist = text(formData, "practice_checklist")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const activityPayload: Record<string, unknown> = {
    code: `aula_${randomUUID().slice(0, 8)}`,
    name: text(formData, "title"),
    title: text(formData, "title"),
    description: nullable(formData, "description"),
    activity_type: "content",
    estimated_minutes: 10,
    configuration: prompts.length ? { prompts } : {},
    ...(isClosing && quizQuestionsFromForm(formData).length
      ? { assessment: { questions: quizQuestionsFromForm(formData) } }
      : {}),
    ...(isClosing && checklist.length
      ? { practice: { submission_mode: "file", allowed_evidence_types: ["file", "text"], review_required: true } }
      : {}),
  };

  let activityResult: { definition_id: string; version_id: string };
  try {
    activityResult = await saveAdminProductResource({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId,
      resourceType: "activity",
      payload: activityPayload,
      idempotencyKey: randomUUID(),
    }) as { definition_id: string; version_id: string };

    await saveAdminProductResource({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId,
      resourceType: "path_step",
      payload: {
        path_template_id: text(formData, "path_template_id"),
        step_code: `passo_${text(formData, "position")}`,
        activity_version_id: activityResult.version_id,
        position: Number(text(formData, "position") || 1),
        is_required: true,
      },
      idempotencyKey: randomUUID(),
    });
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("FORBIDDEN") ? "sem_permissao" : "falha";
    redirect(`/admin/produto?organization=${organizationId}&erro=${reason}`);
  }

  redirect(`/admin/produto?organization=${organizationId}&sucesso=aula_salva`);
}
```

The checklist text (`practice_checklist`) is captured for the admin's reference but the
`practice_specs` row created by `save_admin_product_resource`'s existing `activity`
branch does not have a free-text checklist column — store the checklist inside
`activityPayload.configuration.practice_checklist` (an array of strings) alongside
`prompts`, rather than inventing a new column; this keeps the checklist admin-editable
and participant-visible without a schema change. Adjust `configuration` above to:
`configuration: { ...(prompts.length ? { prompts } : {}), ...(checklist.length ? { practice_checklist: checklist } : {}) }`.

Badge/Selo creation (`badge_title`) is deliberately NOT wired in this task's action —
attaching a Selo to a trilha also requires creating the `rule_versions` row from Task
4 and a `badge` resource save, which needs the trilha's final `path_template_id` and is
better handled as a small follow-up once an aula is confirmed to be the closing one;
leave the `badge_title` field collecting input for now and note this explicitly as a
concern in this task's report (`DONE_WITH_CONCERNS`, not silently dropped) so the
controller can decide whether to fold it into this task or spin a fast-follow.

- [ ] **Step 5: Run test to verify it passes, typecheck**

`node --test scripts/application/admin-produto-aula-builder.test.mjs` → PASS.
`npm run typecheck:web` → no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/admin/produto/page.tsx apps/web/app/admin/produto/actions.ts scripts/application/admin-produto-aula-builder.test.mjs
git commit -m "feat(admin): add aulas (content, prompts, closing quiz, practice) inside a trilha, no ids or JSON"
```

---

## Task 7: Seed Trilha 1 — Marketing e Vendas com IA

**Files:**
- None (data-only task, executed via the RPCs built in Tasks 2/3/5/6 — either by
  calling `save_admin_product_resource` directly through `execute_sql`, or by driving
  the actual admin UI from Task 5/6 if it's further along; either is acceptable, but
  the RESULT must be identical: real rows, not a new migration file).
- Create: `.superpowers/sdd/task7-seed-payload.json` (record of exactly what was sent,
  for the report and for Tasks 8/9 to follow the same shape).

**Interfaces:**
- Consumes: `path_template` resource type (Task 2), `activity` resource type with
  `assessment` (Task 3), existing `path_step` resource type.
- Produces: a real trilha "Marketing e Vendas com IA" (`position=1`) under the
  "Capacitação em IA para MEI/ME – Estímulo <> OpenAI" jornada (create the jornada
  itself in this task if it doesn't exist yet — `eligible_archetype_codes=null`, open
  to everyone, per the design spec), with its 4 aulas.

- [ ] **Step 1: Create the jornada (if not already created by an earlier task's testing)**

Check first whether a journey with `code='capacitacao_ia_mei_openai'` already exists
(from Task 5/6's own verification fixtures) — reuse it if so, rather than creating a
duplicate. Otherwise create it via the `journey` resource type: `name="Capacitação em
IA para MEI/ME – Estímulo <> OpenAI"`, `purpose` summarizing the 3-trilha structure,
`eligible_archetype_codes: []` (open to all, per the design spec's decision — nothing
in the source targets a specific archetype).

- [ ] **Step 2: Create the trilha**

Via `path_template` resource type: `name="Marketing e Vendas com IA"`, `position=1`,
`description` = the doc's "Papel desta trilha na jornada" paragraph (§1 of
`trilha-01-marketing-e-vendas-com-ia.docx.md`), verbatim.

- [ ] **Step 3: Seed Aula 1 — Introdução da trilha e caso de uso**

`title="Aula 1 — Introdução da trilha e caso de uso"`. `description` (draft, adapted
from §5's "fala sugerida" lines into direct-address self-service text — drop timing and
stage directions, keep the case-use framing): draft text summarizing the case (empresa
de alimentos que quer atrair mais clientes, precisa postar com mais frequência) and
what the participant will do in the trilha (marketing depois vendas, mesmo caso de uso).
No prompts on this aula (source has none for Aula 1). No assessment on this aula either
— its "Avaliação rápida da aula" (§5, "Qual é o objetivo do caso de uso desta trilha?")
becomes a 1-question `assessment` on THIS aula's activity (not the closing aula) —
every non-closing aula gets its own 1-question assessment via the same `assessment`
payload shape from Task 3, `passing_score` left null/admin-editable (do not invent a
number the source doesn't specify):
```json
{"questions":[{"code":"pergunta_1","prompt":"Qual é o objetivo do caso de uso desta trilha?","position":1,"options":[{"code":"opcao_1","label":"Criar uma mini campanha para atrair clientes e continuar a conversa com um script de vendas.","is_correct":true,"position":1},{"code":"opcao_2","label":"Aprender a editar imagens no computador.","is_correct":false,"position":2},{"code":"opcao_3","label":"Configurar uma conta de anúncios pagos.","is_correct":false,"position":3}]}]}
```
(Wrong-answer options for this and every other seeded question are original — the
source only gives the correct answer text — write plausible, clearly-wrong distractors,
not verbatim source content, and note this in the report.)

- [ ] **Step 4: Seed Aula 2 — Mão na massa: marketing com IA**

`title="Aula 2 — Mão na massa: marketing com IA"`. `description` (draft): summarizes
the 6-microaula sequence (identidade visual, calendário de posts, imagem, legenda,
produto físico, edição). `configuration.prompts`: 6 entries, one per microaula, each
`{title, text}` using the exact prompt blocks from §6 verbatim (microaulas 2.1–2.6).
1-question assessment from §6's "Avaliação rápida da aula" ("Por que usar uma sequência
de prompts em vez de pedir tudo de uma vez?").

- [ ] **Step 5: Seed Aula 3 — Mão na massa: vendas com IA**

Same pattern as Step 4, from §7: `configuration.prompts` = the 3 prompt blocks
(microaulas 3.2, 3.3, 3.5 — 3.1/3.4/3.6 have no prompt, only framing/checklist text,
fold that framing into `description`). 1-question assessment from §7's closing question
("Qual é a função do script de vendas nesta trilha?").

- [ ] **Step 6: Seed Aula 4 — Fechamento e avaliação (closing aula)**

`title="Aula 4 — Fechamento e avaliação"`. `description`: the §8 closing "fala
sugerida," adapted. `assessment`: the 5 questions from §8's "Avaliação final da trilha,"
verbatim prompts + correct answers, original plausible distractors for the wrong
options (same caveat as Step 3). `practice_checklist` (in `configuration`, per Task 6):
the 9 items from §8's "Checklist da entrega prática," verbatim.

After saving this aula's activity, create the Selo: `badge` resource type,
`title="Selo Marketing e Vendas com IA"`, `description` = a short line describing what
it recognizes (adapt from the doc's framing, not verbatim since the doc has no badge
description text). Then create the `rule_versions` row (`language='credential-v1'`,
`expression={"scope":"path","path_template_id":"<this trilha's id>",
"requires_completed_status":true}`) and update the badge to reference it as
`criteria_rule_version_id` (via the `badge` resource type's existing update path, or a
direct `execute_sql` if the `badge` resource type doesn't yet expose
`criteria_rule_version_id` as an editable field — check the live `save_admin_product_
resource` `badge` branch first; if it's missing, note this as a concern rather than
silently working around it with a raw UPDATE outside the RPC).

- [ ] **Step 7: Verify live**

Call `get_admin_product_workspace` and confirm: the jornada exists with
`eligible_archetype_codes` empty/null; the trilha exists at `position=1` with 4 aulas in
order; aulas 1-3 each have exactly 1 assessment question; aula 4 has exactly 5
assessment questions and a `practice` object; the badge's rule references this exact
trilha's `path_template_id`. Leave everything as real, permanent draft content (do not
publish the journey version yet — publishing is Task 9's concern, after all 3 trilhas
exist, so the jornada never goes live with only 1 of 3 trilhas).

- [ ] **Step 8: Report**

Write `.superpowers/sdd/task7-seed-payload.json` with the exact payloads sent (for
Tasks 8/9 to mirror the shape) and a report noting which text is verbatim-from-source
vs. original draft/distractor content, per this plan's Global Constraints.

---

## Task 8: Seed Trilha 2 — Gestão com IA

**Files:** Same pattern as Task 7 (data-only).

**Interfaces:** Same as Task 7, targeting the same jornada (already created by Task 7 —
reuse its `journey_definition_id`/`version_id`, do not create a second jornada).

- [ ] **Step 1: Create the trilha** — `path_template`, `name="Gestão com IA"`,
  `position=2`, `description` from §1 of `trilha-02-gestao-com-ia.docx.md` verbatim.
- [ ] **Step 2: Seed Aula 1 — Caso de uso: central de gestão com IA** (§5, no prompts,
  1-question assessment from §5's closing question).
- [ ] **Step 3: Seed Aula 2 — Mão na massa: assistente financeiro em Projetos** (§6,
  4 prompts: Projeto de gestão, extração de anotação financeira, centralizar
  comprovantes, análise de gastos; 1-question assessment from §6's closing question).
- [ ] **Step 4: Seed Aula 3 — Mão na massa: checklist operacional** (§7, 3 prompts:
  checklist inicial, adaptar por função, personalizar com contexto; 1-question
  assessment from §7's closing question).
- [ ] **Step 5: Seed Aula 4 — Mão na massa: proposta comercial e contratos** (§8, 3
  prompts: otimizar proposta, modelo de resposta, análise inicial de contrato;
  1-question assessment from §8's closing question).
- [ ] **Step 6: Seed Aula 5 — Fechamento e avaliação (closing aula)** — 5-question
  assessment from §9's "Avaliação final da trilha," 10-item practice checklist from
  §9's "Checklist da entrega prática," Selo "Selo Gestão com IA" wired to a
  `credential-v1` `'path'` rule for this trilha, same pattern as Task 7 Step 6.
- [ ] **Step 7: Verify live** — same checks as Task 7 Step 7, scoped to this trilha
  (position=2, 5 aulas, 4×1-question + 1×5-question assessments, badge rule references
  this trilha's id).
- [ ] **Step 8: Report** — append to `.superpowers/sdd/task7-seed-payload.json`'s sibling
  or a new `task8-seed-payload.json`, same verbatim-vs-draft disclosure as Task 7.

---

## Task 9: Seed Trilha 3 — Desenvolvimento Avançado com Codex, then publish

**Files:** Same pattern as Tasks 7/8 (data-only), plus the jornada's publish step.

**Interfaces:** Same as Tasks 7/8, targeting the same jornada.

- [ ] **Step 1: Create the trilha** — `path_template`, `name="Desenvolvimento Avançado
  com Codex"`, `position=3`, `description` from §1 of
  `trilha-03-desenvolvimento-avancado-com-codex.docx.md` verbatim.
- [ ] **Step 2: Seed Aula 1 — O que é o Codex: agente de desenvolvimento e instalação**
  (§5; this aula's content includes the terminal install commands verbatim as a
  distinct prompt-like block even though the source doesn't call it a "Prompt" — treat
  the shell command block as one `configuration.prompts` entry titled "Instalação via
  terminal (alternativa)"; 1-question assessment from §5's closing question).
- [ ] **Step 3: Seed Aula 2 — Caso de uso: do pedido ao projeto** (§6, 1 prompt: definir
  escopo mínimo; **no "Avaliação rápida da aula" in the source for this aula** — leave
  this aula without an `assessment` payload, do not invent a question the source
  doesn't have).
- [ ] **Step 4: Seed Aula 3 — Mão na massa: criar um site com Codex** (§7, 3 prompts:
  briefing do site, preview local, ajustes; 1-question assessment from §7's closing
  question).
- [ ] **Step 5: Seed Aula 4 — Mão na massa: criar uma proposta com Codex** (§8, 2
  prompts: criar proposta, melhorar versão; **no "Avaliação rápida da aula" in the
  source for this aula either** — no assessment payload, same reasoning as Step 3).
- [ ] **Step 6: Seed Aula 5 — Mão na massa: criar sistema com formulário** (§9, 3
  prompts: definir campos, implementar, testar fluxo, refinar — source lists 4 prompt
  blocks total across "definir campos/implementar/testar/refinar", include all 4;
  1-question assessment from §9's closing question).
- [ ] **Step 7: Seed Aula 6 — Publicação, link compartilhável e fechamento (closing
  aula)** — 5-question assessment from §12's "Avaliação final da trilha," 10-item
  practice checklist from §11's "Checklist da entrega prática" (note: this document's
  checklist section appears BEFORE the final-assessment section, unlike Trilhas 1/2 —
  read the whole document's section order before assembling, don't assume identical
  structure), Selo "Selo Desenvolvimento Avançado com Codex" wired the same way as
  Tasks 7/8.
- [ ] **Step 8: Verify live** — same checks as Tasks 7/8 Step 7, scoped to this trilha
  (position=3, 6 aulas, 4 aulas with 1-question assessments, 2 aulas with none, 1 aula
  with the 5-question closing assessment).
- [ ] **Step 9: Publish the jornada**

Once all 3 trilhas and their 15 aulas exist and are verified, publish the jornada
version via the existing `journey` resource type's status flip (same publish
convention as every other resource type in this codebase — check whether `journey`
currently supports a `status: 'published'` payload key at all; if it doesn't yet (the
live `save_admin_product_resource` journey branch pulled in this session's earlier
research had no status handling, always inserting/updating as an implicit `'draft'`
row with no publish path), this is a real gap to flag — do not invent a publish
mechanism inline in this data-seeding task; report it as a concern and leave the
jornada in `draft` with a `DONE_WITH_CONCERNS` status rather than hand-rolling an
ad hoc `UPDATE ... SET status='published'` outside the RPC.

- [ ] **Step 10: Report** — `task9-seed-payload.json`, same disclosure conventions, plus
  an explicit summary table of the full jornada (3 trilhas × aulas × assessment
  question counts × badges) for the controller to sanity-check against the 3 source
  documents.

---

## Task 10: Terminology fix — participant catalog page (trilha → jornada)

**Files:**
- Modify: `apps/web/app/empreendedor/trilhas/page.tsx` → rename to
  `apps/web/app/empreendedor/jornadas/page.tsx`
- Modify: `apps/web/app/actions/enrollment.ts` (only copy/redirect strings, if any
  reference "trilha")
- Modify: `apps/web/app/empreendedor/page.tsx` (update the link added in Frente 3+4
  Task 8)
- Test: `scripts/application/participant-trilhas-catalog.test.mjs` → rename to
  `scripts/application/participant-jornadas-catalog.test.mjs`, updated assertions

**Interfaces:**
- Consumes: `journeyRuntime.listEligibleJourneys`, `journeyRuntime.selfEnroll`
  (unchanged, Frente 3+4 Task 7).
- Produces: route `/empreendedor/jornadas` (was `/empreendedor/trilhas`), all
  participant-facing copy on this page and its entry link updated from "trilha" to
  "jornada" wording. No behavior change — this is a rename/relabel only.

- [ ] **Step 1: Move the page file**

```bash
mkdir -p apps/web/app/empreendedor/jornadas
git mv apps/web/app/empreendedor/trilhas/page.tsx apps/web/app/empreendedor/jornadas/page.tsx
```

- [ ] **Step 2: Update copy inside the moved file**

Replace: `"Trilhas disponíveis"` → `"Jornadas disponíveis"`; `"Escolha uma trilha para
começar. Você pode entrar em mais de uma."` → `"Escolha uma jornada para começar. Você
pode entrar em mais de uma."`; `"Não foi possível entrar nesta trilha"` → `"Não foi
possível entrar nesta jornada"`; `"Nenhuma trilha disponível agora"` → `"Nenhuma
jornada disponível agora"`; `"Novas trilhas aparecem aqui assim que forem publicadas."`
→ `"Novas jornadas aparecem aqui assim que forem publicadas."`; `"Trilhas para o seu
perfil"` → `"Jornadas para o seu perfil"`; `"Trilhas abertas para todos"` → `"Jornadas
abertas para todos"`; `"Entrar nesta trilha"` → `"Entrar nesta jornada"`. Rename the
`JourneyGrid` component's usage comment/props only if they mention "trilha" in a
user-facing string (the component/type names themselves — `EligibleJourney`,
`JourneyGrid` — already correctly say "journey", leave them as-is).

- [ ] **Step 3: Update the redirect path in `enrollment.ts`**

Change `redirect("/empreendedor/trilhas?erro=matricula")` to
`redirect("/empreendedor/jornadas?erro=matricula")`. The success redirect
(`/empreendedor?matricula=criada`) is unaffected.

- [ ] **Step 4: Update the Home link**

In `apps/web/app/empreendedor/page.tsx`, change the Frente 3+4 Task 8 link:
```tsx
<Link href="/empreendedor/jornadas" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">
  Ver todas as jornadas disponíveis
</Link>
```

- [ ] **Step 5: Move and update the test file**

```bash
git mv scripts/application/participant-trilhas-catalog.test.mjs scripts/application/participant-jornadas-catalog.test.mjs
```
Update its file paths and copy assertions to match:
```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/empreendedor/jornadas/page.tsx", "utf8");
const home = await readFile("apps/web/app/empreendedor/page.tsx", "utf8");
const actions = await readFile("apps/web/app/actions/enrollment.ts", "utf8");

test("jornadas catalog page fetches eligible journeys and offers a self-enroll action", () => {
  assert.match(page, /listEligibleJourneys/u);
  assert.match(page, /selfEnrollAction|selfEnroll/u);
  assert.match(page, /Entrar nesta jornada/u);
});

test("jornadas catalog separates archetype-matched jornadas from open-to-all jornadas", () => {
  assert.match(page, /open_to_all/u);
});

test("participant home links to the jornadas catalog", () => {
  assert.match(home, /\/empreendedor\/jornadas/u);
});

test("self-enroll server action requires authentication and calls journeyRuntime.selfEnroll", () => {
  assert.match(actions, /getAuthContext/u);
  assert.match(actions, /selfEnroll/u);
});
```

- [ ] **Step 6: Run test to verify it passes, typecheck**

`node --test scripts/application/participant-jornadas-catalog.test.mjs` → PASS.
`npm run typecheck:web` → no errors. Confirm no remaining reference to the old
`/empreendedor/trilhas` route anywhere: `grep -rn "empreendedor/trilhas" apps/web` →
no results.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/empreendedor/jornadas apps/web/app/actions/enrollment.ts apps/web/app/empreendedor/page.tsx scripts/application/participant-jornadas-catalog.test.mjs
git rm apps/web/app/empreendedor/trilhas/page.tsx scripts/application/participant-trilhas-catalog.test.mjs 2>/dev/null || true
git commit -m "fix(participant): rename trilha catalog to jornadas, matching the jornada/trilha/aula vocabulary"
```

---

## Task 11: Frente 5 — Home reorganization and trilha-unlock banner

**Files:**
- Modify: `apps/web/app/empreendedor/page.tsx`
- Modify: `apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx`
- Test: `scripts/application/participant-home-and-unlock-banner.test.mjs`

**Interfaces:**
- Consumes: existing `journeyRuntime.getParticipantExperience`/
  `getParticipantJourneyOutline` (unchanged).
- Produces: Home's section order becomes: menu → "Continue de onde parou" (unchanged
  card, omitted if none) → carrossel de anúncios → grid de jornadas disponíveis para o
  arquétipo (reuses `listEligibleJourneys`, same as the `/jornadas` catalog but inline,
  capped to a few cards with a "Ver todas" link to `/empreendedor/jornadas`) → prévia de
  recompensas (1 line). The jornada-instance detail page gains a persistent banner
  "100% libera selo e certificado" with a progress bar, per the Frente 5 spec's "Trilha
  (detalhe)" section (companion doc §Trilha detalhe).

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const home = await readFile("apps/web/app/empreendedor/page.tsx", "utf8");
const detail = await readFile("apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx", "utf8");

test("home shows an inline eligible-jornadas grid before the rewards preview", () => {
  assert.match(home, /listEligibleJourneys/u);
  assert.match(home, /Ver todas as jornadas/u);
});

test("jornada detail page shows a persistent unlock banner", () => {
  assert.match(detail, /libera selo e certificado/u);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/application/participant-home-and-unlock-banner.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Add the inline jornadas grid to Home**

Read the current `apps/web/app/empreendedor/page.tsx` in full (already read once this
session: fetches `listParticipantJourneys`/`credentialRuntime.listParticipant`/
`engagementRuntime.participantHub` via `Promise.all`). Add
`journeyRuntime.listEligibleJourneys(auth.identity.user_account_id).catch(() => [])` to
that same `Promise.all`. After the existing "Outras jornadas" section (or replacing it,
if that section already only shows already-assigned journeys per the Frente 5 spec's
correction note — read the current section before deciding) and before the rewards
preview, render up to 3 eligible-and-not-yet-enrolled jornadas as compact cards, each
with a "Ver todas as jornadas disponíveis" link to `/empreendedor/jornadas` (reuses
Task 10's route) shown once, after the grid — do not duplicate the full `/jornadas`
catalog UI, this is a preview only.

- [ ] **Step 4: Add the unlock banner to the jornada detail page**

Read `apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx` in full. It
already renders the accordion-of-modules progress UI (per the Frente 5 spec's
correction note: "já implementada... com barra de progresso por módulo"). Add, directly
below the page's header (name/description/overall progress) and above the accordion,
a persistent `<Card>` or banner:
```tsx
<Card className="border-primary/30 bg-primary/5">
  <p className="text-sm font-semibold text-ink">100% da trilha libera selo e certificado</p>
  <div className="mt-2 h-2 rounded-full bg-surface-muted">
    <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round(overallProgress * 100)}%` }} />
  </div>
</Card>
```
using whatever variable this page already computes for overall completion ratio
(confirm the exact variable name from the file rather than assuming `overallProgress`).

- [ ] **Step 5: Run test to verify it passes, typecheck**

`node --test scripts/application/participant-home-and-unlock-banner.test.mjs` → PASS.
`npm run typecheck:web` → no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/empreendedor/page.tsx apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx scripts/application/participant-home-and-unlock-banner.test.mjs
git commit -m "feat(participant): show an eligible-jornadas preview on Home and a persistent unlock banner on jornada detail"
```

---

## Task 12: Frente 5 — Engajamento hub

**Files:**
- Create: `apps/web/app/empreendedor/engajamento/page.tsx`
- Modify: `apps/web/components/participant-shell.tsx` (or wherever the top nav menu
  items are defined — replace the 3 separate items with 1)
- Test: `scripts/application/participant-engagement-hub.test.mjs`

**Interfaces:**
- Consumes: existing `engagementRuntime` calls already used by the 3 screens being
  consolidated (Pontuação/Conquistas/Entregas) — read each of those 3 existing pages
  first to find their exact data-fetching calls; reuse them verbatim inside the new hub,
  do not re-derive.
- Produces: one route (`/empreendedor/engajamento`) with 5 sections: Conquistas
  (selos/certificados obtidos), O que você pode ganhar (conquistas disponíveis, não
  obtidas), Histórico de pontuação (extrato), Ranking (posição + lista), Entregas
  (submissões por trilha com status de revisão). Top nav's 3 existing separate items
  become 1 ("Engajamento").

- [ ] **Step 1: Locate the 3 existing screens and their data calls**

Find the current Pontuação/Conquistas/Entregas pages (likely under
`apps/web/app/empreendedor/pontuacao/`, `.../conquistas/`, `.../entregas/` — confirmed
present in this session's git status as untracked directories). Read each in full to
extract: the exact `engagementRuntime`/other runtime calls each makes, and the exact
JSX each uses to render its list (badges grid, point ledger table, submissions list).

- [ ] **Step 2: Write the failing test**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/empreendedor/engajamento/page.tsx", "utf8");

test("engagement hub has all five sections", () => {
  assert.match(page, /Conquistas/u);
  assert.match(page, /pode ganhar/u);
  assert.match(page, /pontuação/iu);
  assert.match(page, /[Rr]anking/u);
  assert.match(page, /Entregas/u);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test scripts/application/participant-engagement-hub.test.mjs`
Expected: FAIL (file doesn't exist).

- [ ] **Step 4: Build the hub page**

Compose the 5 sections into one page, each as a `<section>` with its own heading,
reusing the exact data-fetching and rendering logic found in Step 1's 3 source pages
(via `Promise.all`, matching the existing `apps/web/app/empreendedor/page.tsx`
concurrency pattern). "O que você pode ganhar" is new content, not present in any of
the 3 existing pages — derive it from whatever `engagementRuntime` call already returns
the full badge catalog (check `engagementRuntime.participantHub` or a dedicated
badges-list call; if no such call exists yet, this is a real gap — report it as a
concern rather than fabricating badge data client-side).

- [ ] **Step 5: Update the top nav**

In the nav-item list (`apps/web/components/participant-shell.tsx` or equivalent),
remove the 3 separate entries for Pontuação/Conquistas/Entregas and add 1 entry
"Engajamento" pointing at `/empreendedor/engajamento`.

- [ ] **Step 6: Run test to verify it passes, typecheck**

`node --test scripts/application/participant-engagement-hub.test.mjs` → PASS.
`npm run typecheck:web` → no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/empreendedor/engajamento apps/web/components/participant-shell.tsx scripts/application/participant-engagement-hub.test.mjs
git commit -m "feat(participant): consolidate Pontuação/Conquistas/Entregas into one Engajamento hub"
```

---

## Self-Review

**1. Spec coverage:** OpenAI jornada (Tasks 7-9) ✅. Guided builder — Trilhas (Task 5),
Aulas (Task 6) ✅, badge-attachment left as an explicit Task 6 concern rather than
silently dropped. Terminology fix (Task 10) ✅. Frente 5 Home/unlock banner (Task 11)
and Engajamento hub (Task 12) ✅. Backend prerequisites the builder/content tasks
depend on — `position` column + nested read (Task 1), `path_template` resource type
(Task 2), per-activity assessment (Task 3), path-scoped credentials (Task 4) — all
precede their consumers in task order.

**2. Placeholder scan:** No TBD/TODO. Two spots where a genuine backend gap might exist
(activity branch may have no publish/draft distinction at all — Task 3 Step 2;
`journey` resource type may have no publish mechanism at all — Task 9 Step 9) are
flagged as explicit `DONE_WITH_CONCERNS` triggers for the controller, not silently
papered over or guessed at — this is intentional given neither was confirmed live
during planning, consistent with this plan's Global Constraints on not inventing
mechanisms that don't exist.

**3. Type consistency:** `Trilha`/`TrilhaAula` (Task 1) reused verbatim in Tasks 5/6/11.
`saveTrilhaAction`/`saveAulaAction` names introduced in Tasks 5/6 are consistent with
the existing `saveProductResourceAction` naming convention in the same file.
`credential_rule_matches`'s new trailing parameter (Task 4) defaults to `null` so every
existing call site keeps compiling unchanged — verified against both existing call
sites (`learning_badge_candidates`'s 'journey'/'activity' loops,
`learning_certificate_candidates`'s 'journey' loop) during planning.

**4. Sequencing:** Task 3 (assessment payload) must land before Tasks 7-9 (seeding, which
rely on it) and before Task 6 (builder UI that calls it). Task 4 (path-scoped
credentials) must land before Tasks 7-9's badge-wiring steps. Task 2 (path_template
resource type) must land before Task 5 (builder UI) and before Tasks 7-9 (which call
it to create trilhas). This order is reflected in the task numbering above; subagent-
driven-development should execute strictly in this order.
