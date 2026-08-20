export type AdminProductStep = "geral" | "conteudo" | "publicacao";

export type AdminProductFeedback = {
  success: string;
  error: string;
  successTitle: string;
  successMessage: string;
  errorMessage: string;
};

export type AdminProductTrackSummary = {
  trackCount: number;
  lessonCount: number;
  emptyTrackCount: number;
  graphLooksComplete: boolean;
};

export function queryValue(value: string | string[] | undefined): string;
export function stringValue(value: unknown): string;
export function objectValue(value: unknown): Record<string, unknown>;
export function timestampValue(value: unknown): number;
export function versionStatus(status: string): string;
export function resolveAdminProductStep(value: string | string[] | undefined): AdminProductStep;
export function buildAdminProductStepHref(step: string, versionId?: string): string;
export function resolveAdminProductFeedback(
  success: string | string[] | undefined,
  error: string | string[] | undefined,
): AdminProductFeedback;
export function summarizeAdminProductTracks(
  tracks: Array<{ aulas?: unknown[] | null }> | null | undefined,
): AdminProductTrackSummary;
