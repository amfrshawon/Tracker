import { type WorkspaceRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasWorkspacePermission, type WorkspacePermission } from "@/lib/rbac";

export type ApiGuardResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

export type AuthUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function requireUser(): Promise<ApiGuardResult<AuthUser>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ok: false, response: unauthorized() };
  }

  return {
    ok: true,
    data: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
  };
}

export async function requireWorkspacePermission(
  workspaceId: string,
  permission: WorkspacePermission,
): Promise<ApiGuardResult<{ user: AuthUser; role: WorkspaceRole }>> {
  const userResult = await requireUser();
  if (!userResult.ok) {
    return userResult;
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: userResult.data.id,
      },
    },
    select: {
      role: true,
    },
  });

  if (!membership) {
    return {
      ok: false,
      response: forbidden("You are not a member of this workspace."),
    };
  }

  if (!hasWorkspacePermission(membership.role, permission)) {
    return {
      ok: false,
      response: forbidden("You do not have permission to perform this action."),
    };
  }

  return {
    ok: true,
    data: {
      user: userResult.data,
      role: membership.role,
    },
  };
}

export async function requireProjectPermission(
  projectId: string,
  permission: WorkspacePermission,
): Promise<ApiGuardResult<{ user: AuthUser; role: WorkspaceRole; workspaceId: string }>> {
  const userResult = await requireUser();
  if (!userResult.ok) {
    return userResult;
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      workspaceId: true,
    },
  });

  if (!project) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Project not found" }, { status: 404 }),
    };
  }

  const workspaceResult = await requireWorkspacePermission(project.workspaceId, permission);
  if (!workspaceResult.ok) {
    return workspaceResult;
  }

  return {
    ok: true,
    data: {
      user: workspaceResult.data.user,
      role: workspaceResult.data.role,
      workspaceId: project.workspaceId,
    },
  };
}
