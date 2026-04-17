import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [workspaces, allProjects] = await Promise.all([
    prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        createdAt: true,
        members: {
          where: {
            userId: session.user.id,
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
        projects: {
          where: {
            archivedAt: null,
          },
          select: {
            id: true,
            name: true,
            key: true,
            status: true,
            dueDate: true,
            updatedAt: true,
            _count: {
              select: {
                tasks: true,
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 6,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    prisma.project.findMany({
      where: {
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
        status: true,
        dueDate: true,
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    }),
  ]);

  const totalProjects = allProjects.length;
  const totalTasks = allProjects.reduce((sum, project) => sum + project._count.tasks, 0);
  const now = Date.now();
  const overdueProjects = allProjects.filter((project) => {
    if (!project.dueDate) return false;
    if (project.status === "COMPLETED" || project.status === "ARCHIVED") return false;
    return project.dueDate.getTime() < now;
  }).length;

  async function logoutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(1000px_500px_at_15%_-10%,#fef3c7,transparent),radial-gradient(900px_500px_at_100%_0%,#dbeafe,transparent)]">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tracer</p>
            <p className="mt-1 text-sm text-slate-600">Enterprise project tracking starter</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Sign out
            </button>
          </form>
        </div>

        <DashboardShell
          userName={session.user.name ?? null}
          userEmail={session.user.email ?? "Unknown user"}
          totalProjects={totalProjects}
          totalTasks={totalTasks}
          overdueProjects={overdueProjects}
          workspaces={workspaces.map((workspace) => ({
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            description: workspace.description,
            role: workspace.members[0]?.role ?? "VIEWER",
            memberCount: workspace._count.members,
            projectCount: workspace._count.projects,
            createdAt: workspace.createdAt.toISOString(),
            projects: workspace.projects.map((project) => ({
              id: project.id,
              name: project.name,
              key: project.key,
              status: project.status,
              dueDate: project.dueDate ? project.dueDate.toISOString() : null,
              updatedAt: project.updatedAt.toISOString(),
              taskCount: project._count.tasks,
            })),
          }))}
        />
      </div>
    </main>
  );
}
