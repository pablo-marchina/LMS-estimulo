"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { decodeFirstTouch, FIRST_TOUCH_COOKIE } from "@/lib/auth/first-touch";
import { provisionPublicSignupParticipant } from "@/lib/auth/public-signup-provisioning";

const schema = z.object({
  preferredName: z.string().trim().min(2).max(120),
  businessName: z.string().trim().max(160).optional(),
});

export async function completePublicSignupAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar?erro=confirmacao_necessaria");
  if (auth.identity.entrepreneur_id) redirect("/empreendedor");

  const parsed = schema.safeParse({
    preferredName: formData.get("preferred_name"),
    businessName: formData.get("business_name") || undefined,
  });
  if (!parsed.success) redirect("/cadastro/concluir?erro=dados_invalidos");

  const cookieStore = await cookies();
  const attribution = decodeFirstTouch(cookieStore.get(FIRST_TOUCH_COOKIE)?.value) ?? {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    landing_path: "/cadastro",
  };

  await provisionPublicSignupParticipant({
    userAccountId: auth.identity.user_account_id,
    preferredName: parsed.data.preferredName,
    businessName: parsed.data.businessName || null,
    attribution,
    idempotencyKey: randomUUID(),
  });
  cookieStore.delete(FIRST_TOUCH_COOKIE);
  redirect("/empreendedor");
}
