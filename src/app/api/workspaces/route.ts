import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/permissions";

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(500).optional().nullable(),
});

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function generateUniqueWorkspaceSlug(baseRaw: string): Promise<string> {
  const base = toSlug(baseRaw) || "workspace";
  let candidate = base;
  let suffix = 0;

  while (true) {
    const existing = await prisma.workspace.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

export async function GET() {
  const userResult = await requireUser();
  if (!userResult.ok) {
    return userResult.response;
  }

  const workspaces = await prisma.workspace.findMany({
    where: {
      members: {
        some: {
          userId: userResult.data.id,
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      members: {
        where: {
          userId: userResult.data.id,
        },
        select: {
          role: true,
        },
        take: 1,
      },
      _count: {
        select: {
          members: true,
          projects: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({
    workspaces: workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      role: workspace.members[0]?.role ?? "VIEWER",
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      counts: {
        members: workspace._count.members,
        projects: workspace._count.projects,
      },
    })),
  });
}

export async function POST(request: Request) {
  const userResult = await requireUser();
  if (!userResult.ok) {
    return userResult.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = createWorkspaceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const slug = await generateUniqueWorkspaceSlug(parsed.data.slug ?? parsed.data.name);

  try {
    const workspace = await prisma.$transaction(async (tx) => {
      const created = await tx.workspace.create({
        data: {
          name: parsed.data.name,
          slug,
          description: parsed.data.description ?? null,
          ownerId: userResult.data.id,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: created.id,
          userId: userResult.data.id,
          role: "ADMIN",
        },
      });

      return created;
    });

    return NextResponse.json(
      {
        workspace: {
          ...workspace,
          role: "ADMIN",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "Workspace slug already exists." }, { status: 409 });
    }

    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }
}
