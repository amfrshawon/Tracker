"use client";

import { motion } from "framer-motion";
import Link from "next/link";

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

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function statusClasses(status: string): string {
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-700";
  if (status === "COMPLETED") return "bg-slate-100 text-slate-700";
  if (status === "ON_HOLD") return "bg-amber-50 text-amber-700";
  if (status === "ARCHIVED") return "bg-slate-100 text-slate-500";
  return "bg-sky-50 text-sky-700";
}

export function DashboardShell({
  userName,
  userEmail,
  totalProjects,
  totalTasks,
  overdueProjects,
  workspaces,
}: DashboardShellProps) {
  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: 0.07 }}
    >
      <motion.section
        variants={itemVariants}
        className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
              Workspace Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Welcome back{userName ? `, ${userName}` : ""}.
            </h1>
            <p className="mt-2 text-sm text-slate-600">Signed in as {userEmail}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="font-medium text-slate-700">Live APIs</p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link className="font-medium text-sky-700 hover:text-sky-800" href="/api/workspaces">
                Workspaces
              </Link>
              <Link className="font-medium text-sky-700 hover:text-sky-800" href="/api/health">
                Health
              </Link>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section variants={itemVariants} className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total Projects</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalProjects}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total Tasks</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalTasks}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Overdue Projects</p>
          <p className="mt-2 text-3xl font-bold text-rose-600">{overdueProjects}</p>
        </div>
      </motion.section>

      <motion.section variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Your Workspaces</h2>
          <span className="text-sm text-slate-500">{workspaces.length} total</span>
        </div>

        {workspaces.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-lg font-semibold text-slate-800">No workspaces yet</p>
            <p className="mt-1 text-sm text-slate-600">
              Use the `POST /api/workspaces` endpoint to create the first workspace from this foundation.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {workspaces.map((workspace) => (
              <motion.article
                key={workspace.id}
                whileHover={{ y: -2, scale: 1.003 }}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{workspace.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">/{workspace.slug}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {workspace.role}
                  </span>
                </div>

                {workspace.description ? (
                  <p className="mt-3 text-sm text-slate-600">{workspace.description}</p>
                ) : (
                  <p className="mt-3 text-sm italic text-slate-500">No description set for this workspace.</p>
                )}

                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Members</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{workspace.memberCount}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Projects</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{workspace.projectCount}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Created</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(workspace.createdAt)}</p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">Recent Projects</p>
                    <div className="flex items-center gap-3">
                      <Link
                        className="text-xs font-semibold text-slate-600 hover:text-slate-800"
                        href={`/api/projects?workspaceId=${workspace.id}`}
                      >
                        API
                      </Link>
                      {workspace.projects[0] ? (
                        <Link
                          className="text-xs font-semibold text-sky-700 hover:text-sky-800"
                          href={`/projects/${workspace.projects[0].id}`}
                        >
                          Open Project
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  {workspace.projects.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500">
                      No projects in this workspace yet.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {workspace.projects.map((project) => {
                        const overdue =
                          project.dueDate &&
                          new Date(project.dueDate).getTime() < Date.now() &&
                          project.status !== "COMPLETED" &&
                          project.status !== "ARCHIVED";

                        return (
                          <li key={project.id} className="rounded-lg border border-slate-200 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <Link href={`/projects/${project.id}`} className="font-medium text-slate-900 hover:text-sky-800">
                                {project.name}
                                {project.key ? (
                                  <span className="ml-2 text-xs font-semibold text-slate-500">[{project.key}]</span>
                                ) : null}
                              </Link>
                              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClasses(project.status)}`}>
                                {project.status.replace("_", " ")}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
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
                  )}
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}
