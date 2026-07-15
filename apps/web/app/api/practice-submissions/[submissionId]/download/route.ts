import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { practiceRuntime } from "@/lib/practice/runtime";
import { createPracticeEvidenceDownloadUrl } from "@/lib/storage/practice-evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuid = z.string().uuid();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") {
    return NextResponse.redirect(new URL("/entrar", request.url), 303);
  }

  try {
    const { submissionId } = await params;
    const descriptor = await practiceRuntime.getDownloadDescriptor(
      auth.identity.user_account_id,
      uuid.parse(submissionId)
    );
    if (descriptor.storage_provider !== "supabase_storage") {
      return NextResponse.json({ error: "PRACTICE_STORAGE_PROVIDER_UNSUPPORTED" }, { status: 501 });
    }

    const signedUrl = await createPracticeEvidenceDownloadUrl({
      bucket: descriptor.bucket,
      objectKey: descriptor.object_key,
      filename: descriptor.original_filename
    });
    return NextResponse.redirect(signedUrl, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : "PRACTICE_DOWNLOAD_FAILED";
    const status = message === "FORBIDDEN" ? 403 : message.includes("NOT_FOUND") ? 404 : 409;
    return NextResponse.json({ error: message.split(":", 1)[0] }, { status });
  }
}
