import { notFound, redirect } from "next/navigation";

import { ProjectWorkspace } from "@/components/project/project-workspace";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { taskOutputSelect } from "@/lib/task-select";

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { projectId } = await params;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      archivedAt: null,
      workspace: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      key: true,
      description: true,
      status: true,
      startDate: true,
      dueDate: true,
      workspaceId: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      statuses: {
        select: {
          id: true,
          name: true,
          color: true,
          category: true,
          position: true,
          isDefault: true,
          isTerminal: true,
        },
        orderBy: {
          position: "asc",
        },
      },
      sections: {
        select: {
          id: true,
          name: true,
          position: true,
        },
        orderBy: {
          position: "asc",
        },
      },
      members: {
        select: {
          id: true,
          role: true,
          workspaceMember: {
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const [workspaceProjects, tasks] = await Promise.all([
    prisma.project.findMany({
      where: {
        workspaceId: project.workspaceId,
        archivedAt: null,
      },
      select: {
        id: true,
        name: true,
        key: true,
        status: true,
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 40,
    }),
    prisma.task.findMany({
      where: {
        projectId: project.id,
        deletedAt: null,
        isArchived: false,
      },
      select: taskOutputSelect,
      orderBy: [{ sectionId: "asc" }, { position: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const serializedTasks = tasks.map((task) => ({
    ...task,
    startDate: toIso(task.startDate),
    dueDate: toIso(task.dueDate),
    completedAt: toIso(task.completedAt),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }));

  return (
    <ProjectWorkspace
      project={{
        id: project.id,
        name: project.name,
        key: project.key,
        description: project.description,
        status: project.status,
        startDate: toIso(project.startDate),
        dueDate: toIso(project.dueDate),
        workspace: project.workspace,
        statuses: project.statuses,
        sections: project.sections,
        members: project.members.map((member) => ({
          id: member.id,
          role: member.role,
          user: member.workspaceMember.user,
        })),
      }}
      workspaceProjects={workspaceProjects}
      initialTasks={serializedTasks}
    />
  );
}
