import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [visualCapture, operationPage, announcementCarousel] = await Promise.all([
  readFile("scripts/e2e/production-visual-capture.mjs", "utf8"),
  readFile("apps/web/app/admin/operacao/page.tsx", "utf8"),
  readFile("apps/web/components/announcement-carousel.tsx", "utf8"),
]);

test("participant visual seeds follow the current information architecture", () => {
  for (const currentRoute of [
    "/empreendedor/jornadas",
    "/empreendedor/recompensas",
    "/empreendedor/biblioteca",
    "/empreendedor/perfil",
  ]) {
    assert.match(visualCapture, new RegExp(`^\\s+"${currentRoute}",$`, "mu"));
  }

  for (const removedStaticSeed of [
    "/empreendedor/competencias",
    "/empreendedor/mais",
    "/empreendedor/pontuacao",
    "/empreendedor/trilhas",
    "/empreendedor/validacao",
  ]) {
    assert.doesNotMatch(visualCapture, new RegExp(`^\\s+"${removedStaticSeed}",$`, "mu"));
  }

  assert.match(visualCapture, /rendered semantic not-found state/u);
});

test("visual coverage keeps semantic query states but collapses repeated UUID instances", () => {
  assert.match(visualCapture, /const uuidQueryValue =/u);
  assert.match(visualCapture, /function normalizedCoverageSearch\(search\)/u);
  assert.match(visualCapture, /params\.set\(key, "__uuid__"\)/u);
  assert.match(visualCapture, /normalizedCoverageSearch\(search\)/u);
  assert.match(visualCapture, /return `\$\{url\.pathname\}\$\{url\.search\}`;/u);
});

test("visual capture remains fail-closed when semantic or runtime failures exist", () => {
  assert.match(visualCapture, /if \(manifest\.failures\.length\)/u);
  assert.match(visualCapture, /process\.exitCode = 1/u);
  assert.match(visualCapture, /Evidence was still uploaded/u);
});

test("image-only home banners preserve the complete artwork instead of cropping it", () => {
  assert.match(announcementCarousel, /const imageOnly = announcement\.display_mode === "image_only"/u);
  assert.match(announcementCarousel, /style=\{imageOnly \? \{ objectFit: "contain", transform: "none", backgroundColor: "white" \} : undefined\}/u);
});

test("operation evidence cannot force horizontal overflow with technical identifiers", () => {
  assert.match(operationPage, /className="grid min-w-0 gap-6"/u);
  assert.match(operationPage, /className="min-w-0 break-all text-sm text-muted"/u);
  assert.match(operationPage, /className="mt-2 grid min-w-0 gap-4"/u);
  assert.match(operationPage, /className="grid min-w-0 gap-3 sm:grid-cols-2"/u);
  assert.match(operationPage, /className="mt-1 break-all text-sm text-ink"/u);
});
