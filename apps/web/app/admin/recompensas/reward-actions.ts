"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { extensionsRuntime, type JsonRecord } from "@/lib/extensions/runtime";
import { rewardImageBucket, removeRewardImage, uploadRewardImage, validateRewardImage } from "@/lib/storage/reward-images";

function text(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }
function checkbox(formData: FormData, name: string) { return ["on", "true", "1", "yes"].includes(text(formData, name).toLowerCase()); }
function errorCode(error: unknown) {
  const coded = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  if (/^[A-Z][A-Z0-9_]{2,127}$/u.test(coded)) return coded;
  const raw = error instanceof Error ? error.message : "REWARD_SAVE_FAILED";
  return raw.match(/\b([A-Z][A-Z0-9_]{2,127})\b/u)?.[1] ?? "REWARD_SAVE_FAILED";
}
function nullableNumber(raw: string) { if (!raw) return null; const parsed = Number(raw); return Number.isFinite(parsed) ? parsed : null; }
function nullableDate(raw: string) { if (!raw) return null; const parsed = new Date(raw); return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null; }

async function authorize() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) redirect("/entrar/administracao?erro=acesso_nao_autorizado");
  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("engagement.manage")) redirect("/admin/recompensas?erro=sem_permissao");
  return { actorUserAccountId: auth.identity.user_account_id, organizationId: organization.organization_id };
}

function rewardPayload(formData: FormData, imageFileObjectId: string): JsonRecord {
  const fields = [
    checkbox(formData, "request_address") ? { key: "address", label: "Endereço para entrega", required: true } : null,
    checkbox(formData, "request_email") ? { key: "email", label: "E-mail para recebimento", required: true } : null,
    checkbox(formData, "request_phone") ? { key: "phone", label: "Telefone para contato", required: true } : null,
  ].filter(Boolean);
  return {
    id: text(formData, "id"), code: text(formData, "code"), name: text(formData, "name"), description: text(formData, "description"), regulation: text(formData, "regulation"), reward_type: text(formData, "reward_type"),
    cost_points: Math.max(1, Number(text(formData, "cost_points")) || 1), stock_quantity: nullableNumber(text(formData, "stock_quantity")), max_per_user: nullableNumber(text(formData, "max_per_user")), starts_at: nullableDate(text(formData, "starts_at")), ends_at: nullableDate(text(formData, "ends_at")), status: text(formData, "status") || "draft",
    image_file_object_id: imageFileObjectId || null,
    fulfillment_configuration: { instructions: text(formData, "delivery_instructions"), fields, display_order: Math.max(0, Number(text(formData, "display_order")) || 0) },
  };
}

export async function saveRewardWithImageAction(formData: FormData) {
  const { actorUserAccountId, organizationId } = await authorize();
  const existingImageId = text(formData, "image_file_object_id");
  const image = formData.get("reward_image");
  let imageFileObjectId = existingImageId;
  let uploadedObject: { bucket: string; objectKey: string } | null = null;
  let uploadIntentId: string | null = null;
  let uploadConfirmed = false;

  try {
    if (image instanceof File && image.size > 0) {
      validateRewardImage(image);
      const intent = await extensionsRuntime.createRewardImageUploadIntent({ actorUserAccountId, organizationId, originalFilename: image.name, expectedContentType: image.type, storageProvider: "supabase_storage", bucket: rewardImageBucket(), idempotencyKey: randomUUID() });
      uploadIntentId = intent.upload_intent_id;
      uploadedObject = { bucket: intent.bucket, objectKey: intent.object_key };
      const uploaded = await uploadRewardImage({ bucket: intent.bucket, objectKey: intent.object_key, file: image });
      const confirmed = await extensionsRuntime.confirmRewardImageUpload({ actorUserAccountId, organizationId, uploadIntentId: intent.upload_intent_id, actualContentType: image.type, actualSizeBytes: image.size, sha256: uploaded.sha256, providerObjectVersion: uploaded.providerObjectVersion, etag: uploaded.etag, idempotencyKey: randomUUID() });
      imageFileObjectId = confirmed.file_object_id;
      uploadConfirmed = true;
    }

    await extensionsRuntime.saveAdmin({ actorUserAccountId, organizationId, resourceType: "reward", payload: rewardPayload(formData, imageFileObjectId), idempotencyKey: randomUUID() });
  } catch (error) {
    if (uploadIntentId && !uploadConfirmed) {
      await extensionsRuntime.abortRewardImageUpload({ actorUserAccountId, organizationId, uploadIntentId, failureCode: errorCode(error), idempotencyKey: randomUUID() }).catch(() => undefined);
      if (uploadedObject) await removeRewardImage(uploadedObject.bucket, uploadedObject.objectKey).catch(() => undefined);
    }
    redirect(`/admin/recompensas?erro=${encodeURIComponent(errorCode(error))}`);
  }

  revalidatePath("/admin/recompensas");
  revalidatePath("/empreendedor/recompensas");
  redirect("/admin/recompensas?sucesso=reward");
}
