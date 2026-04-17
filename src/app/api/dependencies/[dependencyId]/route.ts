import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireProjectPermission } from "@/lib/permissions";

type RouteContext = {
  params: Promise<{ dependencyId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { dependencyId } = await context.params;

  const dependency = await prisma.taskDependency.findUnique({
    where: {
      id: dependencyId,
    },
    select: {
      id: true,
      predecessor: {
        select: {
          projectId: true,
        },
      },
    },
  });

  if (!dependency) {
    return NextResponse.json({ error: "Dependency not found" }, { status: 404 });
  }

  const permissionResult = await requireProjectPermission(dependency.predecessor.projectId, "task:update");
  if (!permissionResult.ok) {
    return permissionResult.response;
  }

  await prisma.taskDependency.delete({
    where: {
      id: dependency.id,
    },
  });

  return NextResponse.json({ ok: true });
}
