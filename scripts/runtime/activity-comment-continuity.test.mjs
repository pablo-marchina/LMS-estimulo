import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = process.cwd();
const actionSource = readFileSync(resolve(root, "apps/web/app/actions/journey.ts"), "utf8");
const workspaceSource = readFileSync(resolve(root, "apps/web/components/participant-activity-workspace.tsx"), "utf8");
const panelSource = readFileSync(resolve(root, "apps/web/components/activity-comment-panel.tsx"), "utf8");

test("publishing an activity comment does not navigate away from the mounted lesson", () => {
  const start = actionSource.indexOf("export async function createActivityCommentAction");
  const end = actionSource.indexOf("export async function moderateActivityCommentAction", start);
  assert.ok(start >= 0 && end > start, "comment action must remain discoverable");
  const commentAction = actionSource.slice(start, end);

  assert.doesNotMatch(commentAction, /redirect\s*\(/, "comment action must not redirect or remount lesson media");
  assert.match(commentAction, /return result\.data;/, "comment action must return the created comment for local rendering");
});

test("inline lesson discussion uses a client-local comment panel", () => {
  assert.match(workspaceSource, /<ActivityCommentPanel[\s\S]*initialComments=\{commentResult\.comments\}/);
  assert.doesNotMatch(workspaceSource, /action=\{createActivityCommentAction\}/);
  assert.match(panelSource, /event\.preventDefault\(\)/);
  assert.match(panelSource, /setComments\(/);
  assert.match(panelSource, /await createActivityCommentAction\(formData\)/);
  assert.doesNotMatch(panelSource, /useRouter|router\.(?:push|replace|refresh)/, "comment UI must not trigger route navigation or refresh");
});
