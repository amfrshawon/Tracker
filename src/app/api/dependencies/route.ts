import { DependencyType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireProjectPermission } from "@/lib/permissions";

const createDependencySchema = z.object({
  projectId: z.string().min(1),
  predecessorTaskId: z.string().min(1),
  successorTaskId: z.string().min(1),
  type: z.nativeEnum(DependencyType).optional(),
  lagMinutes: z.number().int().min(0).max(60 * 24 * 365).optional(),
});

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return badRequest("projectId is required");
  }

  const permissionResult = await requireProjectPermission(projectId, "task:view");
  if (!permissionResult.ok) {
    return permissionResult.response;
  }

  const dependencies = await prisma.taskDependency.findMany({
    where: {
      predecessor: {
        projectId,
        deletedAt: null,
        isArchived: false,
      },
      successor: {
        projectId,
        deletedAt: null,
        isArchived: false,
      },
    },
    select: {
      id: true,
      predecessorTaskId: true,
      successorTaskId: true,
      type: true,
      lagMinutes: true,
      createdAt: true,
      predecessor: {
        select: {
          id: true,
          title: true,
          statusId: true,
        },
      },
      successor: {
        select: {
          id: true,
          title: true,
          statusId: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({ dependencies });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = createDependencySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  if (parsed.data.predecessorTaskId === parsed.data.successorTaskId) {
    return badRequest("A task cannot depend on itself");
  }

  const permissionResult = await requireProjectPermission(parsed.data.projectId, "task:update");
  if (!permissionResult.ok) {
    return permissionResult.response;
  }

  const relatedTasks = await prisma.task.findMany({
    where: {
      id: {
        in: [parsed.data.predecessorTaskId, parsed.data.successorTaskId],
      },
      projectId: parsed.data.projectId,
      deletedAt: null,
      isArchived: false,
    },
    select: {
      id: true,
    },
  });

  if (relatedTasks.length !== 2) {
    return badRequest("Both dependency tasks must exist in this project");
  }

  try {
    const dependency = await prisma.taskDependency.create({
      data: {
        predecessorTaskId: parsed.data.predecessorTaskId,
        successorTaskId: parsed.data.successorTaskId,
        type: parsed.data.type ?? DependencyType.FINISH_TO_START,
        lagMinutes: parsed.data.lagMinutes ?? 0,
        createdById: permissionResult.data.user.id,
      },
      select: {
        id: true,
        predecessorTaskId: true,
        successorTaskId: true,
        type: true,
        lagMinutes: true,
        createdAt: true,
        predecessor: {
          select: {
            id: true,
            title: true,
            statusId: true,
          },
        },
        successor: {
          select: {
            id: true,
            title: true,
            statusId: true,
          },
        },
      },
    });

    return NextResponse.json({ dependency }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This dependency already exists" }, { status: 409 });
    }

    return NextResponse.json({ error: "Failed to create dependency" }, { status: 500 });
  }
}
