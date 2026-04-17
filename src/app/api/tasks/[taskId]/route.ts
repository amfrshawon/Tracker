import { Prisma, TaskPriority, TaskType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireProjectPermission } from "@/lib/permissions";
import { taskOutputSelect } from "@/lib/task-select";

const optionalNullableDate = z.preprocess(
  (value) => (value === "" ? null : value),
  z.union([z.coerce.date(), z.null()]).optional(),
);

const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    statusId: z.string().trim().optional(),
    sectionId: z.string().trim().optional().nullable(),
    assigneeId: z.string().trim().optional().nullable(),
    startDate: optionalNullableDate,
    dueDate: optionalNullableDate,
    priority: z.nativeEnum(TaskPriority).optional(),
    type: z.nativeEnum(TaskType).optional(),
    position: z.number().int().min(0).optional(),
    estimateMinutes: z.number().int().min(0).max(300000).optional().nullable(),
    isMilestone: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

type RouteContext = {
  params: Promise<{ taskId: string }>;
};

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { taskId } = await context.params;

  const payload = await request.json().catch(() => null);
  const parsed = updateTaskSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const existingTask = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
    select: {
      id: true,
      projectId: true,
      workspaceId: true,
      statusId: true,
      sectionId: true,
      assigneeId: true,
      startDate: true,
      dueDate: true,
      completedAt: true,
      deletedAt: true,
    },
  });

  if (!existingTask || existingTask.deletedAt) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const permissionResult = await requireProjectPermission(existingTask.projectId, "task:update");
  if (!permissionResult.ok) {
    return permissionResult.response;
  }

  const nextStartDate = parsed.data.startDate === undefined ? existingTask.startDate : parsed.data.startDate;
  const nextDueDate = parsed.data.dueDate === undefined ? existingTask.dueDate : parsed.data.dueDate;

  if (nextStartDate && nextDueDate && nextDueDate < nextStartDate) {
    return badRequest("dueDate cannot be earlier than startDate");
  }

  let targetStatusId = parsed.data.statusId ?? existingTask.statusId;

  if (parsed.data.statusId) {
    const status = await prisma.taskStatus.findFirst({
      where: {
        id: parsed.data.statusId,
        projectId: existingTask.projectId,
      },
      select: {
        id: true,
      },
    });

    if (!status) {
      return badRequest("Invalid statusId for this project");
    }

    targetStatusId = status.id;
  }

  if (parsed.data.sectionId) {
    const section = await prisma.projectSection.findFirst({
      where: {
        id: parsed.data.sectionId,
        projectId: existingTask.projectId,
      },
      select: {
        id: true,
      },
    });

    if (!section) {
      return badRequest("Invalid sectionId for this project");
    }
  }

  if (parsed.data.assigneeId) {
    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: existingTask.workspaceId,
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

  const nextSectionId =
    parsed.data.sectionId === undefined
      ? existingTask.sectionId
      : parsed.data.sectionId;

  const updateData: Prisma.TaskUpdateInput = {};

  if (parsed.data.title !== undefined) {
    updateData.title = parsed.data.title;
  }

  if (parsed.data.description !== undefined) {
    updateData.description = parsed.data.description;
  }

  if (parsed.data.priority !== undefined) {
    updateData.priority = parsed.data.priority;
  }

  if (parsed.data.type !== undefined) {
    updateData.type = parsed.data.type;
  }

  if (parsed.data.startDate !== undefined) {
    updateData.startDate = parsed.data.startDate;
  }

  if (parsed.data.dueDate !== undefined) {
    updateData.dueDate = parsed.data.dueDate;
  }

  if (parsed.data.estimateMinutes !== undefined) {
    updateData.estimateMinutes = parsed.data.estimateMinutes;
  }

  if (parsed.data.isMilestone !== undefined) {
    updateData.isMilestone = parsed.data.isMilestone;
  }

  if (parsed.data.statusId !== undefined) {
    updateData.status = {
      connect: {
        id: targetStatusId,
      },
    };
  }

  if (parsed.data.sectionId !== undefined) {
    updateData.section = parsed.data.sectionId
      ? {
          connect: {
            id: parsed.data.sectionId,
          },
        }
      : {
          disconnect: true,
        };
  }

  if (parsed.data.assigneeId !== undefined) {
    updateData.assignee = parsed.data.assigneeId
      ? {
          connect: {
            id: parsed.data.assigneeId,
          },
        }
      : {
          disconnect: true,
        };
  }

  if (parsed.data.statusId !== undefined) {
    const nextStatus = await prisma.taskStatus.findUnique({
      where: {
        id: targetStatusId,
      },
      select: {
        category: true,
      },
    });

    if (nextStatus?.category === "DONE") {
      updateData.completedAt = existingTask.completedAt ?? new Date();
    } else if (existingTask.completedAt) {
      updateData.completedAt = null;
    }
  }

  if (parsed.data.position !== undefined) {
    updateData.position = parsed.data.position;
  } else if (parsed.data.statusId !== undefined || parsed.data.sectionId !== undefined) {
    const aggregate = await prisma.task.aggregate({
      where: {
        projectId: existingTask.projectId,
        statusId: targetStatusId,
        sectionId: nextSectionId,
        deletedAt: null,
        isArchived: false,
        NOT: {
          id: existingTask.id,
        },
      },
      _max: {
        position: true,
      },
    });

    updateData.position = (aggregate._max.position ?? -1) + 1;
  }

  const updatedTask = await prisma.task.update({
    where: {
      id: existingTask.id,
    },
    data: {
      ...updateData,
      activities: {
        create: {
          actorId: permissionResult.data.user.id,
          type: "UPDATED",
          payload: parsed.data,
        },
      },
    },
    select: taskOutputSelect,
  });

  return NextResponse.json({ task: updatedTask });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { taskId } = await context.params;

  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
    select: {
      id: true,
      projectId: true,
      deletedAt: true,
    },
  });

  if (!task || task.deletedAt) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const permissionResult = await requireProjectPermission(task.projectId, "task:delete");
  if (!permissionResult.ok) {
    return permissionResult.response;
  }

  await prisma.task.update({
    where: {
      id: task.id,
    },
    data: {
      isArchived: true,
      deletedAt: new Date(),
      activities: {
        create: {
          actorId: permissionResult.data.user.id,
          type: "UPDATED",
          payload: {
            archived: true,
          },
        },
      },
    },
  });

  return NextResponse.json({ ok: true });
}
