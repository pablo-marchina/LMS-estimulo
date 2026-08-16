import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layout = await readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/layout.tsx", "utf8");
const stylesheet = await readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/layout.module.css", "utf8");
const frame = await readFile("apps/web/components/activity-workspace-frame.tsx", "utf8");
const lesson = await readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx", "utf8");
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

test("inline journey removes the duplicate lesson chrome structurally", () => {
  assert.match(journey, /<section id="aula" className="scroll-mt-20"/u);
  assert.doesNotMatch(journey, />Conteúdo aberto<\/p>/u);
  assert.doesNotMatch(journey, /Fechar conteúdo/u);
  assert.match(journey, /conclusao: query\.conclusao/u);
});

test("lesson actions remain inline and preserve the interaction anchor", () => {
  assert.match(actions, /inlineActivityHref/u);
  assert.match(actions, /utilidade=registrada/u);
  assert.match(actions, /"utilidade"/u);
  assert.match(actions, /avaliacao=reprovada/u);
  assert.doesNotMatch(actions, /comentario=criado/u);
});
