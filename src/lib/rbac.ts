import { WorkspaceRole } from "@prisma/client";

export type WorkspacePermission =
  | "workspace:view"
  | "workspace:update"
  | "workspace:manage-members"
  | "project:view"
  | "project:create"
  | "project:update"
  | "task:view"
  | "task:create"
  | "task:update"
  | "task:delete"
  | "automation:manage"
  | "portfolio:manage";

const ROLE_PERMISSIONS: Record<WorkspaceRole, WorkspacePermission[]> = {
  ADMIN: [
    "workspace:view",
    "workspace:update",
    "workspace:manage-members",
    "project:view",
    "project:create",
    "project:update",
    "task:view",
    "task:create",
    "task:update",
    "task:delete",
    "automation:manage",
    "portfolio:manage",
  ],
  MEMBER: [
    "workspace:view",
    "project:view",
    "project:create",
    "project:update",
    "task:view",
    "task:create",
    "task:update",
  ],
  VIEWER: ["workspace:view", "project:view", "task:view"],
};

const ROLE_RANK: Record<WorkspaceRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
};

export function hasWorkspacePermission(role: WorkspaceRole, permission: WorkspacePermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canManageRole(actor: WorkspaceRole, target: WorkspaceRole): boolean {
  return ROLE_RANK[actor] > ROLE_RANK[target];
}

export function canAssignRole(actor: WorkspaceRole, nextRole: WorkspaceRole): boolean {
  if (actor === "ADMIN") {
    return true;
  }

  return ROLE_RANK[actor] > ROLE_RANK[nextRole];
}
