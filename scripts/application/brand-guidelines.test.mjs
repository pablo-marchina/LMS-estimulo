import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  layout,
  brandCss,
  brandComponent,
  shell,
  horizontalLogo,
  symbol,
  dots,
  chevrons
] = await Promise.all([
  readFile("apps/web/app/layout.tsx", "utf8"),
  readFile("apps/web/app/brand-system.css", "utf8"),
  readFile("apps/web/components/estimulo-brand.tsx", "utf8"),
  readFile("apps/web/components/app-shell.tsx", "utf8"),
  readFile("apps/web/public/brand/estimulo-logo-horizontal-color.svg", "utf8"),
  readFile("apps/web/public/brand/estimulo-symbol-color.svg", "utf8"),
  readFile("apps/web/public/brand/estimulo-dots-cyan.svg", "utf8"),
  readFile("apps/web/public/brand/estimulo-chevrons-magenta.svg", "utf8")
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

function assertVectorAsset(asset, name) {
  assert.match(asset, /<svg[\s>]/u, `${name} must be SVG`);
  assert.doesNotMatch(asset, /data:image|<image[\s>]/u, `${name} must not embed raster data`);
  assert.ok(asset.length > 300, `${name} must not be an empty placeholder`);
}

test("brand system uses the Estímulo palette and Poppins", () => {
  for (const color of officialPalette) assert.match(brandCss.toLowerCase(), new RegExp(color));
  assert.match(brandCss, /fonts\.googleapis\.com\/css2\?family=Poppins/u);
  assert.match(brandCss, /font-family\s*:\s*Poppins/u);
  assert.match(layout, /themeColor: "#4E79FF"/u);
  assert.match(layout, /import "\.\/brand-system\.css"/u);
});

test("local vector assets are present and usable", () => {
  assertVectorAsset(horizontalLogo, "horizontal logo");
  assertVectorAsset(symbol, "symbol");
  assertVectorAsset(dots, "dot grid");
  assertVectorAsset(chevrons, "chevrons");
  assert.match(horizontalLogo, /viewBox="0 0 480 208"/u);
  assert.match(symbol, /viewBox="0 0 292\.36 292\.37"/u);
});

test("horizontal logo is local, keeps clear space and is not redrawn in the component", () => {
  assert.match(brandComponent, /OFFICIAL_ESTIMULO_LOGO_PATH/u);
  assert.match(brandComponent, /\/brand\/estimulo-logo-horizontal-color\.svg/u);
  assert.match(brandComponent, /brand-logo-clearspace/u);
  assert.doesNotMatch(brandComponent, /https?:\/\/|NEXT_PUBLIC_ESTIMULO_LOGO_URL|brand-mark|lettering|<svg/u);
  assert.match(brandCss, /brand-logo-clearspace\{[^}]*overflow:hidden/su);
  assert.doesNotMatch(brandCss, /brand-logo-clearspace[^}]*background:/su);
  assert.match(shell, /app-brand-cluster/u);
  assert.match(shell, /app-header__inner/u);
});

test("complementary elements are large, cropped and decorative", () => {
  assert.match(brandCss, /--brand-symbol-image:url\("\/brand\/estimulo-symbol-color\.svg"\)/u);
  assert.match(brandCss, /--brand-dots-cyan-image:url\("\/brand\/estimulo-dots-cyan\.svg"\)/u);
  assert.match(brandCss, /--brand-chevrons-magenta-image:url\("\/brand\/estimulo-chevrons-magenta\.svg"\)/u);
  assert.match(brandCss, /page-heading::before/u);
  assert.match(brandCss, /dashboard-next::before/u);
  assert.match(brandCss, /auth-page::before/u);
  assert.match(brandCss, /certificate-document::before/u);
  assert.match(brandCss, /overflow\s*:\s*hidden/u);
  assert.match(brandCss, /pointer-events:none/u);
});

test("brand styling preserves accessibility and responsive behavior", () => {
  assert.match(brandCss, /:focus-visible/u);
  assert.match(brandCss, /prefers-reduced-motion/u);
  assert.match(brandCss, /@media\s*\(max-width\s*:\s*760px\)/u);
  assert.match(brandCss, /min-width\s*:\s*320px/u);
  assert.match(shell, /aria-label="Navegação principal"/u);
  assert.match(shell, /Pular para o conteúdo/u);
  assert.match(layout, /icon: "\/brand\/estimulo-symbol-color\.svg"/u);
});
