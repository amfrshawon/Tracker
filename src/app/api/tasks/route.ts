import { TaskPriority, TaskType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireProjectPermission } from "@/lib/permissions";
import { taskOutputSelect } from "@/lib/task-select";

const optionalNullableDate = z.preprocess(
  (value) => (value === "" ? null : value),
  z.union([z.coerce.date(), z.null()]).optional(),
);

const createTaskSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(5000).optional().nullable(),
  statusId: z.string().trim().optional(),
  sectionId: z.string().trim().optional().nullable(),
  assigneeId: z.string().trim().optional().nullable(),
  parentTaskId: z.string().trim().optional().nullable(),
  priority: z.nativeEnum(TaskPriority).optional(),
  type: z.nativeEnum(TaskType).optional(),
  startDate: optionalNullableDate,
  dueDate: optionalNullableDate,
  estimateMinutes: z.number().int().min(0).max(300000).optional().nullable(),
  isMilestone: z.boolean().optional(),
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

  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      deletedAt: null,
      isArchived: false,
    },
    select: taskOutputSelect,
    orderBy: [{ sectionId: "asc" }, { position: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = createTaskSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  if (parsed.data.startDate && parsed.data.dueDate && parsed.data.dueDate < parsed.data.startDate) {
    return badRequest("dueDate cannot be earlier than startDate");
  }

  const permissionResult = await requireProjectPermission(parsed.data.projectId, "task:create");
  if (!permissionResult.ok) {
    return permissionResult.response;
  }

  const project = await prisma.project.findUnique({
    where: { id: parsed.data.projectId },
    select: {
      id: true,
      workspaceId: true,
      statuses: {
        select: {
          id: true,
          category: true,
          isDefault: true,
          position: true,
        },
        orderBy: {
          position: "asc",
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.statuses.length === 0) {
    return NextResponse.json(
      { error: "Project has no statuses configured. Add statuses before creating tasks." },
      { status: 409 },
    );
  }

  const status = parsed.data.statusId
    ? project.statuses.find((item) => item.id === parsed.data.statusId)
    : project.statuses.find((item) => item.isDefault) ?? project.statuses[0];

  if (!status) {
    return badRequest("Invalid statusId for this project");
  }

  if (parsed.data.sectionId) {
    const section = await prisma.projectSection.findFirst({
      where: {
        id: parsed.data.sectionId,
        projectId: parsed.data.projectId,
      },
      select: {
        id: true,
      },
    });

    if (!section) {
      return badRequest("Invalid sectionId for this project");
    }
  }

  if (parsed.data.parentTaskId) {
    const parentTask = await prisma.task.findFirst({
      where: {
        id: parsed.data.parentTaskId,
        projectId: parsed.data.projectId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!parentTask) {
      return badRequest("Invalid parentTaskId for this project");
    }
  }

  if (parsed.data.assigneeId) {
    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: project.workspaceId,
          userId: parsed.data.assigneeId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!workspaceMember) {
      return badRequest("assigneeId must be a member of the workspace");
    }
  }

  const aggregate = await prisma.task.aggregate({
    where: {
      projectId: parsed.data.projectId,
      statusId: status.id,
      sectionId: parsed.data.sectionId ?? null,
      deletedAt: null,
      isArchived: false,
    },
    _max: {
      position: true,
    },
  });

  const nextPosition = (aggregate._max.position ?? -1) + 1;

  const createdTask = await prisma.task.create({
    data: {
      workspaceId: project.workspaceId,
      projectId: parsed.data.projectId,
      statusId: status.id,
      sectionId: parsed.data.sectionId ?? null,
      assigneeId: parsed.data.assigneeId ?? null,
      parentTaskId: parsed.data.parentTaskId ?? null,
      creatorId: permissionResult.data.user.id,
      reporterId: permissionResult.data.user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      priority: parsed.data.priority ?? TaskPriority.NONE,
      type: parsed.data.type ?? TaskType.TASK,
      startDate: parsed.data.startDate ?? null,
      dueDate: parsed.data.dueDate ?? null,
      completedAt: status.category === "DONE" ? new Date() : null,
      estimateMinutes: parsed.data.estimateMinutes ?? null,
      isMilestone: parsed.data.isMilestone ?? false,
      position: nextPosition,
      activities: {
        create: {
          actorId: permissionResult.data.user.id,
          type: "CREATED",
          payload: {
            title: parsed.data.title,
            statusId: status.id,
          },
        },
      },
    },
    select: taskOutputSelect,
  });

  return NextResponse.json({ task: createdTask }, { status: 201 });
}
