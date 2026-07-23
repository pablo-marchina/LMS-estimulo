# Frente 3 + 4 — Diagnóstico de Arquétipo, Classificação e Trilhas por Arquétipo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin diagnostic editor's 4 raw JSON textareas with a staged, low-tech-literacy form; make the diagnostic actually compute and persist one of 4 named archetypes per participant (today nothing does — verified live); let the admin define the scoring→archetype rule as editable data (no formula exists in the reference material, so this must be admin-authored, never hardcoded); let the admin mark each trilha as restricted to specific archetypes or open to everyone; and let a real participant browse eligible trilhas after finishing the diagnostic and enroll themselves. The synthetic-participant-only enrollment restriction is removed entirely — this product is for real users.

**Architecture:** Extends the existing E14 event-sourced runtime (`app_private.e14_*` functions in Postgres) additively — no existing wired function (`e14_scores_c`, `e14_path_c`, `e14_cmd_enroll`'s two-axis path selection) is altered, since those are live and other things may depend on their exact contract. New pieces:
- Two new `app_private` functions (`e14_dimension_scores_c`, `e14_archetype_c`) called from the existing, live `e14_exec_c` diagnostic-completion chain.
- The admin-authored classification rule is stored as JSON inside the existing `diagnostics.diagnostic_versions.configuration` column (already exists, already read/written) — no new table.
- A real `eligible_archetype_codes text[]` column on `catalog.journey_versions`.
- A new, real (non-synthetic) self-service enrollment path: `app_private.e14_cmd_self_enroll` / `public.e14_self_enroll`, granted to `authenticated` via the same actor-identity pattern already used for diagnostic responses — plus a new read RPC `e14_list_eligible_journeys` for the catalog page. The old `e14_cmd_enroll` loses its `INTERNAL_PARTICIPANT_REQUIRED` (synthetic-only) guard entirely; it keeps its staff-permission requirement and stays as the admin ops tool, now usable on real participants.
- `get_admin_product_workspace`'s diagnostics branch is extended to return dimensions/items/options/classification rules (today it only returns `configuration`/`status` — the editor cannot currently load-and-edit existing content, only create fresh drafts).
- `save_admin_product_resource`'s diagnostic branch gains publish support (`status` from payload, following the exact pattern already used for `badge`/`certificate` — today diagnostic versions can never leave `'draft'`) and persists the classification rule.

**Tech Stack:** Postgres (Supabase), `plpgsql`/`sql` functions, Next.js 16 Server Components + Server Actions, existing design-system components (`Card`, `Button`, `Input`, `Select`, `Textarea`, `Badge`, `StatusPill`, `EmptyState` — no new primitives).

**Verification:** This session has a live, authenticated Supabase MCP connection to the dev/test project (`cfpfeavjlgheqqiaqtzv`) via `mcp__supabase__apply_migration` / `mcp__supabase__execute_sql` / `mcp__supabase__list_migrations`. Unlike Frente 1 (no DB access, migrations were hand-traced only), **every SQL task in this plan must be actually applied and actually queried against this real database before being marked done** — hand-tracing alone is not acceptable here given the credit-risk adjacency of archetype classification. After `apply_migration`, also write the identical SQL to a new file in `supabase/migrations/` (timestamp prefix matching the existing convention, e.g. `20260723150000_<name>.sql`) so the repo stays the source of truth.

## Global Constraints

- Público leigo em tecnologia dos dois lados (admin e participante) — nenhum campo livre de JSON nas telas novas; toda entrada é formulário com rótulos em português claro.
- Nenhuma fórmula de classificação é inventada por mim. O admin define os valores (thresholds) através da UI; o código só avalia a regra que foi configurada.
- Os 4 arquétipos são fixos: `fazedor` (🔨 Fazedor(a)), `batalhador` (💪 Batalhador(a)), `construtor` (🧱 Construtor(a)), `navegador` (🧭 Navegador(a)) — nomes/ícones/descrições verbatim de `ref/estimulo-ref/estimulo-ref/arquetipos_estimulo.md`.
- As 5 dimensões são fixas: `gestao_financeira` (D1 Gestão financeira), `disciplina_habito` (D2 Disciplina e hábito), `visao_planejamento` (D3 Visão e planejamento), `perfil_empreendedor` (D4 Perfil empreendedor), `credito_risco` (D5 Relação com crédito e risco).
- Nenhum participante fica "sem arquétipo": o admin é obrigado a escolher um arquétipo padrão (fallback) usado quando nenhuma regra configurada é atendida.
- Nenhuma restrição de participante sintético em nenhum caminho novo. O caminho antigo (`e14_cmd_enroll`) perde essa restrição também — deixa de existir por completo no código.
- Diagnostic/archetype versions só entram em vigor (lidas pelo runtime de classificação, elegíveis para matrícula) quando `status='published'` — nunca a partir de `'draft'`.
- Banner "Rascunho — pendente de aprovação institucional" permanece visível no editor de diagnóstico enquanto a versão selecionada estiver em `draft`.

---

### Task 1: Extend `get_admin_product_workspace` to return full diagnostic content (read-side fix)

**Files:**
- Create: `supabase/migrations/20260723150000_admin_workspace_diagnostic_detail.sql`
- Modify: `apps/web/lib/admin/product-management.ts`

**Interfaces:**
- Produces: `AdminProductWorkspace.diagnostics[].versions[]` now also carries `dimensions: Array<{id, code, name, description, minimum_answer_ratio, position}>`, `items: Array<{id, code, item_type, prompt, position, is_required, dimension_code, options: Array<{id, code, label, value, position}>}>`.
- Consumes: existing `diagnostics.dimensions`, `diagnostics.items`, `diagnostics.item_options` tables (unchanged schema).

- [ ] **Step 1: Apply and verify the migration against the live database**

Write and apply this migration (it only changes the `diagnostics` branch of the function's `returns jsonb` — every other branch is copied verbatim from the current definition, which you must read first: `supabase/migrations/20260721143559_integral_admin_product_management.sql`, function `public.get_admin_product_workspace`):

```sql
create or replace function public.get_admin_product_workspace(
  p_actor_user_account_id uuid,
  p_organization_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog
as $$
declare
  v_allowed boolean;
begin
  v_allowed:=app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage')
    or app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'diagnostic.configuration.manage')
    or app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage')
    or app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'reporting.read');
  if not v_allowed then raise exception 'FORBIDDEN' using errcode='42501'; end if;

  return jsonb_build_object(
    'organization_id',p_organization_id,
    'programs',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'code',p.code,'name',p.name,'status',p.status) order by p.name),'[]'::jsonb) from catalog.programs p where p.owner_organization_id=p_organization_id),
    'journeys',(select coalesce(jsonb_agg(jsonb_build_object(
      'definition_id',jd.id,'program_id',jd.program_id,'code',jd.code,'slug',jd.slug,'name',jd.name,'purpose',jd.purpose,'status',jd.status,
      'versions',(select coalesce(jsonb_agg(jsonb_build_object('id',jv.id,'version_number',jv.version_number,'status',jv.status,'title',jv.title,'description',jv.description,'configuration',jv.configuration,'content_hash',jv.content_hash,'published_at',jv.published_at,'eligible_archetype_codes',jv.eligible_archetype_codes) order by jv.version_number desc),'[]'::jsonb) from catalog.journey_versions jv where jv.journey_definition_id=jd.id)
    ) order by jd.name),'[]'::jsonb) from catalog.journey_definitions jd where jd.owner_organization_id=p_organization_id),
    'activities',(select coalesce(jsonb_agg(jsonb_build_object(
      'definition_id',ad.id,'code',ad.code,'name',ad.name,'activity_type',ad.activity_type,'status',ad.status,
      'versions',(select coalesce(jsonb_agg(jsonb_build_object('id',av.id,'version_number',av.version_number,'status',av.status,'title',av.title,'description',av.description,'activity_type',av.activity_type,'configuration',av.configuration,'estimated_minutes',av.estimated_minutes,'content_hash',av.content_hash) order by av.version_number desc),'[]'::jsonb) from catalog.activity_versions av where av.activity_definition_id=ad.id)
    ) order by ad.name),'[]'::jsonb) from catalog.activity_definitions ad where ad.owner_organization_id=p_organization_id),
    'paths',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',pt.id,'journey_version_id',pt.journey_version_id,'code',pt.code,'name',pt.name,'description',pt.description,'is_default',pt.is_default,'status',pt.status,
      'steps',(select coalesce(jsonb_agg(jsonb_build_object('id',ps.id,'code',ps.code,'activity_version_id',ps.activity_version_id,'position',ps.position_hint,'is_required',ps.is_required,'availability_rule_version_id',ps.availability_rule_version_id,'completion_rule_version_id',ps.completion_rule_version_id,'due_offset',ps.due_offset,'metadata',ps.metadata) order by ps.position_hint),'[]'::jsonb) from orchestration.path_steps ps where ps.path_template_id=pt.id)
    ) order by pt.name),'[]'::jsonb)
      from orchestration.path_templates pt join catalog.journey_versions jv on jv.id=pt.journey_version_id join catalog.journey_definitions jd on jd.id=jv.journey_definition_id where jd.owner_organization_id=p_organization_id),
    'rules',(select coalesce(jsonb_agg(jsonb_build_object(
      'definition_id',rd.id,'code',rd.code,'rule_type',rd.rule_type,'name',rd.name,'status',rd.status,
      'versions',(select coalesce(jsonb_agg(jsonb_build_object('id',rv.id,'version_number',rv.version_number,'status',rv.status,'language',rv.language,'expression',rv.expression,'input_schema',rv.input_schema,'output_schema',rv.output_schema,'content_hash',rv.content_hash) order by rv.version_number desc),'[]'::jsonb) from orchestration.rule_versions rv where rv.rule_definition_id=rd.id)
    ) order by rd.name),'[]'::jsonb) from orchestration.rule_definitions rd where rd.owner_organization_id=p_organization_id),
    'diagnostics',(select coalesce(jsonb_agg(jsonb_build_object(
      'definition_id',dd.id,'code',dd.code,'name',dd.name,'purpose',dd.purpose,'status',dd.status,
      'versions',(select coalesce(jsonb_agg(jsonb_build_object(
        'id',dv.id,'version_number',dv.version_number,'status',dv.status,'configuration',dv.configuration,'content_hash',dv.content_hash,'published_at',dv.published_at,
        'dimensions',(select coalesce(jsonb_agg(jsonb_build_object('id',dim.id,'code',dim.code,'name',dim.name,'description',dim.description,'minimum_answer_ratio',dim.minimum_answer_ratio,'position',dim.position) order by dim.position),'[]'::jsonb) from diagnostics.dimensions dim where dim.diagnostic_version_id=dv.id),
        'items',(select coalesce(jsonb_agg(jsonb_build_object(
          'id',it.id,'code',it.code,'item_type',it.item_type,'prompt',it.prompt,'position',it.position,'is_required',it.is_required,
          'dimension_code',(select dim2.code from diagnostics.dimensions dim2 where dim2.id=it.dimension_id),
          'options',(select coalesce(jsonb_agg(jsonb_build_object('id',opt.id,'code',opt.code,'label',opt.label,'value',opt.value,'position',opt.position) order by opt.position),'[]'::jsonb) from diagnostics.item_options opt where opt.item_id=it.id)
        ) order by it.position),'[]'::jsonb) from diagnostics.items it where it.diagnostic_version_id=dv.id)
      ) order by dv.version_number desc),'[]'::jsonb) from diagnostics.diagnostic_versions dv where dv.diagnostic_definition_id=dd.id)
    ) order by dd.name),'[]'::jsonb) from diagnostics.diagnostic_definitions dd where dd.owner_organization_id=p_organization_id),
    'point_rules',(select coalesce(jsonb_agg(jsonb_build_object('definition_id',pd.id,'code',pd.code,'name',pd.name,'status',pd.status,'versions',(select coalesce(jsonb_agg(to_jsonb(pv) order by pv.version_number desc),'[]'::jsonb) from engagement.point_rule_versions pv where pv.point_rule_definition_id=pd.id)) order by pd.name),'[]'::jsonb) from engagement.point_rule_definitions pd where pd.owner_organization_id=p_organization_id),
    'badges',(select coalesce(jsonb_agg(jsonb_build_object('definition_id',bd.id,'code',bd.code,'name',bd.name,'status',bd.status,'versions',(select coalesce(jsonb_agg(to_jsonb(bv) order by bv.version_number desc),'[]'::jsonb) from engagement.badge_versions bv where bv.badge_definition_id=bd.id)) order by bd.name),'[]'::jsonb) from engagement.badge_definitions bd where bd.owner_organization_id=p_organization_id),
    'certificates',(select coalesce(jsonb_agg(jsonb_build_object('definition_id',cd.id,'code',cd.code,'name',cd.name,'status',cd.status,'versions',(select coalesce(jsonb_agg(to_jsonb(cv) order by cv.version_number desc),'[]'::jsonb) from engagement.certificate_versions cv where cv.certificate_definition_id=cd.id)) order by cd.name),'[]'::jsonb) from engagement.certificate_definitions cd where cd.owner_organization_id=p_organization_id)
  );
end;
$$;
```

Note: this references `jv.eligible_archetype_codes`, which does not exist until Task 6's migration runs. **Apply Task 6's column-add migration first** (it's additive and harmless on its own), then this one. Reorder your execution: do Task 6's schema-only step before Task 1 if you reach this task first — or simply run `alter table catalog.journey_versions add column if not exists eligible_archetype_codes text[];` inline before this migration as a guard. Use `mcp__supabase__apply_migration` with `name: "admin_workspace_diagnostic_detail"`.

- [ ] **Step 2: Verify live**

Run via `mcp__supabase__execute_sql`:
```sql
select get_admin_product_workspace(
  (select user_account_id from core.entrepreneurs limit 1),
  (select owner_organization_id from diagnostics.diagnostic_definitions limit 1)
);
```
This will likely raise `FORBIDDEN` (the first entrepreneur account probably lacks `diagnostic.configuration.manage`) — that's fine, it proves the function still runs and permission-checks correctly. Then find an actor that DOES have the permission:
```sql
select uae.user_account_id
from iam.user_account_entitlements uae -- read the actual entitlement/membership table name from app_private.e14_actor_has_permission's body if this table name is wrong
```
Read `app_private.e14_actor_has_permission`'s body first (`select pg_get_functiondef('app_private.e14_actor_has_permission'::regproc)` via `execute_sql`) to find the correct join path to an authorized actor, then call `get_admin_product_workspace` with that actor and confirm the JSON now includes non-empty `dimensions`/`items`/`options` arrays for the existing draft diagnostic versions (there are 2 pre-existing diagnostics in this project — confirm both still return correctly, including the one with 0 dimensions).

- [ ] **Step 3: Update the TypeScript types**

In `apps/web/lib/admin/product-management.ts`, extend `VersionSummary` (used generically by all resource types, so add optional fields rather than a diagnostic-specific type):
```ts
export type VersionSummary = {
  id: string;
  version_number: number;
  status: string;
  title?: string | null;
  description?: string | null;
  configuration?: Record<string, unknown>;
  content_hash?: string;
  published_at?: string | null;
  dimensions?: Array<{ id: string; code: string; name: string; description: string | null; minimum_answer_ratio: number; position: number }>;
  items?: Array<{
    id: string; code: string; item_type: string; prompt: string; position: number; is_required: boolean; dimension_code: string | null;
    options: Array<{ id: string; code: string; label: string; value: { score?: number }; position: number }>;
  }>;
  eligible_archetype_codes?: string[] | null;
  [key: string]: unknown;
};
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260723150000_admin_workspace_diagnostic_detail.sql apps/web/lib/admin/product-management.ts
git commit -m "feat(admin): return full diagnostic content from workspace read RPC"
```

---

### Task 2: Diagnostic publish flow + classification rule storage (`save_admin_product_resource`)

**Files:**
- Create: `supabase/migrations/20260723150100_diagnostic_publish_and_classification_rules.sql`

**Interfaces:**
- Consumes: payload fields `status` (`"draft"|"published"`, optional, defaults to `"draft"`), `classification_rules: { default_archetype_code: string, rules: Array<{ archetype_code: string, priority: number, thresholds: Record<string, number> }> }` (optional, defaults to `{}`).
- Produces: `diagnostics.diagnostic_versions.status` can now become `'published'`; `diagnostics.diagnostic_versions.configuration->'classification_rules'` holds the admin-authored rule; `diagnostics.archetype_versions` also gains publish support (same `status` field, following the same pattern) since `e14_archetype_c` (Task 4) will only resolve `status='published'` archetype versions.

- [ ] **Step 1: Read the current diagnostic branch**

Read `supabase/migrations/20260721143559_integral_admin_product_management.sql`, function `public.save_admin_product_resource`, the `elsif p_resource_type='diagnostic' then ... end if;` branch (currently lines ~261-307) and the `badge`/`certificate` branches (~325-354) to copy the exact `v_status:=case when p_payload->>'status'='published' then 'published' else 'draft' end;` pattern.

- [ ] **Step 2: Apply and verify the migration**

Replace only the `diagnostic` branch (everything else in the function is copied verbatim, unchanged):

```sql
create or replace function public.save_admin_product_resource(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_resource_type text,
  p_payload jsonb,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path=pg_catalog
as $$
-- ... (copy the full existing function header, declare block, and every branch
--      other than 'diagnostic' VERBATIM from the current migration — read it first) ...
-- Replace only this branch:
  elsif p_resource_type='diagnostic' then
    v_definition_id:=nullif(p_payload->>'definition_id','')::uuid;
    if v_definition_id is null then
      insert into diagnostics.diagnostic_definitions(id,owner_organization_id,code,name,purpose,status)
      values(gen_random_uuid(),p_organization_id,v_code,btrim(p_payload->>'name'),btrim(p_payload->>'purpose'),'active') returning id into v_definition_id;
    else
      update diagnostics.diagnostic_definitions set code=v_code,name=btrim(p_payload->>'name'),purpose=btrim(p_payload->>'purpose')
      where id=v_definition_id and owner_organization_id=p_organization_id;
      if not found then raise exception 'DIAGNOSTIC_NOT_FOUND' using errcode='P0002'; end if;
    end if;
    v_status:=case when p_payload->>'status'='published' then 'published' else 'draft' end;
    v_version_id:=nullif(p_payload->>'version_id','')::uuid;
    if v_version_id is null then
      select coalesce(max(version_number),0)+1 into v_next_version from diagnostics.diagnostic_versions where diagnostic_definition_id=v_definition_id;
      insert into diagnostics.diagnostic_versions(id,diagnostic_definition_id,version_number,status,configuration,published_at,content_hash,created_at)
      values(gen_random_uuid(),v_definition_id,v_next_version,v_status,
        coalesce(p_payload->'configuration','{}'::jsonb) || jsonb_build_object('classification_rules',coalesce(p_payload->'classification_rules','{}'::jsonb)),
        case when v_status='published' then now() else null end,app_private.e14_request_hash(coalesce(p_payload,'{}'::jsonb)),now()) returning id into v_version_id;
    else
      update diagnostics.diagnostic_versions set
        configuration=coalesce(p_payload->'configuration','{}'::jsonb) || jsonb_build_object('classification_rules',coalesce(p_payload->'classification_rules','{}'::jsonb)),
        status=v_status,
        published_at=case when v_status='published' then coalesce(published_at,now()) else published_at end,
        content_hash=app_private.e14_request_hash(coalesce(p_payload,'{}'::jsonb))
      where id=v_version_id and diagnostic_definition_id=v_definition_id and status='draft';
      if not found then raise exception 'DIAGNOSTIC_DRAFT_NOT_FOUND' using errcode='P0002'; end if;
      delete from diagnostics.item_options where item_id in (select id from diagnostics.items where diagnostic_version_id=v_version_id);
      delete from diagnostics.items where diagnostic_version_id=v_version_id;
      delete from diagnostics.dimensions where diagnostic_version_id=v_version_id;
    end if;
    for v_item in select value from jsonb_array_elements(coalesce(p_payload->'dimensions','[]'::jsonb)) loop
      insert into diagnostics.dimensions(id,diagnostic_version_id,code,name,description,minimum_answer_ratio,position)
      values(gen_random_uuid(),v_version_id,lower(btrim(v_item->>'code')),btrim(v_item->>'name'),nullif(btrim(v_item->>'description'),''),coalesce((v_item->>'minimum_answer_ratio')::numeric,1),coalesce((v_item->>'position')::integer,1));
    end loop;
    for v_item in select value from jsonb_array_elements(coalesce(p_payload->'items','[]'::jsonb)) loop
      select id into v_dimension_id from diagnostics.dimensions where diagnostic_version_id=v_version_id and code=lower(btrim(v_item->>'dimension_code'));
      insert into diagnostics.items(id,diagnostic_version_id,dimension_id,code,item_type,prompt,configuration,position,is_required)
      values(gen_random_uuid(),v_version_id,v_dimension_id,lower(btrim(v_item->>'code')),coalesce(nullif(v_item->>'item_type',''),'single_choice'),btrim(v_item->>'prompt'),coalesce(v_item->'configuration','{}'::jsonb),coalesce((v_item->>'position')::integer,1),coalesce((v_item->>'is_required')::boolean,true)) returning id into v_activity_version_id;
      for v_option in select value from jsonb_array_elements(coalesce(v_item->'options','[]'::jsonb)) loop
        insert into diagnostics.item_options(id,item_id,code,label,value,position)
        values(gen_random_uuid(),v_activity_version_id,lower(btrim(v_option->>'code')),btrim(v_option->>'label'),coalesce(v_option->'value','{}'::jsonb),coalesce((v_option->>'position')::integer,1));
      end loop;
    end loop;
    for v_item in select value from jsonb_array_elements(coalesce(p_payload->'archetypes','[]'::jsonb)) loop
      insert into diagnostics.archetype_definitions(id,owner_organization_id,code,name,description,status)
      values(gen_random_uuid(),p_organization_id,lower(btrim(v_item->>'code')),btrim(v_item->>'name'),nullif(btrim(v_item->>'description'),''),'active')
      on conflict (owner_organization_id,code) do update set name=excluded.name,description=excluded.description
      returning id into v_activity_definition_id;
      select coalesce(max(version_number),0)+1 into v_next_version from diagnostics.archetype_versions where archetype_definition_id=v_activity_definition_id;
      insert into diagnostics.archetype_versions(id,archetype_definition_id,version_number,model_reference,status,validation_status,published_at)
      values(gen_random_uuid(),v_activity_definition_id,v_next_version,v_version_id::text,
        case when p_payload->>'status'='published' then 'published' else 'draft' end,'pending',
        case when p_payload->>'status'='published' then now() else null end);
    end loop;
    v_result:=jsonb_build_object('definition_id',v_definition_id,'version_id',v_version_id);
    v_subject_id:=v_definition_id;
-- ... (continue with the unchanged 'point_rule'/'badge'/'certificate' branches and function tail, copied verbatim) ...
$$;
```

Apply via `mcp__supabase__apply_migration` with `name: "diagnostic_publish_and_classification_rules"`.

- [ ] **Step 2: Verify live — draft creation, edit, and publish**

Via `mcp__supabase__execute_sql`, find an actor with `diagnostic.configuration.manage` on an organization (same lookup as Task 1 Step 2), then:
```sql
select save_admin_product_resource(
  '<actor_uuid>', '<org_uuid>', 'diagnostic',
  '{"name":"Diagnóstico de arquétipo","purpose":"Classificar arquétipo empreendedor",
    "dimensions":[{"code":"gestao_financeira","name":"Gestão financeira","position":1}],
    "items":[],"archetypes":[],
    "classification_rules":{"default_archetype_code":"construtor","rules":[]}}'::jsonb,
  gen_random_uuid()::text
);
```
Confirm the returned `version_id` row in `diagnostics.diagnostic_versions` has `status='draft'` and `configuration->'classification_rules'->>'default_archetype_code' = 'construtor'`. Then re-call with the same `definition_id`/`version_id` and `"status":"published"` in the payload; confirm `status` flips to `'published'` and `published_at` is set. Then confirm a **third** call with the same `version_id` (now published) fails with `DIAGNOSTIC_DRAFT_NOT_FOUND` (versions are immutable once published — matches the existing `where ... and status='draft'` guard).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260723150100_diagnostic_publish_and_classification_rules.sql
git commit -m "feat(admin): support publishing diagnostic versions and storing archetype classification rules"
```

---

### Task 3: Generalize dimension scoring (`e14_dimension_scores_c`) — additive, does not touch `e14_scores_c`

**Files:**
- Create: `supabase/migrations/20260723150200_e14_dimension_scores.sql`

**Interfaces:**
- Produces: `app_private.e14_dimension_scores_c(p_session_id uuid) returns jsonb` — e.g. `{"gestao_financeira": 7, "disciplina_habito": 5, "visao_planejamento": 3, "perfil_empreendedor": 6, "credito_risco": 2}` (one key per dimension the session's diagnostic version actually has, summing each answered item's `response_value->>'score'`).
- Consumes: `diagnostics.responses`, `diagnostics.items`, `diagnostics.dimensions` (unchanged schema, same tables `e14_scores_c` already reads — confirmed live in Task 1's research this session).

- [ ] **Step 1: Apply and verify**

```sql
create or replace function app_private.e14_dimension_scores_c(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 with l as (select distinct on (r.item_id) r.item_id,r.response_value from diagnostics.responses r where r.session_id=a order by r.item_id,r.revision desc),
 s as (select d.code, sum((l.response_value->>'score')::integer) v from l join diagnostics.items i on i.id=l.item_id join diagnostics.dimensions d on d.id=i.dimension_id group by d.code)
 select coalesce(jsonb_object_agg(s.code, s.v), '{}'::jsonb) from s
$$;
revoke all on function app_private.e14_dimension_scores_c(uuid) from public,anon,authenticated;
```

Apply via `mcp__supabase__apply_migration` with `name: "e14_dimension_scores"`.

- [ ] **Step 2: Verify live with real inserted data**

This function reads `diagnostics.sessions`/`diagnostics.responses`, which normally only get populated by the live `e14_*` diagnostic-taking flow. To verify without running the full participant UI, insert a throwaway session + responses directly via `execute_sql` against the diagnostic seeded in Task 5 (or, if Task 5 hasn't run yet, seed a minimal 2-dimension/2-item/2-option diagnostic version inline for this test), then call the function and confirm the returned jsonb sums match hand-computed totals. Delete the throwaway rows afterward (`delete from diagnostics.responses where session_id = '<test session id>'; delete from diagnostics.sessions where id = '<test session id>';`) so this doesn't pollute the shared dev project.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260723150200_e14_dimension_scores.sql
git commit -m "feat(diagnostics): add generalized per-dimension score aggregation"
```

---

### Task 4: Archetype classification + persistence (`e14_archetype_c`), wired into the live completion path

**Files:**
- Create: `supabase/migrations/20260723150300_e14_archetype_classification.sql`
- Modify (new migration, do not edit the old file): `supabase/migrations/20260723150400_e14_exec_c_archetype_wiring.sql`

**Interfaces:**
- Consumes: `e14_dimension_scores_c` (Task 3), `diagnostics.diagnostic_versions.configuration->'classification_rules'` (Task 2), `diagnostics.archetype_definitions`/`archetype_versions` (published only).
- Produces: `app_private.e14_archetype_c(p_session_id uuid, p_diagnostic_version_id uuid, p_organization_id uuid, p_entrepreneur_id uuid, p_journey_instance_id uuid) returns jsonb` → `{"archetype_code": "...", "archetype_name": "...", "archetype_version_id": "..."}`; writes one row to `diagnostics.archetype_assignments`. `e14_exec_c`'s returned `data` jsonb gains an `"archetype"` key with this same shape, for every real diagnostic completion going forward.

- [ ] **Step 1: Apply `e14_archetype_c`**

```sql
create or replace function app_private.e14_archetype_c(
  p_session_id uuid,
  p_diagnostic_version_id uuid,
  p_organization_id uuid,
  p_entrepreneur_id uuid,
  p_journey_instance_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_scores jsonb;
  v_rules jsonb;
  v_default text;
  v_rule jsonb;
  v_code text;
  v_ok boolean;
  v_dimension text;
  v_min numeric;
  v_definition_id uuid;
  v_version_id uuid;
  v_name text;
  v_assignment_id uuid;
begin
  v_scores := app_private.e14_dimension_scores_c(p_session_id);
  select dv.configuration->'classification_rules'->'rules', dv.configuration->'classification_rules'->>'default_archetype_code'
    into v_rules, v_default
    from diagnostics.diagnostic_versions dv where dv.id = p_diagnostic_version_id;
  if v_default is null then raise exception 'CLASSIFICATION_RULES_NOT_CONFIGURED' using errcode = 'P0001'; end if;

  v_code := null;
  for v_rule in select value from jsonb_array_elements(coalesce(v_rules,'[]'::jsonb)) order by (value->>'priority')::integer asc loop
    v_ok := true;
    for v_dimension, v_min in select key, value::numeric from jsonb_each_text(v_rule->'thresholds') loop
      if coalesce((v_scores->>v_dimension)::numeric, 0) < v_min then v_ok := false; end if;
    end loop;
    if v_ok then v_code := v_rule->>'archetype_code'; exit; end if;
  end loop;
  if v_code is null then v_code := v_default; end if;

  select ad.id, av.id, ad.name into v_definition_id, v_version_id, v_name
    from diagnostics.archetype_definitions ad
    join diagnostics.archetype_versions av on av.archetype_definition_id = ad.id and av.status = 'published'
   where ad.owner_organization_id = p_organization_id and ad.code = v_code
   order by av.version_number desc limit 1;
  if v_version_id is null then raise exception 'ARCHETYPE_VERSION_NOT_PUBLISHED' using errcode = 'P0002'; end if;

  v_assignment_id := app_private.e14_deterministic_uuid('e14:archetype-assignment|'||p_session_id::text);
  insert into diagnostics.archetype_assignments(id, entrepreneur_id, journey_instance_id, model_version_reference, primary_archetype_version_id, classification_status, assigned_at)
  values (v_assignment_id, p_entrepreneur_id, p_journey_instance_id, p_diagnostic_version_id::text, v_version_id, 'classified', now())
  on conflict (id) do nothing;

  return jsonb_build_object('archetype_code', v_code, 'archetype_name', v_name, 'archetype_version_id', v_version_id);
end;$$;
revoke all on function app_private.e14_archetype_c(uuid,uuid,uuid,uuid,uuid) from public,anon,authenticated;
```

Note the inner `for` loop: once `v_ok` is set `false` it is not reset until the next rule, but the loop does not `exit` early on failure (removed the early-exit compared to a first draft) — this is intentional and harmless (it just checks remaining dimensions needlessly) but confirm behavior with the test cases below; a rule with a threshold on a dimension key that has **no score at all** for this participant must fail that rule (via `coalesce(...,0)`), not error.

Apply via `mcp__supabase__apply_migration` with `name: "e14_archetype_classification"`.

- [ ] **Step 2: Verify live — at least 4 cases**

Seed (via `execute_sql`) one `diagnostic_versions.configuration->'classification_rules'` with 2 competing rules + a default, publish all 4 archetype definitions/versions for the test org (`update diagnostics.archetype_versions set status='published', published_at=now() where ...`), insert a throwaway session with responses producing scores that (a) match rule priority 1, (b) match rule priority 2 only, (c) match neither (falls to default), and (d) a case where the matching archetype's version is NOT published — confirm it raises `ARCHETYPE_VERSION_NOT_PUBLISHED`. Confirm each expected `archetype_code` in the returned jsonb and confirm exactly one row lands in `diagnostics.archetype_assignments` per case (call twice with the same session_id to confirm the `on conflict (id) do nothing` makes it idempotent — row count must stay at 1). Clean up all throwaway rows afterward.

- [ ] **Step 3: Wire into `e14_exec_c`**

Read the current body of `app_private.e14_exec_c` (`supabase/migrations/20260709053556_m13e11_e14_exec_c.sql`) — it already computes `ctx` (with `entrepreneur_id`, `instance_id`, `version_id`, `organization_id`) before calling `e14_apply_c`. Add one call after `data:=app_private.e14_apply_c(...)`:

```sql
create or replace function app_private.e14_exec_c(a uuid,b uuid,c bigint,d text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare p jsonb;ctx jsonb;s jsonb;path jsonb;data jsonb;children jsonb;arch jsonb;
begin
 p:=app_private.e14_prepare_c(a,b,c,d);
 if (p->>'p')::boolean then return jsonb_build_object('request_id',(p->>'e')::uuid,'idempotency_key',p->>'k','replayed',true,'data',app_private.e14_snapshot_c(b));end if;
 ctx:=app_private.e14_context_c(a,b,c);s:=app_private.e14_scores_c(b);path:=app_private.e14_path_c((ctx->>'journey_version_id')::uuid,s);
 perform app_private.e14_first_c((p->>'e')::uuid,a,ctx,b,c+1,p->>'h',p->>'k');
 data:=app_private.e14_apply_c(b,ctx,s,path,(p->>'e')::uuid);
 arch:=app_private.e14_archetype_c(b,(ctx->>'version_id')::uuid,(ctx->>'organization_id')::uuid,(ctx->>'entrepreneur_id')::uuid,(ctx->>'instance_id')::uuid);
 data:=data||jsonb_build_object('archetype',arch);
 children:=app_private.e14_children_c((p->>'e')::uuid,a,ctx,s,data);
 return jsonb_build_object('request_id',(p->>'e')::uuid,'idempotency_key',p->>'k','replayed',false,'data',data||jsonb_build_object('event_ids',jsonb_build_array((p->>'e')::uuid)||children));
end;$$;
```

Note this makes `e14_complete_diagnostic` fail (transaction rollback, participant sees an error) whenever the org's diagnostic version has no `classification_rules` configured, or the resolved archetype has no published version — **this is deliberate**: a participant must never silently get no archetype. This means Task 2/Task 5 (admin configures + publishes the rule) must ship and the admin must actually configure the diagnostic used by the live journey before real participants take it, or diagnostic completion breaks for them. Flag this operational dependency clearly in your task report.

Apply via `mcp__supabase__apply_migration` with `name: "e14_exec_c_archetype_wiring"`.

- [ ] **Step 4: Verify live end-to-end**

Confirm `pg_get_functiondef('app_private.e14_exec_c'::regproc)` shows the new body. This function can only be fully exercised through the real `e14_start_diagnostic`/`e14_record_diagnostic_response`/`e14_complete_diagnostic` chain from an enrolled participant — if Task 7/8 aren't done yet, verify by tracing that `e14_archetype_c` is syntactically reachable and, at minimum, re-run Task 4 Step 2's direct-call tests against `e14_archetype_c` once more to confirm no regression from Step 3's edits. Once Task 7/8 land, come back and do one real full run (enroll a real test participant in a published journey with a published diagnostic + published archetypes, complete the diagnostic through the actual participant UI, confirm `diagnostics.archetype_assignments` gets a row) before considering Frente 4 fully done — record this as an explicit follow-up if you reach Task 4 before Task 7/8.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260723150300_e14_archetype_classification.sql supabase/migrations/20260723150400_e14_exec_c_archetype_wiring.sql
git commit -m "feat(diagnostics): classify participants into an archetype on diagnostic completion"
```

---

### Task 5: Admin diagnostic editor — staged form replacing the 4 JSON textareas

**Files:**
- Modify: `apps/web/app/admin/diagnostico/page.tsx`
- Modify: `apps/web/app/admin/diagnostico/actions.ts`
- Create: `scripts/application/admin-diagnostico-page.test.mjs`

**Interfaces:**
- Consumes: `getAdminProductWorkspace` (now returns full dimension/item/option/rule detail per Task 1), `saveAdminProductResource` (now supports `status`/`classification_rules` per Task 2).
- Produces: a 5-section form (Arquétipos, Dimensões, Perguntas, Critério de pontuação, Publicar) inside the existing single `<form action={saveDiagnosticAction}>` — no client-side JS state machine needed; every section is always rendered (no wizard-step hiding) since this is a single POST, matching the existing codebase's server-action-only pattern. Sections use `<details>`/`<summary>` (already used elsewhere in `admin/produto/page.tsx`) so the page stays scannable rather than one long scroll.

- [ ] **Step 1: Write the failing test**

Create `scripts/application/admin-diagnostico-page.test.mjs`:
```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/admin/diagnostico/page.tsx", "utf8");
const actions = await readFile("apps/web/app/admin/diagnostico/actions.ts", "utf8");

test("diagnostic editor no longer has raw JSON textareas for dimensions/items/archetypes/configuration", () => {
  assert.doesNotMatch(page, /name="dimensions"/u);
  assert.doesNotMatch(page, /name="items"/u);
  assert.doesNotMatch(page, /name="archetypes"/u);
  assert.doesNotMatch(page, /name="configuration"/u);
  assert.doesNotMatch(page, /Dimensões JSON/u);
  assert.doesNotMatch(page, /Perguntas e opções JSON/u);
});

test("diagnostic editor shows the draft-pending-approval banner", () => {
  assert.match(page, /pendente de aprova[cç][aã]o institucional/iu);
});

test("diagnostic editor has a publish control and a default-archetype fallback selector", () => {
  assert.match(page, /name="status"/u);
  assert.match(page, /name="default_archetype_code"/u);
});

test("save action builds dimensions/items/archetypes/classification_rules arrays from structured fields, not JSON.parse of a single textarea", () => {
  assert.doesNotMatch(actions, /json\(formData, "dimensions"/u);
  assert.doesNotMatch(actions, /json\(formData, "items"/u);
  assert.doesNotMatch(actions, /json\(formData, "archetypes"/u);
  assert.match(actions, /classification_rules/u);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/application/admin-diagnostico-page.test.mjs`
Expected: FAIL (current page still has all 4 JSON textareas, current actions.ts still does raw `json(formData, "dimensions", [])` etc.)

- [ ] **Step 3: Rewrite `apps/web/app/admin/diagnostico/actions.ts`**

Replace the whole file. The form now submits repeated, indexed field names (`dimension_code_0`, `dimension_name_0`, ... `item_prompt_0`, `item_option_label_0_0`, `item_option_score_0_0`, ...) which the action assembles into the same `dimensions`/`items`/`archetypes` arrays the RPC already expects — the RPC contract from Task 2 is unchanged, only how the browser produces the payload changes:

```ts
"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { saveAdminProductResource } from "@/lib/admin/product-management";

const ARCHETYPE_CODES = ["fazedor", "batalhador", "construtor", "navegador"] as const;
const DIMENSION_CODES = ["gestao_financeira", "disciplina_habito", "visao_planejamento", "perfil_empreendedor", "credito_risco"] as const;

function text(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }
function nullable(formData: FormData, name: string) { return text(formData, name) || null; }
function count(formData: FormData, prefix: string) {
  let n = 0;
  while (formData.has(`${prefix}${n}`)) n += 1;
  return n;
}

export async function saveDiagnosticAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) redirect("/entrar?erro=acesso_nao_autorizado");
  const organizationId = text(formData, "organization_id");
  const organization = auth.identity.organizations.find((item) => item.organization_id === organizationId);
  if (!organization?.permissions.includes("diagnostic.configuration.manage")) redirect(`/admin/diagnostico?organization=${organizationId}&erro=sem_permissao`);

  const dimensions = DIMENSION_CODES.map((code, position) => ({
    code,
    name: text(formData, `dimension_name_${code}`),
    minimum_answer_ratio: 1,
    position: position + 1,
  })).filter((dimension) => dimension.name);

  const itemCount = count(formData, "item_prompt_");
  const items = Array.from({ length: itemCount }, (_, index) => {
    const optionCount = count(formData, `item_option_label_${index}_`);
    return {
      code: `item_${index + 1}`,
      dimension_code: text(formData, `item_dimension_${index}`),
      item_type: "single_choice",
      prompt: text(formData, `item_prompt_${index}`),
      position: index + 1,
      is_required: true,
      options: Array.from({ length: optionCount }, (_, optionIndex) => ({
        code: `opcao_${optionIndex + 1}`,
        label: text(formData, `item_option_label_${index}_${optionIndex}`),
        value: { score: Number(text(formData, `item_option_score_${index}_${optionIndex}`) || "0") },
        position: optionIndex + 1,
      })).filter((option) => option.label),
    };
  }).filter((item) => item.prompt && item.dimension_code);

  const archetypeNames: Record<string, string> = { fazedor: "Fazedor(a)", batalhador: "Batalhador(a)", construtor: "Construtor(a)", navegador: "Navegador(a)" };
  const archetypes = ARCHETYPE_CODES.map((code) => ({
    code,
    name: archetypeNames[code],
    description: text(formData, `archetype_description_${code}`),
  }));

  const rules = ARCHETYPE_CODES.map((code, index) => {
    const thresholds: Record<string, number> = {};
    for (const dimension of DIMENSION_CODES) {
      const value = text(formData, `threshold_${code}_${dimension}`);
      if (value) thresholds[dimension] = Number(value);
    }
    return { archetype_code: code, priority: index + 1, thresholds };
  }).filter((rule) => Object.keys(rule.thresholds).length > 0);

  const defaultArchetypeCode = text(formData, "default_archetype_code");
  const status = text(formData, "status") === "published" ? "published" : "draft";

  const payload = {
    definition_id: nullable(formData, "definition_id"),
    version_id: nullable(formData, "version_id"),
    code: text(formData, "code"),
    name: text(formData, "name"),
    purpose: text(formData, "purpose"),
    status,
    configuration: {},
    dimensions,
    items,
    archetypes,
    classification_rules: { default_archetype_code: defaultArchetypeCode, rules },
  };

  try {
    await saveAdminProductResource({ actorUserAccountId: auth.identity.user_account_id, organizationId, resourceType: "diagnostic", payload, idempotencyKey: randomUUID() });
  } catch {
    redirect(`/admin/diagnostico?organization=${organizationId}&erro=falha`);
  }
  redirect(`/admin/diagnostico?organization=${organizationId}&sucesso=salvo`);
}
```

- [ ] **Step 4: Rewrite `apps/web/app/admin/diagnostico/page.tsx`**

Replace the single `<Card>` editor block (everything inside `<form action={saveDiagnosticAction}>`) with 5 `<details>` sections. Keep the surrounding page (header, org selector, success/error panels, "Versões existentes" list, "Checklist metodológico" card) unchanged. Seed each dimension/archetype's fields with the currently-selected draft version's existing data when one is selected (read from `versions.find((v) => v.id === selectedVersionId)`), falling back to empty when creating fresh — pass the selected version through a `?versao=` query param the same way `organization` is handled today.

```tsx
const ARCHETYPES = [
  { code: "fazedor", icon: "🔨", name: "Fazedor(a)" },
  { code: "batalhador", icon: "💪", name: "Batalhador(a)" },
  { code: "construtor", icon: "🧱", name: "Construtor(a)" },
  { code: "navegador", icon: "🧭", name: "Navegador(a)" },
] as const;
const DIMENSIONS = [
  { code: "gestao_financeira", label: "D1 · Gestão financeira" },
  { code: "disciplina_habito", label: "D2 · Disciplina e hábito" },
  { code: "visao_planejamento", label: "D3 · Visão e planejamento" },
  { code: "perfil_empreendedor", label: "D4 · Perfil empreendedor" },
  { code: "credito_risco", label: "D5 · Relação com crédito e risco" },
] as const;
```

Inside the form (replacing the old JSON textareas block):
```tsx
<form action={saveDiagnosticAction} className="grid gap-4">
  <input type="hidden" name="organization_id" value={organization.organization_id} />
  {/* existing definition_id / version_id / code / name / purpose fields, unchanged */}

  {selectedVersion?.status === "draft" || !selectedVersion ? (
    <StatusPanel title="Rascunho — pendente de aprovação institucional" tone="info">
      <p>Esta versão só passa a valer para participantes reais depois de publicada, e só deve ser publicada após aprovação da metodologia pela equipe do Estímulo.</p>
    </StatusPanel>
  ) : null}

  <details className="group rounded-xl border border-border" open>
    <summary className="cursor-pointer p-4 font-semibold text-ink">1. Arquétipos</summary>
    <div className="grid gap-4 border-t border-border p-4">
      {ARCHETYPES.map((archetype) => (
        <Label key={archetype.code}>
          {archetype.icon} {archetype.name}
          <Textarea name={`archetype_description_${archetype.code}`} rows={2}
            defaultValue={selectedVersion?.archetypes?.find((a: any) => a.code === archetype.code)?.description ?? ""} />
        </Label>
      ))}
    </div>
  </details>

  <details className="group rounded-xl border border-border">
    <summary className="cursor-pointer p-4 font-semibold text-ink">2. Dimensões</summary>
    <div className="grid gap-4 border-t border-border p-4">
      {DIMENSIONS.map((dimension) => (
        <Label key={dimension.code}>
          {dimension.label}
          <Input name={`dimension_name_${dimension.code}`}
            defaultValue={selectedVersion?.dimensions?.find((d: any) => d.code === dimension.code)?.name ?? dimension.label} />
        </Label>
      ))}
    </div>
  </details>

  <details className="group rounded-xl border border-border">
    <summary className="cursor-pointer p-4 font-semibold text-ink">3. Perguntas</summary>
    <div className="grid gap-6 border-t border-border p-4">
      {(selectedVersion?.items?.length ? selectedVersion.items : Array.from({ length: 12 })).map((item: any, index: number) => (
        <fieldset key={index} className="grid gap-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-semibold text-ink">Pergunta {index + 1}</legend>
          <Label>Dimensão principal
            <Select name={`item_dimension_${index}`} defaultValue={item?.dimension_code ?? ""}>
              <option value="">Selecione</option>
              {DIMENSIONS.map((dimension) => <option key={dimension.code} value={dimension.code}>{dimension.label}</option>)}
            </Select>
          </Label>
          <Label>Pergunta<Textarea name={`item_prompt_${index}`} rows={2} defaultValue={item?.prompt ?? ""} /></Label>
          {[0, 1, 2, 3].map((optionIndex) => (
            <div key={optionIndex} className="grid gap-2 sm:grid-cols-[1fr_120px]">
              <Label>Opção {optionIndex + 1}<Input name={`item_option_label_${index}_${optionIndex}`} defaultValue={item?.options?.[optionIndex]?.label ?? ""} /></Label>
              <Label>Pontuação<Input name={`item_option_score_${index}_${optionIndex}`} type="number" defaultValue={item?.options?.[optionIndex]?.value?.score ?? ""} /></Label>
            </div>
          ))}
        </fieldset>
      ))}
    </div>
  </details>

  <details className="group rounded-xl border border-border">
    <summary className="cursor-pointer p-4 font-semibold text-ink">4. Critério de pontuação</summary>
    <div className="grid gap-4 border-t border-border p-4">
      <p className="text-sm text-muted">Para cada arquétipo, defina a pontuação mínima que o participante precisa atingir em cada dimensão. O primeiro arquétipo cuja exigência for cumprida é o escolhido.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr><th className="p-2 text-left">Arquétipo</th>{DIMENSIONS.map((d) => <th key={d.code} className="p-2 text-left">{d.label}</th>)}</tr></thead>
          <tbody>
            {ARCHETYPES.map((archetype) => (
              <tr key={archetype.code}>
                <td className="p-2 font-medium text-ink">{archetype.icon} {archetype.name}</td>
                {DIMENSIONS.map((dimension) => (
                  <td key={dimension.code} className="p-2">
                    <Input name={`threshold_${archetype.code}_${dimension.code}`} type="number" placeholder="—"
                      defaultValue={selectedVersion?.configuration?.classification_rules?.rules
                        ?.find((r: any) => r.archetype_code === archetype.code)?.thresholds?.[dimension.code] ?? ""} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Label>Arquétipo padrão (quando nenhum critério acima for atingido)
        <Select name="default_archetype_code" defaultValue={selectedVersion?.configuration?.classification_rules?.default_archetype_code ?? ""} required>
          <option value="">Selecione</option>
          {ARCHETYPES.map((archetype) => <option key={archetype.code} value={archetype.code}>{archetype.icon} {archetype.name}</option>)}
        </Select>
      </Label>
    </div>
  </details>

  <details className="group rounded-xl border border-border">
    <summary className="cursor-pointer p-4 font-semibold text-ink">5. Publicar</summary>
    <div className="grid gap-4 border-t border-border p-4">
      <Label className="flex items-center gap-2.5">
        <input type="checkbox" name="status" value="published" defaultChecked={selectedVersion?.status === "published"} className="size-4 accent-primary" />
        Publicar esta versão (participantes reais passam a usá-la imediatamente)
      </Label>
    </div>
  </details>

  <Button type="submit" className="w-fit">Salvar configuração</Button>
</form>
```

(The checkbox posts `"published"` only when checked; `text(formData, "status")` in the action reads `""` when unchecked, which the action already treats as `draft` — no extra handling needed.)

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test scripts/application/admin-diagnostico-page.test.mjs`
Expected: PASS (4 tests)

Run: `npm run typecheck:web` — expect no errors. `selectedVersion?.archetypes`/`.dimensions`/`.items`/`.configuration` read through `any`-typed workspace JSON; if strict mode complains, cast `selectedVersion as any` at the top rather than threading exact types through, matching this file's existing loose-JSON-workspace style (see `configuration: json(formData, "configuration", {})` elsewhere in this codebase).

- [ ] **Step 6: Seed the real archetype diagnostic once, live, through this new UI**

There is no existing diagnostic definition matching this content (confirmed live this session — the 2 existing diagnostics are `e14_runtime_readiness_diagnostic`, a technical test fixture, and `business_maturity_self_assessment`, an unrelated 6-dimension maturity self-assessment). After this task's UI works, actually use it (or call `save_admin_product_resource` directly with the full payload) to create a **new** diagnostic definition, e.g. `code: "entrepreneur_archetype_diagnostic"`, with the 5 dimensions, the 12 questions from `arquetipos_estimulo.md` Table 4 (prompts verbatim, options/scores are new — no scored options are given in the reference doc, so write plausible 4-point-scale options per question and flag in your report that option wording/scoring needs institutional review before publish), and the 4 archetype descriptions (verbatim narrative from the reference doc's "Para o(a) respondente" sections). Leave `classification_rules` thresholds **empty** (all blank) except `default_archetype_code` — do not invent threshold numbers; that is explicitly the institution's decision per this plan's Global Constraints. Leave `status` as draft/unpublished.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/admin/diagnostico/page.tsx apps/web/app/admin/diagnostico/actions.ts scripts/application/admin-diagnostico-page.test.mjs
git commit -m "feat(admin): replace diagnostic JSON editor with a staged form and seed the archetype diagnostic"
```

---

### Task 6: Trilha archetype gating — schema + admin chips

**Files:**
- Create: `supabase/migrations/20260723150500_journey_eligible_archetypes.sql` (if not already applied as part of Task 1's guard)
- Modify: `apps/web/app/admin/produto/page.tsx`
- Modify: `apps/web/app/admin/produto/actions.ts`
- Create: `scripts/application/admin-produto-archetype-gating.test.mjs`

**Interfaces:**
- Produces: `catalog.journey_versions.eligible_archetype_codes text[]` (nullable; `null` or `'{}'` = open to everyone).
- Consumes/extends: `saveAdminProductResource({ resourceType: "journey", payload: { ...} })` — payload gains `eligible_archetype_codes: string[]`.

- [ ] **Step 1: Apply and verify the column migration**

```sql
alter table catalog.journey_versions add column if not exists eligible_archetype_codes text[];
comment on column catalog.journey_versions.eligible_archetype_codes is 'null or empty = open to all archetypes; otherwise restricts self-service enrollment to these archetype codes.';
```
Apply via `mcp__supabase__apply_migration` with `name: "journey_eligible_archetypes"`. Verify with `execute_sql`: `select column_name, data_type from information_schema.columns where table_schema='catalog' and table_name='journey_versions' and column_name='eligible_archetype_codes';`.

- [ ] **Step 2: Extend the `save_admin_product_resource` journey branch**

Read the current `journey` branch (`supabase/migrations/20260721143559_integral_admin_product_management.sql`, lines ~138-168) and re-`create or replace` the whole function (copy every other branch verbatim) with this branch changed to also persist the new column on both insert and update:

```sql
  if p_resource_type='journey' then
    -- ... existing v_definition_id / insert-or-update of catalog.journey_definitions, unchanged ...
    v_version_id:=nullif(p_payload->>'version_id','')::uuid;
    if v_version_id is null then
      select coalesce(max(version_number),0)+1 into v_next_version from catalog.journey_versions where journey_definition_id=v_definition_id;
      insert into catalog.journey_versions(id,journey_definition_id,version_number,status,title,description,configuration,schema_version,eligible_archetype_codes,created_by,created_at)
      values(gen_random_uuid(),v_definition_id,v_next_version,'draft',btrim(p_payload->>'title'),nullif(btrim(p_payload->>'description'),''),coalesce(p_payload->'configuration','{}'::jsonb),'1',
        (select array_agg(value) from jsonb_array_elements_text(coalesce(p_payload->'eligible_archetype_codes','[]'::jsonb)) as value),
        p_actor_user_account_id,now()) returning id into v_version_id;
    else
      update catalog.journey_versions set title=btrim(p_payload->>'title'),description=nullif(btrim(p_payload->>'description'),''),configuration=coalesce(p_payload->'configuration','{}'::jsonb),
        eligible_archetype_codes=(select array_agg(value) from jsonb_array_elements_text(coalesce(p_payload->'eligible_archetype_codes','[]'::jsonb)) as value)
      where id=v_version_id and journey_definition_id=v_definition_id and status='draft';
      if not found then raise exception 'JOURNEY_DRAFT_NOT_FOUND' using errcode='P0002'; end if;
    end if;
    v_result:=jsonb_build_object('definition_id',v_definition_id,'version_id',v_version_id);
    v_subject_id:=v_definition_id;
```
(Read the exact existing insert/update column list first — this plan reconstructs it from the read-side function; match the real current column order exactly rather than trust this snippet's ordering blindly.) Apply via `mcp__supabase__apply_migration` with `name: "journey_archetype_gating_save"`.

- [ ] **Step 3: Verify live**

Save a journey with `eligible_archetype_codes: ["fazedor", "navegador"]`, confirm the column round-trips via `execute_sql`. Save another with `eligible_archetype_codes: []`, confirm it stores as `null` or `'{}'` (either is fine as long as Task 7/8's eligibility check treats both as "open to all" — write that check accordingly, e.g. `eligible_archetype_codes is null or eligible_archetype_codes = '{}' or '<code>' = any(eligible_archetype_codes)`).

- [ ] **Step 4: Write the failing test, then the admin chips UI**

Create `scripts/application/admin-produto-archetype-gating.test.mjs`:
```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/admin/produto/page.tsx", "utf8");
const actions = await readFile("apps/web/app/admin/produto/actions.ts", "utf8");

test("journey form offers archetype eligibility chips", () => {
  assert.match(page, /eligible_archetype_codes/u);
  assert.match(page, /fazedor/u);
  assert.match(page, /batalhador/u);
  assert.match(page, /construtor/u);
  assert.match(page, /navegador/u);
});

test("journey save action forwards eligible_archetype_codes to the payload", () => {
  assert.match(actions, /eligible_archetype_codes/u);
});
```
Run it, confirm it fails, then add to the journey `<form>` in `admin/produto/page.tsx` (right after the `configuration` field):
```tsx
<fieldset className="grid gap-2">
  <legend className="text-sm font-medium text-ink">Arquétipos elegíveis (vazio = aberta para todos)</legend>
  <div className="flex flex-wrap gap-4">
    {[
      { code: "fazedor", icon: "🔨", name: "Fazedor(a)" },
      { code: "batalhador", icon: "💪", name: "Batalhador(a)" },
      { code: "construtor", icon: "🧱", name: "Construtor(a)" },
      { code: "navegador", icon: "🧭", name: "Navegador(a)" },
    ].map((archetype) => (
      <label key={archetype.code} className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="eligible_archetype_codes" value={archetype.code} className="size-4 accent-primary" />
        {archetype.icon} {archetype.name}
      </label>
    ))}
  </div>
</fieldset>
```
And in `admin/produto/actions.ts`'s `journey` payload branch, add:
```ts
eligible_archetype_codes: formData.getAll("eligible_archetype_codes").map(String),
```

- [ ] **Step 5: Run test to verify it passes, typecheck**

`node --test scripts/application/admin-produto-archetype-gating.test.mjs` → PASS. `npm run typecheck:web` → no errors.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260723150500_journey_eligible_archetypes.sql supabase/migrations/20260723150600_journey_archetype_gating_save.sql apps/web/app/admin/produto/page.tsx apps/web/app/admin/produto/actions.ts scripts/application/admin-produto-archetype-gating.test.mjs
git commit -m "feat(admin): let staff restrict a trilha to specific archetypes or leave it open to all"
```

---

### Task 7: Self-service enrollment RPC — no synthetic restriction, archetype-eligible only

**Files:**
- Create: `supabase/migrations/20260723150700_self_service_enrollment.sql`
- Modify: `apps/web/lib/journey-runtime/rpc.ts`

**Interfaces:**
- Produces: `public.e14_self_enroll(p_actor_user_account_id uuid, p_journey_version_id uuid, p_idempotency_key text) returns jsonb`; `public.e14_list_eligible_journeys(p_actor_user_account_id uuid) returns jsonb` (array of `{journey_version_id, title, description}` for published journeys the participant is eligible for and not yet enrolled in).
- Also modifies `app_private.e14_cmd_enroll` (drop the synthetic-only guard — keep the staff-permission requirement, this remains the admin ops tool but now works on any real participant).

- [ ] **Step 1: Remove the synthetic restriction from the existing admin enrollment path**

Read `supabase/migrations/20260709051922_m13c2_e14_enrollment_command.sql` in full. Re-`create or replace` `app_private.e14_cmd_enroll` with the exact same body **except** delete this line entirely:
```sql
 select profile_data into profile from core.entrepreneurs where id=p_person and status='active';
 if not found or coalesce((profile->>'synthetic')::boolean,false)=false or (profile->>'owner_organization_id')::uuid<>p_org then raise exception 'INTERNAL_PARTICIPANT_REQUIRED' using errcode='P0001'; end if;
```
Replace it with just an active-participant existence check (no synthetic requirement):
```sql
 if not exists (select 1 from core.entrepreneurs where id=p_person and status='active') then raise exception 'PARTICIPANT_NOT_FOUND' using errcode='P0002'; end if;
```
Also remove the now-unused `profile jsonb;` declaration. Apply via `mcp__supabase__apply_migration` with `name: "remove_synthetic_enrollment_restriction"`.

- [ ] **Step 2: Verify live**

Confirm the real, non-synthetic entrepreneur seen earlier in this session can now be enrolled via `select e14_create_enrollment('<staff_actor>','<org>','<real_entrepreneur_id>','<published_journey_version_id>','operator_ui',gen_random_uuid()::text);` without raising `INTERNAL_PARTICIPANT_REQUIRED`. Confirm it still raises `FORBIDDEN` for an actor lacking `journey.execution.manage`, and still raises `JOURNEY_NOT_PUBLISHED` for a draft journey version (both guards untouched).

- [ ] **Step 3: Apply the new self-service functions**

```sql
create or replace function app_private.e14_cmd_self_enroll(p_actor uuid,p_journey uuid,p_key_input text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;req jsonb;h text;ev uuid;ev2 uuid;enr uuid;inst uuid;owner_id uuid;jstatus text;replay boolean;person uuid;eligible text[];archetype_code text;
begin
 person:=app_private.e14_entrepreneur_for_account(p_actor);
 if person is null then raise exception 'PARTICIPANT_NOT_FOUND' using errcode='P0002'; end if;
 k:=app_private.e14_validate_idempotency_key(p_key_input);
 req:=jsonb_build_object('entrepreneur_id',person,'journey_version_id',p_journey,'source','participant_self_service');
 h:=app_private.e14_request_hash(req);
 enr:=app_private.e14_deterministic_uuid('e14:enrollment|'||person::text||'|'||p_journey::text);
 inst:=app_private.e14_deterministic_uuid('e14:journey-instance|'||enr::text);
 ev:=app_private.e14_command_event_id('CMD02-SELF',p_actor,enr,k);
 ev2:=app_private.e14_child_event_id(ev,'journey.instance.available',1);
 perform pg_advisory_xact_lock(hashtextextended('CMD02-SELF|'||p_actor::text||'|'||enr::text||'|'||k,0));
 replay:=app_private.e14_assert_idempotency(ev,h);
 if replay then return jsonb_build_object('request_id',ev,'idempotency_key',k,'replayed',true,'data',jsonb_build_object('enrollment_id',enr,'journey_instance_id',inst,'status',(select status from orchestration.journey_instances where id=inst))); end if;
 select jv.status,jd.owner_organization_id,jv.eligible_archetype_codes into jstatus,owner_id,eligible from catalog.journey_versions jv join catalog.journey_definitions jd on jd.id=jv.journey_definition_id where jv.id=p_journey;
 if not found then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002'; end if;
 if jstatus<>'published' then raise exception 'JOURNEY_NOT_PUBLISHED' using errcode='P0001'; end if;
 if eligible is not null and array_length(eligible,1) > 0 then
   select ad.code into archetype_code
     from diagnostics.archetype_assignments aa
     join diagnostics.archetype_versions av on av.id = aa.primary_archetype_version_id
     join diagnostics.archetype_definitions ad on ad.id = av.archetype_definition_id
    where aa.entrepreneur_id = person order by aa.assigned_at desc limit 1;
   if archetype_code is null or not (archetype_code = any(eligible)) then raise exception 'ARCHETYPE_NOT_ELIGIBLE' using errcode='P0001'; end if;
 end if;
 insert into orchestration.enrollments(id,entrepreneur_id,business_id,journey_version_id,cohort_id,source,status,assigned_at,aggregate_version) values(enr,person,null,p_journey,null,'participant_self_service','assigned',now(),0) on conflict(id) do nothing;
 insert into orchestration.journey_instances(id,enrollment_id,status,aggregate_version) values(inst,enr,'available',0) on conflict(enrollment_id) do nothing;
 insert into orchestration.progress_projections(journey_instance_id,completed_required_steps,total_required_steps,completion_ratio,current_step_id,last_activity_at,projection_version) values(inst,0,1,0,null,null,0) on conflict(journey_instance_id) do nothing;
 perform app_private.e14_append_event(ev,'journey.enrollment.created','enrollment',enr,'user_account',p_actor,owner_id,inst,'enrollment',enr,0,ev,null,jsonb_build_object('request_hash',h,'idempotency_key',k,'entrepreneur_id',person,'journey_version_id',p_journey));
 perform app_private.e14_append_event(ev2,'journey.instance.available','journey_instance',inst,'user_account',p_actor,owner_id,inst,'journey_instance',inst,0,ev,ev,jsonb_build_object('enrollment_id',enr));
 return jsonb_build_object('request_id',ev,'idempotency_key',k,'replayed',false,'data',jsonb_build_object('enrollment_id',enr,'journey_instance_id',inst,'enrollment_status','assigned','journey_status','available','progress',0));
end;$$;

create or replace function public.e14_self_enroll(p_actor_user_account_id uuid,p_journey_version_id uuid,p_idempotency_key text)
returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_cmd_self_enroll($1,$2,$3)$$;
revoke all on function app_private.e14_cmd_self_enroll(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.e14_self_enroll(uuid,uuid,text) from public,anon;
grant execute on function public.e14_self_enroll(uuid,uuid,text) to authenticated,service_role,app_worker;

create or replace function public.e14_list_eligible_journeys(p_actor_user_account_id uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 with person as (select app_private.e14_entrepreneur_for_account(p_actor_user_account_id) as id),
 archetype as (
   select ad.code from diagnostics.archetype_assignments aa
   join diagnostics.archetype_versions av on av.id = aa.primary_archetype_version_id
   join diagnostics.archetype_definitions ad on ad.id = av.archetype_definition_id
   where aa.entrepreneur_id = (select id from person)
   order by aa.assigned_at desc limit 1
 ),
 already_enrolled as (
   select en.journey_version_id from orchestration.enrollments en where en.entrepreneur_id = (select id from person)
 )
 select coalesce(jsonb_agg(jsonb_build_object('journey_version_id',jv.id,'title',jv.title,'description',jv.description,'open_to_all',(jv.eligible_archetype_codes is null or array_length(jv.eligible_archetype_codes,1) is null)) order by jv.title),'[]'::jsonb)
 from catalog.journey_versions jv
 where jv.status='published'
   and jv.id not in (select journey_version_id from already_enrolled)
   and (jv.eligible_archetype_codes is null or array_length(jv.eligible_archetype_codes,1) is null or (select code from archetype) = any(jv.eligible_archetype_codes))
$$;
revoke all on function public.e14_list_eligible_journeys(uuid) from public,anon;
grant execute on function public.e14_list_eligible_journeys(uuid) to authenticated,service_role,app_worker;
```

Apply via `mcp__supabase__apply_migration` with `name: "self_service_enrollment"`.

- [ ] **Step 4: Verify live — at least 3 cases**

Using the real (non-synthetic) test entrepreneur: (a) call `e14_self_enroll` for a published, open-to-all journey (`eligible_archetype_codes` null) with no prior archetype assignment for this participant — must succeed. (b) call it for a journey restricted to `["fazedor"]` when the participant's latest `archetype_assignments` row resolves to a different archetype (or has none) — must raise `ARCHETYPE_NOT_ELIGIBLE`. (c) after inserting a matching `archetype_assignments` row for `fazedor`, retry the same call — must succeed. (d) call `e14_list_eligible_journeys` before and after enrolling and confirm the enrolled journey drops out of the list. Clean up throwaway enrollment/instance/progress/assignment rows afterward.

- [ ] **Step 5: Add TypeScript wrappers**

In `apps/web/lib/journey-runtime/rpc.ts`, add near `createEnrollment`:
```ts
export type EligibleJourney = { journey_version_id: string; title: string; description: string | null; open_to_all: boolean };

selfEnroll: (actor: string, journeyVersionId: string, key: string) =>
  invoke<RpcEnvelope<{ enrollment_id: string; journey_instance_id: string }>>("e14_self_enroll", {
    p_actor_user_account_id: actor,
    p_journey_version_id: journeyVersionId,
    p_idempotency_key: key
  }),

listEligibleJourneys: (actor: string) => invoke<EligibleJourney[]>("e14_list_eligible_journeys", {
  p_actor_user_account_id: actor
}),
```
(Add these two entries inside the existing `journeyRuntime` object literal, alongside `createEnrollment`/`listParticipantJourneys`.)

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260723150700_self_service_enrollment.sql apps/web/lib/journey-runtime/rpc.ts
git commit -m "feat(journeys): add real self-service enrollment gated by archetype eligibility, remove synthetic-only restriction"
```

---

### Task 8: Participant "Trilhas" catalog page

**Files:**
- Create: `apps/web/app/empreendedor/trilhas/page.tsx`
- Create: `apps/web/app/actions/enrollment.ts`
- Modify: `apps/web/app/empreendedor/page.tsx` (add a link to the new page)
- Create: `scripts/application/participant-trilhas-catalog.test.mjs`

**Interfaces:**
- Consumes: `journeyRuntime.listEligibleJourneys`, `journeyRuntime.selfEnroll` (Task 7).
- Produces: a new route showing two sections — trilhas matching the participant's archetype, and trilhas open to everyone — each with an "Entrar nesta trilha" button.

- [ ] **Step 1: Write the failing test**

Create `scripts/application/participant-trilhas-catalog.test.mjs`:
```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/empreendedor/trilhas/page.tsx", "utf8");
const home = await readFile("apps/web/app/empreendedor/page.tsx", "utf8");
const actions = await readFile("apps/web/app/actions/enrollment.ts", "utf8");

test("trilhas catalog page fetches eligible journeys and offers a self-enroll action", () => {
  assert.match(page, /listEligibleJourneys/u);
  assert.match(page, /selfEnrollAction|selfEnroll/u);
  assert.match(page, /Entrar nesta trilha/u);
});

test("trilhas catalog separates archetype-matched trilhas from open-to-all trilhas", () => {
  assert.match(page, /open_to_all/u);
});

test("participant home links to the trilhas catalog", () => {
  assert.match(home, /\/empreendedor\/trilhas/u);
});

test("self-enroll server action requires authentication and calls journeyRuntime.selfEnroll", () => {
  assert.match(actions, /getAuthContext/u);
  assert.match(actions, /selfEnroll/u);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/application/participant-trilhas-catalog.test.mjs`
Expected: FAIL (none of these files exist yet).

- [ ] **Step 3: Create `apps/web/app/actions/enrollment.ts`**

```ts
"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";

const uuid = z.string().uuid();

export async function selfEnrollAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar");
  const journeyVersionId = uuid.parse(formData.get("journey_version_id"));
  const key = String(formData.get("idempotency_key") || randomUUID());
  try {
    await journeyRuntime.selfEnroll(auth.identity.user_account_id, journeyVersionId, key);
  } catch {
    redirect("/empreendedor/trilhas?erro=matricula");
  }
  redirect("/empreendedor?matricula=criada");
}
```

- [ ] **Step 4: Create `apps/web/app/empreendedor/trilhas/page.tsx`**

```tsx
import { randomUUID } from "node:crypto";
import { Compass } from "lucide-react";
import { selfEnrollAction } from "@/app/actions/enrollment";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPanel } from "@/components/status-panel";
import { getAuthContext } from "@/lib/auth/context";
import { journeyRuntime, type EligibleJourney } from "@/lib/journey-runtime/rpc";

export default async function TrilhasCatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;

  const journeys = await journeyRuntime.listEligibleJourneys(auth.identity.user_account_id);
  const matched = journeys.filter((journey: EligibleJourney) => !journey.open_to_all);
  const open = journeys.filter((journey: EligibleJourney) => journey.open_to_all);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-9 lg:py-10">
      <PageHeader eyebrow="Capacitação" title="Trilhas disponíveis" description="Escolha uma trilha para começar. Você pode entrar em mais de uma." />

      {query.erro ? <StatusPanel title="Não foi possível entrar nesta trilha" tone="warning"><p>Tente novamente em instantes.</p></StatusPanel> : null}

      {journeys.length === 0 ? (
        <EmptyState icon={<Compass size={24} />} title="Nenhuma trilha disponível agora" tone="info" className="mt-8">
          Novas trilhas aparecem aqui assim que forem publicadas.
        </EmptyState>
      ) : null}

      {matched.length ? (
        <section className="mt-8 grid gap-4" aria-labelledby="trilhas-arquetipo-titulo">
          <h2 id="trilhas-arquetipo-titulo" className="text-xl font-black text-secondary">Trilhas para o seu perfil</h2>
          <JourneyGrid journeys={matched} />
        </section>
      ) : null}

      {open.length ? (
        <section className="mt-8 grid gap-4" aria-labelledby="trilhas-abertas-titulo">
          <h2 id="trilhas-abertas-titulo" className="text-xl font-black text-secondary">Trilhas abertas para todos</h2>
          <JourneyGrid journeys={open} />
        </section>
      ) : null}
    </div>
  );
}

function JourneyGrid({ journeys }: { journeys: EligibleJourney[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {journeys.map((journey) => (
        <Card key={journey.journey_version_id} className="flex flex-col">
          <h3 className="font-bold text-secondary">{journey.title}</h3>
          {journey.description ? <p className="mt-2 text-sm text-muted">{journey.description}</p> : null}
          <form action={selfEnrollAction} className="mt-auto pt-4">
            <input type="hidden" name="journey_version_id" value={journey.journey_version_id} />
            <input type="hidden" name="idempotency_key" value={randomUUID()} />
            <Button type="submit" size="sm">Entrar nesta trilha</Button>
          </form>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Link from the participant home**

In `apps/web/app/empreendedor/page.tsx`, add a link near the "Outras jornadas" section (or in the header) to `/empreendedor/trilhas`, e.g. right after the `<h1>` in the `<header>`:
```tsx
<Link href="/empreendedor/trilhas" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">
  Ver todas as trilhas disponíveis
</Link>
```

- [ ] **Step 6: Run test to verify it passes, typecheck**

`node --test scripts/application/participant-trilhas-catalog.test.mjs` → PASS. `npm run typecheck:web` → no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/empreendedor/trilhas/page.tsx apps/web/app/actions/enrollment.ts apps/web/app/empreendedor/page.tsx scripts/application/participant-trilhas-catalog.test.mjs
git commit -m "feat(participant): add self-service trilhas catalog filtered by archetype eligibility"
```

---

## Self-Review

**1. Spec coverage:** Covers every item from the user's confirmed decisions this session: admin-editable classification formula (Task 2 + 5, thresholds are pure data, never hardcoded), catalog behavior showing archetype-matched + open-to-all trilhas with participant choosing (Task 8), removal of the synthetic-only restriction everywhere (Task 7 Step 1), real participant self-enrollment (Task 7+8). Also closes the three gaps discovered live this session: diagnostic versions could never publish (Task 2), the admin read RPC couldn't load existing content (Task 1), and archetype classification was fully unwired (Tasks 3-4).

**2. Placeholder scan:** No TBD/TODO. The one deliberately-left-blank value is classification thresholds themselves (Task 5 Step 6) — that is a named, explicit exclusion (institutional decision, not a planning gap), not a placeholder.

**3. Type consistency:** `EligibleJourney` (Task 7 Step 5) is defined once in `rpc.ts` and reused verbatim in Task 8's page. `classification_rules` shape (`{default_archetype_code, rules: [{archetype_code, priority, thresholds}]}`) is identical across Task 2 (storage), Task 4 (`e14_archetype_c` reads it), and Task 5 (form writes it) — checked for drift.

**4. Sequencing risk:** Task 1's migration references `eligible_archetype_codes`, which Task 6 creates. Flagged inline in Task 1 with an explicit guard (`add column if not exists` inline) so tasks can run in file order without a hard dependency stall.

**5. Known follow-up, not blocking:** Task 4 Step 4 notes that a true end-to-end live test (real participant completing a real diagnostic through the UI and getting an `archetype_assignments` row) can only happen after Task 7/8 land — call this out explicitly when Task 4 finishes before Task 7/8 in execution order, and circle back.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-23-frente-3-4-diagnostico-arquetipo-gating.md`. Given the standing instruction for this session (subagent-driven, commit at every checkpoint, merge deferred to the end), proceed directly with **Subagent-Driven Development**: dispatch Task 1 first (it's the least risky, purely additive read-side change), then Tasks 2-4 in order (each depends on the previous one's schema), then Task 5 (depends on 1+2), then Task 6 (independent, can run anytime), then Task 7 (depends on 6), then Task 8 (depends on 7). Every SQL-touching task must be applied and verified against the live Supabase MCP connection before its task review — not hand-traced only.
