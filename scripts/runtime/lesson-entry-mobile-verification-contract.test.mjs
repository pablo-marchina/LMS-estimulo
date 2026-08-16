import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("participant shell warms video providers before lesson navigation", async () => {
  const [shell, viewer] = await Promise.all([
    read("apps/web/components/participant-shell.tsx"),
    read("apps/web/components/content-asset-viewer.tsx"),
  ]);

  assert.match(shell, /preconnect\("https:\/\/drive\.google\.com"\)/);
  assert.match(shell, /preconnect\("https:\/\/drive\.usercontent\.google\.com"\)/);
  assert.match(shell, /preconnect\("https:\/\/www\.youtube\.com"\)/);
  assert.match(shell, /prefetchDNS\("https:\/\/i\.ytimg\.com"\)/);
  assert.match(viewer, /loading="eager"/);
  assert.match(viewer, /googleDriveEmbed/);
});

test("mobile participant navigation stays compact without a collapsible drawer", async () => {
  const [shell, navItem] = await Promise.all([
    read("apps/web/components/participant-shell.tsx"),
    read("apps/web/components/ui/nav-item.tsx"),
  ]);

  assert.match(navItem, /variant === "top"/u);
  assert.match(shell, /border-t border-border\/70 md:hidden/u);
  assert.match(shell, /overflow-x-auto/u);
  assert.match(shell, /hidden min-w-0 items-center gap-1 md:flex/u);
  assert.doesNotMatch(shell, /setMobileOpen/u);
  assert.doesNotMatch(shell, /max-h-\[calc\(100dvh-4rem\)\] overflow-y-auto/u);
});

test("quick-check state is scoped to the currently focused lesson", async () => {
  const migration = await read("supabase/migrations/20260802180651_scope_quick_check_to_current_lesson.sql");

  assert.match(migration, /create or replace function app_private\.e14_state_check\(a uuid\)/);
  assert.match(migration, /app_private\.e14_state_step\(a\)->>'step_instance_id'/);
  assert.match(migration, /attempt\.step_instance_id=current_step\.step_instance_id/);
  assert.match(migration, /order by attempt\.attempt_number desc,attempt\.started_at desc,attempt\.id desc/);
  assert.doesNotMatch(migration, /where at\.step_instance_id in\s*\(select si\.id/s);
});
