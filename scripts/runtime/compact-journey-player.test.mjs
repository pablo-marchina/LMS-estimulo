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

test("journey lessons no longer expose supplemental text or prompt editors", () => {
  assert.doesNotMatch(builder, /Texto complementar/u);
  assert.doesNotMatch(builder, /Prompts prontos/u);
  assert.doesNotMatch(builder, /section_heading_/u);
  assert.doesNotMatch(builder, /prompt_title_/u);
  assert.doesNotMatch(contentFields, /ConfigurationPreview/u);
  assert.match(actions, /content_sections: _oldSections/u);
  assert.match(actions, /prompts: _oldPrompts/u);
  assert.doesNotMatch(actions, /section_heading_/u);
  assert.doesNotMatch(actions, /prompt_title_/u);
});

test("activity navigation follows the ordered journey outline", () => {
  assert.match(navigation, /getParticipantJourneyOutline/u);
  assert.match(navigation, /module_position/u);
  assert.match(navigation, /previousActivity/u);
  assert.match(navigation, /nextActivity/u);
  assert.match(navigation, /openJourneyActivityAction/u);
  assert.match(navigation, /\/empreendedor\/resultado\?journey=/u);
  assert.match(navigation, /ver resultado/iu);
});

test("participant activity player is compact and videos have rounded corners", () => {
  assert.match(mediaCss, /border-radius: 1rem/u);
  assert.match(mediaCss, /main:has\(#utilidade\):has\(#comentarios\)/u);
  assert.match(mediaCss, /grid-template-columns: minmax\(0, 1\.65fr\)/u);
  assert.match(mediaCss, /#conteudo/u);
  assert.match(mediaCss, /#verificacao/u);
  assert.match(pageHeader, /participant \? "mb-4 gap-3"/u);
  assert.match(pageHeader, /layoutVariant === "compact" \? "p-4 sm:p-5"/u);
  assert.match(pageHeader, /hasMedia && layoutVariant === "hero"/u);
});
