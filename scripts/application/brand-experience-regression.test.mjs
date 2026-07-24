import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile("apps/web/app/globals.css", "utf8");
const motion = await readFile("apps/web/app/brand-motion.css", "utf8");
const auth = await readFile("apps/web/components/auth-layout.tsx", "utf8");
const landing = await readFile("apps/web/app/page.tsx", "utf8");
const participantShell = await readFile("apps/web/components/participant-shell.tsx", "utf8");
const adminShell = await readFile("apps/web/components/admin-shell.tsx", "utf8");
const carousel = await readFile("apps/web/components/announcement-carousel.tsx", "utf8");
const home = await readFile("apps/web/app/empreendedor/page.tsx", "utf8");

const completeCss = `${css}\n${motion}`;

test("brand system uses the full Estimulo palette and reduced-motion support", () => {
  assert.match(css, /--color-accent-cyan:\s*#48d0f0/u);
  assert.match(css, /--color-accent-magenta:\s*#ff66ff/u);
  assert.match(css, /--color-accent-green:\s*#55d78c/u);
  assert.match(css, /--color-accent-gold:\s*#f4c542/u);
  assert.match(completeCss, /brand-auth-stage/u);
  assert.match(completeCss, /brand-carousel/u);
  assert.match(completeCss, /participant-stage/u);
  assert.match(completeCss, /estimulo-orbit/u);
  assert.match(completeCss, /prefers-reduced-motion/u);
});

test("login and application shells use the color logo capsule", () => {
  assert.match(auth, /brand-logo-capsule/u);
  assert.match(auth, /Mais clareza, repertório e movimento/u);
  assert.match(participantShell, /brand-logo-capsule/u);
  assert.match(participantShell, /participant-stage-orb/u);
  assert.match(adminShell, /brand-logo-capsule/u);
  assert.doesNotMatch(participantShell, /invert\s*\/>/u);
});

test("landing page is a high-impact Estimulo journey story", () => {
  assert.match(landing, /Conhecimento que movimenta o seu negócio/u);
  assert.match(landing, /Estímulo &lt;&gt; OpenAI/u);
  assert.match(landing, /Marketing e Vendas com IA/u);
  assert.match(landing, /Gestão com IA/u);
  assert.match(landing, /Desenvolvimento com Codex/u);
});

test("participant home begins with a visual announcement carousel", () => {
  const carouselIndex = home.indexOf("<AnnouncementCarousel");
  const welcomeIndex = home.indexOf("<header className=\"brand-welcome-strip");
  assert.ok(carouselIndex >= 0 && carouselIndex < welcomeIndex);
  assert.match(carousel, /fallbackAnnouncements/u);
  assert.match(carousel, /announcement-openai\.svg/u);
  assert.match(carousel, /setInterval/u);
  assert.match(carousel, /brand-carousel-viewport/u);
});
