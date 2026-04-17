import { Prisma, TaskStatusCategory } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireWorkspacePermission } from "@/lib/permissions";

const createProjectSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  key: z.string().trim().min(2).max(12).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  categoryId: z.string().trim().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  color: z.string().trim().max(20).optional().nullable(),
});

function normalizeProjectKey(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
}

function deriveProjectKey(name: string): string {
  const words = name
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean);

  if (words.length === 0) {
    return "PROJ";
  }

  if (words.length === 1) {
    return normalizeProjectKey(words[0].slice(0, 6)) || "PROJ";
  }

  return normalizeProjectKey(words.slice(0, 4).map((word) => word[0]).join("")) || "PROJ";
}

async function generateUniqueProjectKey(workspaceId: string, keyBase: string): Promise<string> {
  const base = normalizeProjectKey(keyBase) || "PROJ";
  let candidate = base;
  let suffix = 0;

  while (true) {
    const existing = await prisma.project.findFirst({
      where: {
        workspaceId,
        key: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }

    suffix += 1;
    const suffixText = `${suffix}`;
    candidate = `${base.slice(0, Math.max(1, 12 - suffixText.length))}${suffixText}`;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  const permissionResult = await requireWorkspacePermission(workspaceId, "project:view");
  if (!permissionResult.ok) {
    return permissionResult.response;
  }

  const projects = await prisma.project.findMany({
    where: {
      workspaceId,
      archivedAt: null,
    },
    select: {
      id: true,
      name: true,
      key: true,
      description: true,
      status: true,
      startDate: true,
      dueDate: true,
      createdAt: true,
      updatedAt: true,
      statuses: {
        select: {
          id: true,
          name: true,
          category: true,
          color: true,
          position: true,
        },
        orderBy: {
          position: "asc",
        },
      },
      _count: {
        select: {
          tasks: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);

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
    return NextResponse.json({ error: "dueDate cannot be earlier than startDate" }, { status: 400 });
  }

  const permissionResult = await requireWorkspacePermission(parsed.data.workspaceId, "project:create");
  if (!permissionResult.ok) {
    return permissionResult.response;
  }

  if (parsed.data.categoryId) {
    const category = await prisma.projectCategory.findFirst({
      where: {
        id: parsed.data.categoryId,
        workspaceId: parsed.data.workspaceId,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Invalid categoryId for this workspace" }, { status: 400 });
    }
  }

  const key = await generateUniqueProjectKey(
    parsed.data.workspaceId,
    parsed.data.key ?? deriveProjectKey(parsed.data.name),
  );

  try {
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          workspaceId: parsed.data.workspaceId,
          ownerId: permissionResult.data.user.id,
          name: parsed.data.name,
          key,
          description: parsed.data.description ?? null,
          categoryId: parsed.data.categoryId ?? null,
          startDate: parsed.data.startDate ?? null,
          dueDate: parsed.data.dueDate ?? null,
          color: parsed.data.color ?? null,
        },
        select: {
          id: true,
          workspaceId: true,
          name: true,
          key: true,
          description: true,
          status: true,
          startDate: true,
          dueDate: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const workspaceMember = await tx.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: parsed.data.workspaceId,
            userId: permissionResult.data.user.id,
          },
        },
        select: {
          id: true,
        },
      });

      if (workspaceMember) {
        await tx.projectMember.create({
          data: {
            projectId: created.id,
            workspaceMemberId: workspaceMember.id,
            role: "ADMIN",
          },
        });
      }

      await tx.taskStatus.createMany({
        data: [
          {
            projectId: created.id,
            name: "Backlog",
            color: "#64748b",
            position: 0,
            category: TaskStatusCategory.BACKLOG,
            isDefault: false,
            isTerminal: false,
          },
          {
            projectId: created.id,
            name: "To Do",
            color: "#3b82f6",
            position: 1,
            category: TaskStatusCategory.TODO,
            isDefault: true,
            isTerminal: false,
          },
          {
            projectId: created.id,
            name: "In Progress",
            color: "#f59e0b",
            position: 2,
            category: TaskStatusCategory.IN_PROGRESS,
            isDefault: false,
            isTerminal: false,
          },
          {
            projectId: created.id,
            name: "Blocked",
            color: "#ef4444",
            position: 3,
            category: TaskStatusCategory.BLOCKED,
            isDefault: false,
            isTerminal: false,
          },
          {
            projectId: created.id,
            name: "Done",
            color: "#22c55e",
            position: 4,
            category: TaskStatusCategory.DONE,
            isDefault: false,
            isTerminal: true,
          },
        ],
      });

      await tx.projectSection.createMany({
        data: [
          {
            projectId: created.id,
            name: "General",
            position: 0,
          },
        ],
      });

      return created;
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "Project key already exists in this workspace" }, { status: 409 });
    }

    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
