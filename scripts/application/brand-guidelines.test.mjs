import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [layout, brandCss, brandComponent, shell] = await Promise.all([
  readFile("apps/web/app/layout.tsx", "utf8"),
  readFile("apps/web/app/brand-system.css", "utf8"),
  readFile("apps/web/components/estimulo-brand.tsx", "utf8"),
  readFile("apps/web/components/app-shell.tsx", "utf8")
]);

const officialPalette = [
  "#4bd3f4",
  "#0098fc",
  "#ff66ff",
  "#57d988",
  "#1d9479",
  "#0023da",
  "#ba1bbf",
  "#00008d",
  "#4e79ff"
];

test("brand system uses the official Estímulo palette and Poppins", () => {
  for (const color of officialPalette) assert.match(brandCss.toLowerCase(), new RegExp(color));
  assert.match(brandCss, /fonts\.googleapis\.com\/css2\?family=Poppins/u);
  assert.match(brandCss, /font-family\s*:\s*Poppins/u);
  assert.match(layout, /themeColor: "#4E79FF"/u);
  assert.match(layout, /import "\.\/brand-system\.css"/u);
});

test("official horizontal logo keeps clear space and is not redrawn", () => {
  assert.match(brandComponent, /OFFICIAL_ESTIMULO_LOGO_URL/u);
  assert.match(brandComponent, /brand-logo-clearspace/u);
  assert.doesNotMatch(brandComponent, /brand-mark|lettering|<svg/u);
  assert.match(brandCss, /padding\s*:\s*6px 10px/u);
  assert.doesNotMatch(brandCss, /brand-logo-clearspace[^}]*background:/su);
  assert.match(shell, /app-brand-cluster/u);
  assert.match(shell, /app-header__inner/u);
});

test("complementary brand element is large, cropped and decorative", () => {
  assert.match(brandCss, /page-heading::before/u);
  assert.match(brandCss, /dashboard-next::before/u);
  assert.match(brandCss, /auth-page::before/u);
  assert.match(brandCss, /conic-gradient/u);
  assert.match(brandCss, /overflow\s*:\s*hidden/u);
  assert.match(brandCss, /-webkit-mask\s*:\s*radial-gradient/u);
});

test("brand styling preserves accessibility and responsive behavior", () => {
  assert.match(brandCss, /:focus-visible/u);
  assert.match(brandCss, /prefers-reduced-motion/u);
  assert.match(brandCss, /@media\s*\(max-width\s*:\s*760px\)/u);
  assert.match(brandCss, /min-width\s*:\s*320px/u);
  assert.match(shell, /aria-label="Navegação principal"/u);
  assert.match(shell, /Pular para o conteúdo/u);
});
