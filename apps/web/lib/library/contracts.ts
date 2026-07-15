export type LibraryJourneyLink = {
  journey_version_id: string;
  relation_type: "supplemental" | "recommended";
  journey_title: string;
};

export type LibraryItemSummary = {
  library_item_id: string;
  library_item_version_id: string;
  slug: string;
  version_number: number;
  title: string;
  summary: string;
  content_kind: "article" | "external_link";
  content_format: "article" | "video" | "podcast" | "guide" | "tool" | "course" | "other";
  level: "introductory" | "intermediate" | "advanced" | "all";
  estimated_minutes: number;
  source_type: "estimulo" | "partner" | "external";
  source_name: string;
  language_code: string;
  topics: string[];
  visibility: "authenticated" | "organization";
  published_at: string;
  journeys: LibraryJourneyLink[];
  rank: number;
};

export type LibraryListing = {
  items: LibraryItemSummary[];
  total: number;
  limit: number;
  offset: number;
  facets: {
    topics: string[];
    formats: string[];
    levels: string[];
  };
};

export type LibraryContent = LibraryItemSummary & {
  body: string | null;
  accessibility_metadata: Record<string, unknown>;
  has_external_link: boolean;
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
  content_kind: "article" | "external_link";
  content_format: LibraryItemSummary["content_format"];
  level: LibraryItemSummary["level"];
  estimated_minutes: number;
  source_type: LibraryItemSummary["source_type"];
  source_name: string;
  external_url: string | null;
  language_code: string;
  topics: string[];
  visibility: LibraryItemSummary["visibility"];
  content_hash: string;
  published_at: string | null;
  journey_version_ids: string[];
};

export type OperatorLibraryData = {
  organization_id: string;
  items: OperatorLibraryItem[];
  journey_versions: Array<{
    journey_version_id: string;
    title: string;
    version_number: number;
    status: "draft" | "published";
  }>;
};

export type LibraryAccessResult = {
  library_item_id: string;
  library_item_version_id: string;
  slug: string;
  content_kind: "article" | "external_link";
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
};
