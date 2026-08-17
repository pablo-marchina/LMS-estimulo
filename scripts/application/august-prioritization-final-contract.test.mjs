import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  rewardsExperience,
  adminRewards,
  adminExtensionActions,
  rewardActions,
  journeyAction,
  journeyErrorPage,
  lessonPage,
  completionAction,
  resultPage,
  shareAction,
  behaviorEventsRoute,
] = await Promise.all([
  readFile("apps/web/app/empreendedor/recompensas/rewards-experience.tsx", "utf8"),
  readFile("apps/web/app/admin/recompensas/page.tsx", "utf8"),
  readFile("apps/web/app/admin/extension-actions.ts", "utf8"),
  readFile("apps/web/app/admin/recompensas/reward-actions.ts", "utf8"),
  readFile("apps/web/app/admin/produto/journey-action.ts", "utf8"),
  readFile("apps/web/app/admin/produto/erro/page.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/completion-action.ts", "utf8"),
  readFile("apps/web/app/empreendedor/resultado/page.tsx", "utf8"),
  readFile("apps/web/components/share-action.tsx", "utf8"),
  readFile("apps/web/app/api/behavior-events/route.ts", "utf8"),
]);

test("reward catalog exposes remaining availability, compact descriptions and points without a cost label", () => {
  assert.match(rewardsExperience, /stock === null \? "Disponibilidade contínua"/u);
  assert.match(rewardsExperience, /disponíveis/u);
  assert.match(rewardsExperience, /line-clamp-4/u);
  assert.match(rewardsExperience, /Ler mais…/u);
  assert.match(rewardsExperience, /\{cost\} pontos/u);
  assert.doesNotMatch(rewardsExperience, />Custo</u);
});

test("reward ordering is configurable, persisted through the image-aware save flow and honored in the participant catalog", () => {
  assert.match(adminRewards, /name="display_order"/u);
  assert.match(adminRewards, /Ordem de exibição/u);
  assert.match(adminExtensionActions, /display_order: Math\.max\(0, numeric\(formData, "display_order", 100\)\)/u);
  assert.match(rewardActions, /fulfillment_configuration: \{ instructions: text\(formData, "delivery_instructions"\), fields, display_order:/u);
  assert.match(rewardsExperience, /rewardOrder\(left\) - rewardOrder\(right\)/u);
});

test("journey admin keeps concrete upload failures and turns them into actionable correction guidance", () => {
  assert.match(journeyAction, /ANNOUNCEMENT_FILE_SIZE_INVALID/u);
  assert.match(journeyAction, /imagem_tamanho_invalido/u);
  assert.match(journeyAction, /\/admin\/produto\/erro\?codigo=/u);
  assert.match(journeyErrorPage, /A imagem ultrapassa o limite permitido/u);
  assert.match(journeyErrorPage, /Tamanho máximo/u);
  assert.match(journeyErrorPage, /PNG, JPG\/JPEG ou WebP/u);
  assert.match(journeyErrorPage, /Voltar e corrigir/u);
});

test("lesson completion stays actionable and blocked outcomes focus the missing requirement inside the canonical lesson route", () => {
  assert.match(lessonPage, /disabled=\{completed\}/u);
  assert.match(lessonPage, /id="conteudo"/u);
  assert.match(lessonPage, /id="avaliacao"/u);
  assert.match(lessonPage, /id="pratica"/u);
  assert.match(completionAction, /conteudo_pendente: "conteudo"/u);
  assert.match(completionAction, /avaliacao_pendente: "avaliacao"/u);
  assert.match(completionAction, /pratica_pendente: "pratica"/u);
  assert.match(completionAction, /redirect\(`\/empreendedor\/atividade\/\$\{step\}\?journey=\$\{journey\}&conclusao=\$\{outcome\}#\$\{completionAnchor\[outcome\]\}`\)/u);
});

test("certificate and diagnostic sharing use the gamified social-share event path", () => {
  assert.match(resultPage, /entityType="certificate"/u);
  assert.match(resultPage, /Compartilhar diagnóstico/u);
  assert.match(resultPage, /entityType="diagnostic_result"/u);
  assert.match(shareAction, /interaction_type: "social_share"/u);
  assert.match(behaviorEventsRoute, /interactionType === "social_share"/u);
  assert.match(behaviorEventsRoute, /action: "social_share"/u);
});
