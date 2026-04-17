import { TaskActivityType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import {
  PROJECT_UPDATES_TASK_DESCRIPTION,
  PROJECT_UPDATES_TASK_TITLE,
} from "@/lib/project-updates";
import { requireProjectPermission } from "@/lib/permissions";

const createProjectMessageSchema = z.object({
  projectId: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
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

  const permissionResult = await requireProjectPermission(projectId, "project:view");
  if (!permissionResult.ok) {
    return permissionResult.response;
  }

  const updatesTask = await prisma.task.findFirst({
    where: {
      projectId,
      title: PROJECT_UPDATES_TASK_TITLE,
    },
    select: {
      id: true,
    },
  });

  if (!updatesTask) {
    return NextResponse.json({ messages: [] });
  }

  const messages = await prisma.taskComment.findMany({
    where: {
      taskId: updatesTask.id,
      deletedAt: null,
    },
    select: {
      id: true,
      body: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({ messages });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = createProjectMessageSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const permissionResult = await requireProjectPermission(parsed.data.projectId, "task:update");
  if (!permissionResult.ok) {
    return permissionResult.response;
  }

  const project = await prisma.project.findUnique({
    where: {
      id: parsed.data.projectId,
    },
    select: {
      id: true,
      workspaceId: true,
      statuses: {
        select: {
          id: true,
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

  const defaultStatus = project.statuses.find((status) => status.isDefault) ?? project.statuses[0];

  if (!defaultStatus) {
    return NextResponse.json(
      { error: "Project statuses are missing. Create a status before posting messages." },
      { status: 409 },
    );
  }

  const existingUpdatesTask = await prisma.task.findFirst({
    where: {
      projectId: project.id,
      title: PROJECT_UPDATES_TASK_TITLE,
    },
    select: {
      id: true,
    },
  });

  const updatesTask = existingUpdatesTask
    ? existingUpdatesTask
    : await prisma.task.create({
        data: {
          workspaceId: project.workspaceId,
          projectId: project.id,
          statusId: defaultStatus.id,
          title: PROJECT_UPDATES_TASK_TITLE,
          description: PROJECT_UPDATES_TASK_DESCRIPTION,
          creatorId: permissionResult.data.user.id,
          reporterId: permissionResult.data.user.id,
          isArchived: true,
          position: 0,
        },
        select: {
          id: true,
        },
      });

  const message = await prisma.taskComment.create({
    data: {
      taskId: updatesTask.id,
      authorId: permissionResult.data.user.id,
      body: parsed.data.body,
    },
    select: {
      id: true,
      body: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  await prisma.taskActivity.create({
    data: {
      taskId: updatesTask.id,
      actorId: permissionResult.data.user.id,
      type: TaskActivityType.COMMENTED,
      payload: {
        projectMessage: true,
        messageId: message.id,
      },
    },
  });

  return NextResponse.json({ message }, { status: 201 });
}
