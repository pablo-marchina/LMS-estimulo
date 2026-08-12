export type LibraryJourneyLink = {
  journey_version_id: string;
  relation_type: "supplemental" | "recommended";
  journey_title: string;
};

export type LibraryContentKind = "article" | "external_link" | "file";
export type LibraryContentFormat = "article" | "video" | "podcast" | "guide" | "tool" | "course" | "image" | "pdf" | "audio" | "other";

export type LibraryItemSummary = {
  library_item_id: string;
  library_item_version_id: string;
  slug: string;
  version_number: number;
  title: string;
  summary: string;
  content_kind: LibraryContentKind;
  content_format: LibraryContentFormat;
  level: "introductory" | "intermediate" | "advanced" | "all";
  estimated_minutes: number;
  source_type: "estimulo" | "partner" | "external";
  source_name: string;
  external_url?: string | null;
  language_code: string;
  topics: string[];
  visibility: "authenticated" | "organization";
  published_at: string;
  journeys: LibraryJourneyLink[];
  rank: number;
  file_object_id: string | null;
  original_filename: string | null;
  file_content_type?: string | null;
};

export type LibraryListing = {
  items: LibraryItemSummary[];
  total: number;
  limit: number;
  offset: number;
  facets: { topics: string[]; formats: string[]; levels: string[] };
};

export type LibraryContent = LibraryItemSummary & {
  body: string | null;
  accessibility_metadata: Record<string, unknown>;
  has_external_link: boolean;
  has_file: boolean;
  external_url: string | null;
  file_content_type: string | null;
};

export type OperatorLibraryItem = {
  library_item_id: string;
  code: string;
  slug: string;
  item_status: string;
  library_item_version_id: string;
  version_number: number;
  status: "draft" | "published" | "retired";
  title: string;
  summary: string;
  body: string | null;
  content_kind: LibraryContentKind;
  content_format: LibraryContentFormat;
  level: LibraryItemSummary["level"];
  estimated_minutes: number;
  source_type: LibraryItemSummary["source_type"];
  source_name: string;
  external_url: string | null;
  language_code: string;
  topics: string[];
  visibility: LibraryItemSummary["visibility"];
  discoverable_in_library: boolean;
  file_object_id: string | null;
  original_filename: string | null;
  file_content_type: string | null;
  file_size_bytes: number | null;
  content_hash: string;
  published_at: string | null;
  journey_version_ids: string[];
  archetype_definition_ids: string[];
};

export type OperatorLibraryData = {
  organization_id: string;
  items: OperatorLibraryItem[];
  journey_versions: Array<{ journey_version_id: string; title: string; version_number: number; status: "draft" | "published" }>;
  archetypes: Array<{ archetype_definition_id: string; code: string; name: string }>;
};

export type LibraryAccessResult = {
  library_item_id: string;
  library_item_version_id: string;
  slug: string;
  content_kind: LibraryContentKind;
  external_url: string | null;
  action: "view" | "open";
};

export type LibraryDraftResult = {
  library_item_id: string;
  library_item_version_id: string;
  version_number: number;
  status: "draft";
  slug: string;
  content_hash: string;
  journey_link_count: number;
  discoverable_in_library: boolean;
  file_object_id: string | null;
};

export type LibraryUploadIntent = {
  upload_intent_id: string;
  bucket: string;
  object_key: string;
  original_filename: string;
  expected_content_type: string;
  max_size_bytes: number;
  expires_at: string;
};

export type LibraryUploadedFile = {
  file_object_id: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  bucket: string;
  object_key: string;
  security_status: string;
};

export type LibraryFileDownload = { bucket: string; object_key: string; filename: string; content_type: string };
