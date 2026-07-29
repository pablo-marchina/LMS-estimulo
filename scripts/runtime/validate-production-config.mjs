import { loadRepositoryEnvironment } from "./load-root-env.mjs";
import { validateProductionConfiguration } from "./validate-production-config-core.mjs";

loadRepositoryEnvironment();

const result = validateProductionConfiguration(process.env);

if (result.provider === "supabase" && result.level === "warning") {
  process.stderr.write(`${result.message}\n`);
} else {
  process.stdout.write(`${result.message}\n`);
}
