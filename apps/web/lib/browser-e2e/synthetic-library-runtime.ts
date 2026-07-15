import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { browserE2EEnabled, browserE2EStorageDir } from "@/lib/browser-e2e/config";

const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const JOURNEY_VERSION_ID = "44444444-4444-4444-8444-444444444444";
const ARTICLE_ITEM_ID = "f0000000-0000-4000-8000-000000000001";
const ARTICLE_VERSION_ID = "f1000000-0000-4000-8000-000000000001";
const EXTERNAL_ITEM_ID = "f0000000-0000-4000-8000-000000000002";
const EXTERNAL_VERSION_ID = "f1000000-0000-4000-8000-000000000002";

const ARTICLE = {
  library_item_id: ARTICLE_ITEM_ID,
  library_item_version_id: ARTICLE_VERSION_ID,
  slug: "fluxo-de-caixa-pratico",
  version_number: 1,
  title: "Fluxo de caixa prático",
  summary: "Organize entradas, saídas e decisões financeiras do negócio.",
  body: "Comece registrando todas as entradas e saídas.\n\nRevise o saldo semanalmente e registre as decisões tomadas.",
  content_kind: "article",
  content_format: "guide",
  level: "introductory",
  estimated_minutes: 18,
  source_type: "estimulo",
  source_name: "Estímulo",
  language_code: "pt-BR",
  topics: ["finanças", "gestão"],
  visibility: "authenticated",
  accessibility_metadata: {},
  published_at: "2026-07-15T12:00:00.000Z",
  has_external_link: false,
  journeys: [{ journey_version_id: JOURNEY_VERSION_ID, relation_type: "supplemental", journey_title: "Jornada sintética OpenAI" }],
  rank: 1
} as const;

const EXTERNAL = {
  library_item_id: EXTERNAL_ITEM_ID,
  library_item_version_id: EXTERNAL_VERSION_ID,
  slug: "planejamento-semanal-parceiro",
  version_number: 1,
  title: "Planejamento semanal em 20 minutos",
  summary: "Material externo para organizar prioridades e acompanhar compromissos.",
  body: null,
  content_kind: "external_link",
  content_format: "video",
  level: "introductory",
  estimated_minutes: 20,
  source_type: "partner",
  source_name: "Parceiro Educacional",
  language_code: "pt-BR",
  topics: ["gestão", "planejamento"],
  visibility: "authenticated",
  accessibility_metadata: {},
  published_at: "2026-07-15T12:05:00.000Z",
  has_external_link: true,
  external_url: "https://example.org/planejamento",
  journeys: [],
  rank: 0
} as const;

const ITEMS = [ARTICLE, EXTERNAL] as const;
const SUPPORTED = new Set([
  "list_library_content",
  "get_library_content",
  "record_library_content_access"
]);

type AccessState = {
  accesses: Array<{ library_item_version_id: string; action: string; source: string }>;
  idempotency: Record<string, { fingerprint: string; envelope: Record<string, unknown> }>;
};

function stateFile(): string {
  return path.join(browserE2EStorageDir(), "library-state.json");
}

async function loadState(): Promise<AccessState> {
  try {
    return JSON.parse(await readFile(stateFile(), "utf8")) as AccessState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return { accesses: [], idempotency: {} };
  }
}

async function saveState(state: AccessState): Promise<void> {
  const file = stateFile();
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, JSON.stringify(state, null, 2), "utf8");
  await rename(temporary, file);
}

function assertActor(args: Record<string, unknown>): void {
  if (String(args.p_actor_user_account_id ?? "") !== ACTOR_ID) throw new Error("FORBIDDEN");
}

function fingerprint(name: string, args: Record<string, unknown>): string {
  return JSON.stringify([name, args], Object.keys(args).sort());
}

function summary(item: typeof ARTICLE | typeof EXTERNAL) {
  const { body: _body, accessibility_metadata: _accessibility, has_external_link: _hasLink, external_url: _url, ...value } = item;
  return value;
}

export function supportsSyntheticLibraryRpc(name: string): boolean {
  return SUPPORTED.has(name);
}

export async function invokeSyntheticLibraryRpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  if (!browserE2EEnabled()) throw new Error("BROWSER_E2E_DISABLED");
  assertActor(args);

  if (name === "list_library_content") {
    const query = String(args.p_query ?? "").trim().toLowerCase();
    const topic = String(args.p_topic ?? "").trim().toLowerCase();
    const format = String(args.p_content_format ?? "").trim();
    const level = String(args.p_level ?? "").trim();
    const offset = Number(args.p_offset ?? 0);
    const limit = Number(args.p_limit ?? 24);
    const filtered = ITEMS.filter((item) => {
      const searchable = `${item.title} ${item.summary} ${item.source_name} ${item.topics.join(" ")}`.toLowerCase();
      return (!query || query.split(/\s+/).every((term) => searchable.includes(term)))
        && (!topic || item.topics.includes(topic as never))
        && (!format || item.content_format === format)
        && (!level || item.level === level);
    });
    return {
      items: filtered.slice(offset, offset + limit).map(summary),
      total: filtered.length,
      limit,
      offset,
      facets: {
        topics: [...new Set(ITEMS.flatMap((item) => [...item.topics]))].sort(),
        formats: [...new Set(ITEMS.map((item) => item.content_format))].sort(),
        levels: [...new Set(ITEMS.map((item) => item.level))].sort()
      }
    } as T;
  }

  if (name === "get_library_content") {
    const item = ITEMS.find((candidate) => candidate.slug === String(args.p_slug).trim().toLowerCase());
    if (!item) throw new Error("LIBRARY_CONTENT_NOT_FOUND");
    return item as T;
  }

  if (name === "record_library_content_access") {
    const item = ITEMS.find((candidate) => candidate.library_item_version_id === String(args.p_library_item_version_id));
    if (!item) throw new Error("LIBRARY_CONTENT_NOT_FOUND");
    const action = String(args.p_action);
    if (!new Set(["view", "open"]).has(action)) throw new Error("INVALID_LIBRARY_ACCESS_ACTION");
    const key = String(args.p_idempotency_key);
    const state = await loadState();
    const requestFingerprint = fingerprint(name, args);
    const previous = state.idempotency[key];
    if (previous) {
      if (previous.fingerprint !== requestFingerprint) throw new Error("IDEMPOTENCY_KEY_REUSED");
      return { ...previous.envelope, replayed: true } as T;
    }
    const data = {
      library_item_id: item.library_item_id,
      library_item_version_id: item.library_item_version_id,
      slug: item.slug,
      content_kind: item.content_kind,
      external_url: action === "open" && item.content_kind === "external_link" ? item.external_url : null,
      action
    };
    const envelope = { request_id: randomUUID(), idempotency_key: key, replayed: false, data };
    state.accesses.push({
      library_item_version_id: item.library_item_version_id,
      action,
      source: String(args.p_source)
    });
    state.idempotency[key] = { fingerprint: requestFingerprint, envelope };
    await saveState(state);
    return envelope as T;
  }

  throw new Error(`BROWSER_E2E_LIBRARY_RPC_NOT_IMPLEMENTED:${name}`);
}

export const syntheticLibraryIds = {
  articleVersion: ARTICLE_VERSION_ID,
  externalVersion: EXTERNAL_VERSION_ID
} as const;
