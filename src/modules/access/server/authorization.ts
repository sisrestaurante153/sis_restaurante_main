import "server-only";
import { redirect } from "next/navigation";
import {
  assertPermission,
  canAccessRoute,
  type PermissionCode
} from "@/modules/access/domain/access-control";
import { getCurrentSession, requireSession } from "@/modules/access/server/session-cookie";

export interface ActorContext {
  userId: string;
  restaurantId: string;
  roleCodes: string[];
}

export function assertActorPermission(actor: ActorContext, permission: PermissionCode) {
  assertPermission(actor.roleCodes, permission);
}

export async function getCurrentActor() {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  return {
    userId: session.userId,
    restaurantId: session.restaurantId,
    name: session.name,
    email: session.email,
    roleCodes: session.roleCodes
  };
}

export async function requirePermission(permission: PermissionCode) {
  const session = await requireSession();

  try {
    assertActorPermission(
      {
        userId: session.userId,
        restaurantId: session.restaurantId,
        roleCodes: session.roleCodes
      },
      permission
    );
  } catch {
    redirect("/forbidden");
  }

  return session;
}

export async function requireRoutePermission(pathname: string) {
  const session = await requireSession();

  if (!canAccessRoute(pathname, session.roleCodes)) {
    redirect("/forbidden");
  }

  return session;
}
