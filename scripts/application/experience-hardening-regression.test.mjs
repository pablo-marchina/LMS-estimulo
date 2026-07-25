import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");
const [signup, signupAction, preview, globals, legacyMotion, participantShell, adminShell, adminHome, product, library, diagnostic, points, gateway] = await Promise.all([
  read("apps/web/app/cadastro/page.tsx"),
  read("apps/web/app/cadastro/actions.ts"),
  read("apps/web/components/file-upload-preview.tsx"),
  read("apps/web/app/globals.css"),
  read("apps/web/app/brand-motion.css"),
  read("apps/web/components/participant-shell.tsx"),
  read("apps/web/components/admin-shell.tsx"),
  read("apps/web/app/admin/page.tsx"),
  read("apps/web/app/admin/produto/page.tsx"),
  read("apps/web/app/capacitacao/biblioteca/page.tsx"),
  read("apps/web/app/admin/diagnostico/page.tsx"),
  read("apps/web/app/empreendedor/engajamento/page.tsx"),
  read("supabase/functions/authenticated-rpc/index.ts"),
]);

test("initial signup collects protected identity and contact data", () => {
  assert.match(signup, /name="cpf"/u);
  assert.match(signup, /name="telefone"/u);
  assert.match(signup, /name="cnpj"/u);
  assert.match(signupAction, /protectCpf/u);
  assert.match(signupAction, /signup_cpf_encrypted/u);
  assert.match(signupAction, /toE164Br/u);
});

test("upload fields provide image PDF and generic previews", () => {
  assert.match(preview, /URL\.createObjectURL/u);
  assert.match(preview, /type="application\/pdf"/u);
  assert.match(preview, /clearSelection/u);
});

test("brand system avoids multicolor gradient declarations", () => {
  assert.doesNotMatch(globals, /linear-gradient\([^)]*,[^)]*,[^)]*\)/u);
  assert.doesNotMatch(legacyMotion, /linear-gradient|conic-gradient/u);
  assert.match(globals, /background-color:\s*var\(--color-primary\)/u);
});

test("participant and admin navigation use top bars", () => {
  assert.match(participantShell, /sticky top-0/u);
  assert.match(adminShell, /sticky top-0/u);
  assert.doesNotMatch(adminShell, /<aside/u);
});

test("admin home and builders use Estimulo context without organization selectors", () => {
  assert.match(adminHome, /administrativeOrganization/u);
  assert.doesNotMatch(adminHome, /name="organization"/u);
  assert.match(product, /1\. Jornada/u);
  assert.match(product, /2\. Trilhas/u);
  assert.match(product, /3\. Aulas/u);
  assert.match(product, /4\. Publicar/u);
  assert.doesNotMatch(diagnostic, /name="organization"/u);
});

test("library explains paths belong to journeys and points follow admin rules", () => {
  assert.match(library, /Trilhas e aulas ficam na área Jornadas/u);
  assert.match(points, /Como ganhar pontos/u);
  assert.match(points, /participantPointRules/u);
});

test("authenticated runtime allows journey discovery self enrollment and diagnostic fallback", () => {
  assert.match(gateway, /"e14_list_eligible_journeys"/u);
  assert.match(gateway, /"e14_self_enroll"/u);
  assert.match(gateway, /"get_participant_experience_with_default_diagnostic"/u);
});