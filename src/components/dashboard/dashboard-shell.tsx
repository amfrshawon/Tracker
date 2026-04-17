"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

type DashboardProject = {
  id: string;
  name: string;
  key: string | null;
  status: string;
  dueDate: string | null;
  updatedAt: string;
  taskCount: number;
};

type DashboardWorkspace = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  memberCount: number;
  projectCount: number;
  createdAt: string;
  projects: DashboardProject[];
};

type DashboardShellProps = {
  userName: string | null;
  userEmail: string;
  totalProjects: number;
  totalTasks: number;
  overdueProjects: number;
  workspaces: DashboardWorkspace[];
};

type CreateProjectResponse = {
  project: {
    id: string;
    workspaceId: string;
    name: string;
    key: string | null;
    status: string;
    dueDate: string | null;
    updatedAt: string;
  };
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

const workspacePalette = [
  "from-amber-50 to-orange-100",
  "from-sky-50 to-cyan-100",
  "from-emerald-50 to-lime-100",
  "from-rose-50 to-pink-100",
];

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function statusClasses(status: string): string {
  if (status === "ACTIVE") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "COMPLETED") return "bg-slate-100 text-slate-700 border-slate-200";
  if (status === "ON_HOLD") return "bg-amber-100 text-amber-700 border-amber-200";
  if (status === "ARCHIVED") return "bg-slate-100 text-slate-500 border-slate-200";
  return "bg-sky-100 text-sky-700 border-sky-200";
}

function roleCanCreate(role: DashboardWorkspace["role"]): boolean {
  return role === "ADMIN" || role === "MEMBER";
}

