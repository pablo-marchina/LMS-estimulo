import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layout = await readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/layout.tsx", "utf8");
const stylesheet = await readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/layout.module.css", "utf8");
const frame = await readFile("apps/web/components/activity-workspace-frame.tsx", "utf8");
const lesson = await readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx", "utf8");
const participantShell = await readFile("apps/web/components/participant-shell.tsx", "utf8");
const promptLibrary = await readFile("apps/web/components/activity-prompt-library.tsx", "utf8");
const quickCheck = await readFile("apps/web/components/quick-check-panel.tsx", "utf8");
const journey = await readFile("apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx", "utf8");
const actions = await readFile("apps/web/app/actions/journey.ts", "utf8");

test("activity route is a continuous lesson workspace", () => {
  assert.match(layout, /data-activity-workspace/u);
  assert.match(layout, /data-activity-page/u);
  assert.doesNotMatch(layout, /ActivityCompactWorkspace/u);
  assert.doesNotMatch(layout, /data-active-section/u);
  assert.doesNotMatch(frame, /ActivityCompactWorkspace/u);

  assert.match(lesson, /max-w-\[1100px\]/u);
  assert.match(lesson, /Marcar como concluída/u);
  assert.match(lesson, /O que achou desta aula/u);
  assert.match(lesson, /Converse sobre esta aula/u);
  assert.doesNotMatch(lesson, /ActivityContentProgress/u);
  assert.doesNotMatch(lesson, /Índice da aula/u);
  assert.doesNotMatch(lesson, /300px/u);

  assert.doesNotMatch(stylesheet, /data-active-section/u);
  assert.doesNotMatch(stylesheet, /18rem/u);
  assert.doesNotMatch(stylesheet, /position: sticky/u);
  assert.doesNotMatch(stylesheet, /#aula:has/u);
});

test("lesson sections read as one aligned visual surface", () => {
  assert.match(lesson, /overflow-hidden rounded-\[1\.75rem\] border border-border bg-white shadow-sm/u);
  assert.match(lesson, /eyebrow="Conteúdo"/u);
  assert.match(lesson, /eyebrow="Verificação"/u);
  assert.match(lesson, /eyebrow="Prática"/u);
  assert.match(lesson, /eyebrow="Finalização"/u);
  assert.match(lesson, /eyebrow="Discussão"/u);
  assert.match(lesson, /bg-surface-muted\/45/u);
  assert.match(lesson, /completionTarget === "conteudo_pendente"/u);
  assert.match(lesson, /completionTarget === "avaliacao_pendente"/u);
  assert.match(lesson, /completionTarget === "pratica_pendente"/u);
  assert.match(stylesheet, /main > #prompts/u);
  assert.match(stylesheet, /min-width: 0/u);
  assert.match(promptLibrary, /px-4 py-4 sm:px-6 sm:py-5/u);
  assert.match(promptLibrary, /p-4 sm:p-6 lg:grid-cols-2/u);
  assert.match(quickCheck, /embedded = true/u);
  assert.match(quickCheck, /\{embedded \? \(/u);
});

test("entering a dedicated lesson resets inherited journey scroll", () => {
  assert.match(participantShell, /pathname\.startsWith\("\/empreendedor\/atividade\/"\)/u);
  assert.match(participantShell, /window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/u);
  assert.match(participantShell, /requestAnimationFrame\(resetScroll\)/u);
  assert.match(participantShell, /\[pathname, wideLesson\]/u);
});

test("journey never embeds the lesson workspace below its own hero", () => {
  assert.match(journey, /if \(query\.conteudo && selectedActivity\)/u);
  assert.match(journey, /redirect\(`\/empreendedor\/atividade\/\$\{selectedActivity\.step_instance_id\}/u);
  assert.doesNotMatch(journey, /<section id="aula"/u);
  assert.doesNotMatch(journey, /ActivityWorkspaceFrame/u);
  assert.doesNotMatch(journey, /import ActivityPage/u);
});

test("lesson actions remain on the dedicated activity route and preserve interaction anchors", () => {
  assert.match(actions, /function activityHref/u);
  assert.match(actions, /`\/empreendedor\/atividade\/\$\{step\}\?journey=\$\{journey\}/u);
  assert.match(actions, /utilidade=registrada/u);
  assert.match(actions, /"utilidade"/u);
  assert.match(actions, /avaliacao=reprovada/u);
  assert.doesNotMatch(actions, /comentario=criado/u);
  assert.doesNotMatch(actions, /\?conteudo=\$\{step\}/u);
});
