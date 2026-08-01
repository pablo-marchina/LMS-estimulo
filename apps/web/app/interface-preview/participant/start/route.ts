import { NextResponse, type NextRequest } from "next/server";
import { requireAdminExtensionsWorkspace } from "@/lib/extensions/admin-context";
import {
  INTERFACE_PREVIEW_COOKIE,
  safeParticipantPreviewRoute,
  serializeInterfacePreviewIdentity,
} from "@/lib/interface-preview/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { organization, workspace } = await requireAdminExtensionsWorkspace();
  const requestedParticipant = request.nextUrl.searchParams.get("participant");
  const participant = workspace.participants.find((item) => item.user_account_id === requestedParticipant && item.entrepreneur_id)
    ?? workspace.participants.find((item) => item.entrepreneur_id);

  if (!participant?.entrepreneur_id) {
    const unavailable = new URL("/interface-preview/participant", request.url);
    unavailable.searchParams.set("erro", "participante_indisponivel");
    return NextResponse.redirect(unavailable);
  }

  const destination = new URL(safeParticipantPreviewRoute(request.nextUrl.searchParams.get("route")), request.url);
  destination.searchParams.set("interface_preview", "1");
  const response = NextResponse.redirect(destination);
  response.headers.set("cache-control", "private, no-store");
  response.cookies.set(
    INTERFACE_PREVIEW_COOKIE,
    serializeInterfacePreviewIdentity({
      organizationId: organization.organization_id,
      participantUserAccountId: participant.user_account_id,
    }),
    {
      httpOnly: true,
      sameSite: "strict",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 5 * 60,
    },
  );
  return response;
}
