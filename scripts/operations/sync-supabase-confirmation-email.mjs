import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const projectRef = process.env.SUPABASE_PROJECT_REF?.trim();

if (!accessToken) throw new Error("SUPABASE_ACCESS_TOKEN_REQUIRED");
if (!projectRef) throw new Error("SUPABASE_PROJECT_REF_REQUIRED");
if (!/^[a-z0-9]{10,40}$/u.test(projectRef)) throw new Error("SUPABASE_PROJECT_REF_INVALID");

const templateUrl = new URL("../../supabase/templates/confirmation.html", import.meta.url);
const template = await readFile(fileURLToPath(templateUrl), "utf8");
const subject = "Confirme seu e-mail para acessar a Estímulo";

if (!template.includes("{{ .TokenHash }}") || !template.includes("{{ .RedirectTo }}")) {
  throw new Error("CONFIRMATION_TEMPLATE_SSR_LINK_INVALID");
}

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    mailer_subjects_confirmation: subject,
    mailer_templates_confirmation_content: template,
  }),
});

if (!response.ok) {
  const body = await response.text();
  throw new Error(`SUPABASE_AUTH_TEMPLATE_SYNC_FAILED:${response.status}:${body.slice(0, 500)}`);
}

console.log(`Confirmation email template synchronized for Supabase project ${projectRef}.`);
