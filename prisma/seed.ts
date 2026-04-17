import { TaskStatusCategory } from "@prisma/client";
import { hash } from "bcryptjs";

import { prisma } from "../src/lib/db";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function main() {
  const email = process.env.DEMO_ADMIN_EMAIL ?? "admin@rabbytrack.local";
  const password = process.env.DEMO_ADMIN_PASSWORD ?? "ChangeMe123!";
  const workspaceName = process.env.DEMO_WORKSPACE_NAME ?? "Team Workspace";

  const passwordHash = await hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Workspace Admin",
      passwordHash,
    },
    update: {
      name: "Workspace Admin",
      passwordHash,
    },
    select: {
      id: true,
      email: true,
    },
  });

  const workspaceSlug = toSlug(workspaceName) || "team-workspace";

  const workspace = await prisma.workspace.upsert({
    where: { slug: workspaceSlug },
    create: {
      name: workspaceName,
      slug: workspaceSlug,
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: "ADMIN",
        },
      },
    },
    update: {},
    select: { id: true, name: true },
  });

  const project = await prisma.project.upsert({
    where: {
      workspaceId_key: {
        workspaceId: workspace.id,
        key: "RABBYTRK",
      },
    },
    create: {
      workspaceId: workspace.id,
      ownerId: user.id,
      name: "RabbyTrack Onboarding Project",
      key: "RABBYTRK",
      description: "Seeded project to validate the setup.",
      members: {
        create: {
          workspaceMember: {
            connect: {
              workspaceId_userId: {
                workspaceId: workspace.id,
                userId: user.id,
              },
            },
          },
          role: "ADMIN",
        },
      },
    },
    update: {},
    select: { id: true, name: true },
  });

  const existingStatuses = await prisma.taskStatus.count({
    where: { projectId: project.id },
  });

  if (existingStatuses === 0) {
    await prisma.taskStatus.createMany({
      data: [
        {
          projectId: project.id,
          name: "Backlog",
          color: "#64748b",
          position: 0,
          category: TaskStatusCategory.BACKLOG,
          isDefault: false,
          isTerminal: false,
        },
        {
          projectId: project.id,
          name: "To Do",
          color: "#3b82f6",
          position: 1,
          category: TaskStatusCategory.TODO,
          isDefault: true,
          isTerminal: false,
        },
        {
          projectId: project.id,
          name: "In Progress",
          color: "#f59e0b",
          position: 2,
          category: TaskStatusCategory.IN_PROGRESS,
          isDefault: false,
          isTerminal: false,
        },
        {
          projectId: project.id,
          name: "Blocked",
          color: "#ef4444",
          position: 3,
          category: TaskStatusCategory.BLOCKED,
          isDefault: false,
          isTerminal: false,
        },
        {
          projectId: project.id,
          name: "Done",
          color: "#22c55e",
          position: 4,
          category: TaskStatusCategory.DONE,
          isDefault: false,
          isTerminal: true,
        },
      ],
    });
  }

  const existingSections = await prisma.projectSection.count({
    where: { projectId: project.id },
  });

  if (existingSections === 0) {
    await prisma.projectSection.create({
      data: {
        projectId: project.id,
        name: "General",
        position: 0,
      },
    });
  }

  console.log("Seed complete:");
  console.log(`- Admin user: ${user.email}`);
  console.log(`- Workspace: ${workspace.name}`);
  console.log(`- Project: ${project.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
