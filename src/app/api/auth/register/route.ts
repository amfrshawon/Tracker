import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  workspaceName: z.string().trim().min(2).max(80).optional(),
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

export async function POST(request: Request) {
  if (!env.ENABLE_SIGNUP) {
    return NextResponse.json(
      { error: "Signup is disabled. Set ENABLE_SIGNUP=true to allow registration." },
      { status: 403 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";

  const isJsonRequest = contentType.includes("application/json");
  let body: unknown = null;
  if (isJsonRequest) {
    body = await request.json().catch(() => null);
  } else {
    const form = await request.formData().catch(() => null);
    if (form) {
      body = {
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        workspaceName: form.get("workspaceName"),
      };
    }
  }

  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const passwordHash = await hash(parsed.data.password, 12);

  const workspaceName = parsed.data.workspaceName ?? `${parsed.data.name.split(" ")[0]}'s Workspace`;
  const workspaceSlug = await generateUniqueWorkspaceSlug(workspaceName);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          passwordHash,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          ownerId: user.id,
          name: workspaceName,
          slug: workspaceSlug,
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: "ADMIN",
        },
      });

      return {
        user,
        workspace,
      };
    });

    if (isJsonRequest) {
      return NextResponse.json(
        {
          message: "Account created",
          user: result.user,
          workspace: result.workspace,
        },
        { status: 201 },
      );
    }

    return NextResponse.redirect(new URL("/login?registered=1", request.url), { status: 303 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    return NextResponse.json({ error: "Failed to register account." }, { status: 500 });
  }
}