function buildTodayLabel(): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export function DashboardShell({
  userName,
  userEmail,
  totalProjects,
  totalTasks,
  overdueProjects,
  workspaces,
}: DashboardShellProps) {
  const [workspaceState, setWorkspaceState] = useState<DashboardWorkspace[]>(workspaces);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const selectedWorkspace = workspaceState.find((workspace) => workspace.id === selectedWorkspaceId) ?? null;

  const todayLabel = useMemo(() => buildTodayLabel(), []);
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
  }, []);

  const workspaceCount = workspaceState.length;

  const createdProjectsDelta = workspaceState.reduce((sum, workspace) => sum + workspace.projectCount, 0)
    - workspaces.reduce((sum, workspace) => sum + workspace.projectCount, 0);

  const totalProjectsDisplay = totalProjects + Math.max(0, createdProjectsDelta);

  const allProjects = useMemo(() => {
    return workspaceState
      .flatMap((workspace) =>
        workspace.projects.map((project) => ({
          ...project,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          workspaceSlug: workspace.slug,
        })),
      )
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [workspaceState]);

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = projectName.trim();
    if (!name || !selectedWorkspace) {
      return;
    }

    if (!roleCanCreate(selectedWorkspace.role)) {
      setCreateError("You do not have permission to create projects in this workspace.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId: selectedWorkspace.id,
          name,
          key: projectKey.trim() || undefined,
          description: projectDescription.trim() || undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | CreateProjectResponse
        | { error?: string }
        | null;

      if (!response.ok || !payload || !("project" in payload)) {
        throw new Error(payload && "error" in payload ? payload.error : "Failed to create project");
      }

      setWorkspaceState((previous) =>
        previous.map((workspace) => {
          if (workspace.id !== payload.project.workspaceId) {
            return workspace;
          }

          const createdProject: DashboardProject = {
            id: payload.project.id,
            name: payload.project.name,
            key: payload.project.key,
            status: payload.project.status,
            dueDate: payload.project.dueDate,
            updatedAt: payload.project.updatedAt,
            taskCount: 0,
          };

          return {
            ...workspace,
            projectCount: workspace.projectCount + 1,
            projects: [createdProject, ...workspace.projects],
          };
        }),
      );

      setProjectName("");
      setProjectKey("");
      setProjectDescription("");
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Failed to create project");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <motion.div
      className="space-y-5"
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: 0.06 }}
    >
      <motion.section
        variants={itemVariants}
        className="overflow-hidden rounded-3xl border border-rose-200/70 bg-[radial-gradient(1200px_500px_at_0%_0%,#fb7185_0%,#f43f5e_25%,#be123c_60%,#881337_100%)] p-5 text-white shadow-xl sm:p-7"
      >
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-100">RabbyTrack Home</p>
            <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-4xl">
              Good {greeting}
              {userName ? `, ${userName}` : ""}
            </h1>
            <p className="mt-2 text-sm text-rose-100/95">{todayLabel} • Collaborative project command center</p>

            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              <Link
                className="rounded-full bg-white/20 px-3 py-1.5 font-semibold text-white transition hover:bg-white/30"
                href="/api/workspaces"
              >
                Workspaces API
              </Link>
              <Link
                className="rounded-full bg-white/20 px-3 py-1.5 font-semibold text-white transition hover:bg-white/30"
                href="/api/health"
              >
                Health Check
              </Link>
              {allProjects[0] ? (
                <Link
                  className="rounded-full bg-white px-3 py-1.5 font-semibold text-rose-700 transition hover:bg-rose-50"
                  href={`/projects/${allProjects[0].id}`}
                >
                  Open Latest Project
                </Link>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/30 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.14em] text-rose-100">Signed In</p>
              <p className="mt-1 text-sm font-semibold text-white">{userEmail}</p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.14em] text-rose-100">Quick Capacity</p>
              <p className="mt-1 text-sm font-semibold text-white">{workspaceCount} workspaces connected</p>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section variants={itemVariants} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-amber-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total Projects</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalProjectsDisplay}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-sky-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total Tasks</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalTasks}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Workspaces</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{workspaceCount}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-rose-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Overdue Projects</p>
          <p className="mt-2 text-3xl font-bold text-rose-600">{overdueProjects}</p>
        </article>
      </motion.section>

      <motion.section variants={itemVariants} className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Create Project</h2>
            <p className="text-xs text-slate-500">Multi-project dashboard control</p>
          </div>

          <form onSubmit={handleCreateProject} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="workspace" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Workspace
              </label>
              <select
                id="workspace"
                value={selectedWorkspaceId}
                onChange={(event) => setSelectedWorkspaceId(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {workspaceState.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name} ({workspace.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="projectName" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Project Name
              </label>
              <input
                id="projectName"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                required
                placeholder="Example: Nationwide SEO Campaign"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-rose-500/20 focus:ring"
              />
            </div>

            <div>
              <label htmlFor="projectKey" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Project Key
              </label>
              <input
                id="projectKey"
                value={projectKey}
                onChange={(event) => setProjectKey(event.target.value.toUpperCase())}
                maxLength={12}
                placeholder="RABBY"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-rose-500/20 focus:ring"
              />
            </div>

            <div>
              <label htmlFor="projectDescription" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Description
              </label>
              <input
                id="projectDescription"
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
                maxLength={180}
                placeholder="What this project is about"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-rose-500/20 focus:ring"
              />
            </div>

            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Permissions: {selectedWorkspace ? selectedWorkspace.role : "N/A"}
              </p>
              <button
                type="submit"
                disabled={
                  isCreating ||
                  projectName.trim().length < 2 ||
                  !selectedWorkspace ||
                  !roleCanCreate(selectedWorkspace.role)
                }
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isCreating ? "Creating..." : "Create Project"}
              </button>
            </div>

            {createError ? (
              <p className="sm:col-span-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {createError}
              </p>
            ) : null}
          </form>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-semibold text-slate-900">Project Activity Feed</h2>
          <p className="mt-1 text-sm text-slate-600">Recent projects across your workspaces.</p>

          <ul className="mt-4 space-y-2">
            {allProjects.slice(0, 8).map((project) => {
              const overdue =
                project.dueDate &&
                new Date(project.dueDate).getTime() < Date.now() &&
                project.status !== "COMPLETED" &&
                project.status !== "ARCHIVED";

              return (
                <li key={project.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/projects/${project.id}`} className="font-medium text-slate-900 hover:text-rose-700">
                      {project.name}
                    </Link>
                    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClasses(project.status)}`}>
                      {project.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                    <span>{project.workspaceName}</span>
                    <span>{project.taskCount} tasks</span>
                    <span>Updated {formatDate(project.updatedAt)}</span>
                    <span className={overdue ? "font-semibold text-rose-600" : ""}>
                      Due {project.dueDate ? formatDate(project.dueDate) : "not set"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </article>
      </motion.section>

      <motion.section variants={itemVariants} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Workspace Dashboard Grid</h2>
          <span className="text-sm text-slate-500">{workspaceState.length} workspaces</span>
        </div>

        {workspaceState.length === 0 ? (
          <article className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <p className="text-sm text-slate-600">No workspaces found for this account.</p>
          </article>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {workspaceState.map((workspace, index) => (
              <motion.article
                key={workspace.id}
                whileHover={{ y: -3, scale: 1.01 }}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className={`bg-gradient-to-r ${workspacePalette[index % workspacePalette.length]} px-4 py-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{workspace.name}</p>
                      <p className="text-sm text-slate-600">/{workspace.slug}</p>
                    </div>
                    <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
                      {workspace.role}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-slate-50 px-2 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Members</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{workspace.memberCount}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Projects</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{workspace.projectCount}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Created</p>
                      <p className="mt-1 text-xs font-semibold text-slate-900">{formatDate(workspace.createdAt)}</p>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">Projects</p>
                      {workspace.projects[0] ? (
                        <Link className="text-xs font-semibold text-rose-700 hover:text-rose-800" href={`/projects/${workspace.projects[0].id}`}>
                          Open latest
                        </Link>
                      ) : null}
                    </div>

                    {workspace.projects.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-500">
                        No projects yet.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {workspace.projects.slice(0, 6).map((project) => (
                          <li key={project.id} className="rounded-lg border border-slate-200 px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <Link href={`/projects/${project.id}`} className="truncate font-medium text-slate-900 hover:text-rose-700">
                                {project.name}
                              </Link>
                              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClasses(project.status)}`}>
                                {project.status.replace("_", " ")}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                              <span>{project.key ?? "No key"}</span>
                              <span>{project.taskCount} tasks</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}
