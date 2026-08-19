import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");
const [builder, contentFields, actions, navigation, mediaCss, pageHeader] = await Promise.all([
  read("apps/web/app/admin/produto/trilha-aula-builder.tsx"),
  read("apps/web/app/admin/produto/activity-content-fields.tsx"),
  read("apps/web/app/admin/produto/actions.ts"),
  read("apps/web/components/journey-progress-nav.tsx"),
  read("apps/web/app/responsive-media.css"),
  read("apps/web/components/ui/page-header.tsx"),
]);

test("journey lessons remove supplemental text while preserving the restored prompt library", () => {
  assert.doesNotMatch(builder, /Texto complementar/u);
  assert.doesNotMatch(builder, /section_heading_/u);
  assert.match(builder, /Prompts prontos/u);
  assert.match(builder, /Biblioteca de prompts desta aula/u);
  assert.match(builder, /prompt_title_/u);
  assert.match(builder, /prompt_text_/u);
  assert.doesNotMatch(contentFields, /ConfigurationPreview/u);
  assert.match(actions, /content_sections: _oldSections/u);
  assert.match(actions, /prompts: _oldPrompts/u);
  assert.doesNotMatch(actions, /section_heading_/u);
  assert.match(actions, /prompt_title_/u);
  assert.match(actions, /prompt_text_/u);
  assert.match(actions, /\.\.\.\(prompts\.length \? \{ prompts \} : \{\}\)/u);
});

test("activity navigation follows the ordered journey outline", () => {
  assert.match(navigation, /getParticipantJourneyOutline/u);
  assert.match(navigation, /module_position/u);
  assert.match(navigation, /previousActivity/u);
  assert.match(navigation, /nextActivity/u);
  assert.match(navigation, /openJourneyActivityAction/u);
  assert.match(navigation, /Ver resultado/u);
});

test("participant activity player is compact and videos have rounded corners", () => {
  assert.match(mediaCss, /border-radius: 1rem/u);
  assert.match(mediaCss, /main:has\(#utilidade\):has\(#comentarios\)/u);
  assert.match(mediaCss, /grid-template-columns: minmax\(0, 1\.65fr\)/u);
  assert.match(mediaCss, /#conteudo/u);
  assert.match(mediaCss, /#verificacao/u);
  assert.match(pageHeader, /if \(participant\)/u);
  assert.match(pageHeader, /border-b border-slate-200 pb-6/u);
  assert.match(pageHeader, /layoutVariant === "compact" \? "p-4 sm:p-5"/u);
  assert.match(pageHeader, /hasMedia && layoutVariant === "hero"/u);
});
