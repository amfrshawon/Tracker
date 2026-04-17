"use client";

import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

import {
  useProjectWorkspaceStore,
  type ProjectViewTab,
} from "@/store/project-workspace-store";
import type {
  ProjectDependencyRecord,
  ProjectMessageRecord,
  ProjectTaskRecord,
  ProjectWorkspaceData,
  WorkspaceProjectSummary,
} from "@/types/project-workspace";

type ProjectWorkspaceProps = {
  project: ProjectWorkspaceData;
  workspaceProjects: WorkspaceProjectSummary[];
  initialTasks: ProjectTaskRecord[];
  initialDependencies: ProjectDependencyRecord[];
  initialMessages: ProjectMessageRecord[];
};

type TaskPatchPayload = {
  title?: string;
  description?: string | null;
  statusId?: string;
  sectionId?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  priority?: ProjectTaskRecord["priority"];
  position?: number;
};

const priorityTone: Record<ProjectTaskRecord["priority"], string> = {
  NONE: "bg-slate-100 text-slate-600",
  LOW: "bg-emerald-100 text-emerald-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-rose-100 text-rose-700",
};

const dependencyTypeLabel: Record<ProjectDependencyRecord["type"], string> = {
  FINISH_TO_START: "Finish to Start",
  START_TO_START: "Start to Start",
  FINISH_TO_FINISH: "Finish to Finish",
  START_TO_FINISH: "Start to Finish",
};

const projectTabs: Array<{ value: ProjectViewTab; label: string }> = [
  { value: "OVERVIEW", label: "Overview" },
  { value: "LIST", label: "List" },
  { value: "BOARD", label: "Board" },
  { value: "TIMELINE", label: "Timeline" },
  { value: "DASHBOARD", label: "Dashboard" },
  { value: "CALENDAR", label: "Calendar" },
  { value: "WORKFLOW", label: "Workflow" },
  { value: "DEPENDENCIES", label: "Dependencies" },
  { value: "MESSAGES", label: "Messages" },
  { value: "FILES", label: "Files" },
];

function statusClass(category: string) {
  if (category === "DONE") return "bg-emerald-100 text-emerald-700";
  if (category === "IN_PROGRESS") return "bg-amber-100 text-amber-700";
  if (category === "BLOCKED") return "bg-rose-100 text-rose-700";
  if (category === "BACKLOG") return "bg-slate-100 text-slate-600";
  return "bg-sky-100 text-sky-700";
}

function formatDate(iso: string | null): string {
  if (!iso) return "No date";
  return format(parseISO(iso), "MMM d, yyyy");
}

function toInputDate(iso: string | null): string {
  if (!iso) return "";
  return format(parseISO(iso), "yyyy-MM-dd");
}

function parseTaskId(raw: string): string {
  return raw.replace(/^task:/, "");
}

function parseStatusDropId(raw: string): string {
  return raw.replace(/^status:/, "");
}

function getUserName(message: ProjectMessageRecord): string {
  return message.author.name ?? message.author.email ?? "Team member";
}

function isTaskResponse(value: unknown): value is { task: ProjectTaskRecord } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as { task?: unknown };
  return Boolean(payload.task && typeof payload.task === "object");
}

function isDependencyResponse(value: unknown): value is { dependency: ProjectDependencyRecord } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as { dependency?: unknown };
  return Boolean(payload.dependency && typeof payload.dependency === "object");
}

function isMessageResponse(value: unknown): value is { message: ProjectMessageRecord } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as { message?: unknown };
  return Boolean(payload.message && typeof payload.message === "object");
}

function BoardTaskCard({
  task,
  dependencyCount,
}: {
  task: ProjectTaskRecord;
  dependencyCount: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task:${task.id}`,
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition ${
        isDragging ? "opacity-70" : ""
      }`}
      {...listeners}
      {...attributes}
    >
      <p className="text-sm font-medium text-slate-900">{task.title}</p>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
        <span className={`rounded-full px-2 py-0.5 font-semibold ${priorityTone[task.priority]}`}>
          {task.priority}
        </span>
        <span>{task.assignee?.name ?? "Unassigned"}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>Due: {formatDate(task.dueDate)}</span>
        <span>{dependencyCount} deps</span>
      </div>
    </div>
  );
}

function BoardStatusColumn({
  status,
  tasks,
  dependencyCountByTask,
}: {
  status: ProjectWorkspaceData["statuses"][number];
  tasks: ProjectTaskRecord[];
  dependencyCountByTask: Map<string, number>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `status:${status.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full min-h-[320px] w-72 flex-col rounded-2xl border p-3 ${
        isOver ? "border-sky-300 bg-sky-50/70" : "border-slate-200 bg-slate-50/70"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">{status.name}</p>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(status.category)}`}>
          {tasks.length}
        </span>
      </div>

      <div className="space-y-2">
        {tasks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-500">
            Drop tasks here
          </p>
        ) : (
          tasks.map((task) => (
            <BoardTaskCard
              key={task.id}
              task={task}
              dependencyCount={dependencyCountByTask.get(task.id) ?? 0}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function ProjectWorkspace({
  project,
  workspaceProjects,
  initialTasks,
  initialDependencies,
  initialMessages,
}: ProjectWorkspaceProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskStatusId, setTaskStatusId] = useState(
    project.statuses.find((item) => item.isDefault)?.id ?? project.statuses[0]?.id ?? "",
  );
  const [taskSectionId, setTaskSectionId] = useState(project.sections[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [savingTaskIds, setSavingTaskIds] = useState<Set<string>>(new Set());
  const [activeDragTaskId, setActiveDragTaskId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [dependencies, setDependencies] = useState<ProjectDependencyRecord[]>(initialDependencies);
  const [messages, setMessages] = useState<ProjectMessageRecord[]>(initialMessages);
  const [depPredecessorTaskId, setDepPredecessorTaskId] = useState("");
  const [depSuccessorTaskId, setDepSuccessorTaskId] = useState("");
  const [depType, setDepType] = useState<ProjectDependencyRecord["type"]>("FINISH_TO_START");
  const [isDependencyBusy, setIsDependencyBusy] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [isPostingMessage, setIsPostingMessage] = useState(false);

  const {
    activeView,
    statuses,
    sections,
    members,
    tasks,
    hydrate,
    setActiveView,
    upsertTask,
    removeTask,
  } = useProjectWorkspaceStore();

  useEffect(() => {
    hydrate({
      projectId: project.id,
      statuses: project.statuses,
      sections: project.sections,
      members: project.members,
      tasks: initialTasks,
    });
  }, [hydrate, project, initialTasks]);

  useEffect(() => {
    setDependencies(initialDependencies);
  }, [initialDependencies]);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const dependencyBySuccessor = useMemo(() => {
    return new Map(dependencies.map((dependency) => [dependency.successorTaskId, dependency]));
  }, [dependencies]);

  const dependencyCountByTask = useMemo(() => {
    const map = new Map<string, number>();

    for (const dependency of dependencies) {
      map.set(dependency.predecessorTaskId, (map.get(dependency.predecessorTaskId) ?? 0) + 1);
      map.set(dependency.successorTaskId, (map.get(dependency.successorTaskId) ?? 0) + 1);
    }

    return map;
  }, [dependencies]);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "ALL" ? true : task.statusId === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchTerm, statusFilter]);

  const groupedForList = useMemo(() => {
    const bySection = sections.map((section) => ({
      section,
      tasks: visibleTasks.filter((task) => task.sectionId === section.id),
    }));

    const uncategorized = visibleTasks.filter((task) => !task.sectionId);

    return {
      bySection,
      uncategorized,
    };
  }, [sections, visibleTasks]);

  const statusBuckets = useMemo(() => {
    return statuses.map((status) => ({
      status,
      tasks: tasks.filter((task) => task.statusId === status.id),
    }));
  }, [statuses, tasks]);

  const timelineItems = useMemo(() => {
    const transformed = visibleTasks
      .map((task) => {
        const start = task.startDate ? parseISO(task.startDate) : parseISO(task.createdAt);
        const dueFallback = addDays(start, 3);
        const end = task.dueDate ? parseISO(task.dueDate) : dueFallback;

        return {
          task,
          start,
          end,
          dependency: dependencyBySuccessor.get(task.id) ?? null,
        };
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    if (transformed.length === 0) {
      const now = new Date();
      return {
        items: transformed,
        minDate: startOfMonth(now),
        maxDate: endOfMonth(now),
      };
    }

    let minDate = transformed[0].start;
    let maxDate = transformed[0].end;

    for (const item of transformed) {
      if (item.start < minDate) minDate = item.start;
      if (item.end > maxDate) maxDate = item.end;
    }

    return {
      items: transformed,
      minDate,
      maxDate,
    };
  }, [visibleTasks, dependencyBySuccessor]);

  const timelineTotalDays = useMemo(() => {
    return Math.max(1, differenceInCalendarDays(timelineItems.maxDate, timelineItems.minDate) + 1);
  }, [timelineItems.maxDate, timelineItems.minDate]);

  const doneCount = tasks.filter((task) => task.status.category === "DONE").length;
  const inProgressCount = tasks.filter((task) => task.status.category === "IN_PROGRESS").length;
  const blockedCount = tasks.filter((task) => task.status.category === "BLOCKED").length;
  const completionRate = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);

  const tasksDueThisWeek = useMemo(() => {
    const today = new Date();
    const end = addDays(today, 7).getTime();
    const start = today.getTime();

    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      const time = parseISO(task.dueDate).getTime();
      return time >= start && time <= end;
    }).length;
  }, [tasks]);

  function setTaskSaving(taskId: string, saving: boolean) {
    setSavingTaskIds((previous) => {
      const next = new Set(previous);
      if (saving) {
        next.add(taskId);
      } else {
        next.delete(taskId);
      }
      return next;
    });
  }

  async function updateTask(taskId: string, payload: TaskPatchPayload) {
    setTaskSaving(taskId, true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok || !isTaskResponse(result)) {
        throw new Error(result?.error ?? "Failed to update task.");
      }

      upsertTask(result.task);
    } catch (rawError) {
      setError(rawError instanceof Error ? rawError.message : "Failed to update task.");
    } finally {
      setTaskSaving(taskId, false);
    }
  }

  async function createTask() {
    const trimmed = taskTitle.trim();
    if (!trimmed) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: project.id,
          title: trimmed,
          statusId: taskStatusId || undefined,
          sectionId: taskSectionId || null,
        }),
      });

      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok || !isTaskResponse(result)) {
        throw new Error(result?.error ?? "Failed to create task.");
      }

      upsertTask(result.task);
      setTaskTitle("");
    } catch (rawError) {
      setError(rawError instanceof Error ? rawError.message : "Failed to create task.");
    } finally {
      setIsCreating(false);
    }
  }

  async function deleteTask(taskId: string) {
    setTaskSaving(taskId, true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(result?.error ?? "Failed to delete task.");
      }

      removeTask(taskId);
      setDependencies((previous) =>
        previous.filter(
          (dependency) =>
            dependency.predecessorTaskId !== taskId && dependency.successorTaskId !== taskId,
        ),
      );
    } catch (rawError) {
      setError(rawError instanceof Error ? rawError.message : "Failed to delete task.");
    } finally {
      setTaskSaving(taskId, false);
    }
  }

  async function createDependency(predecessorTaskId: string, successorTaskId: string, type: ProjectDependencyRecord["type"]) {
    const response = await fetch("/api/dependencies", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId: project.id,
        predecessorTaskId,
        successorTaskId,
        type,
      }),
    });

    const result = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok || !isDependencyResponse(result)) {
      throw new Error(result?.error ?? "Failed to create dependency");
    }

    setDependencies((previous) => [
      {
        ...result.dependency,
        createdAt: result.dependency.createdAt,
      },
      ...previous,
    ]);
  }

  async function removeDependency(dependencyId: string) {
    const response = await fetch(`/api/dependencies/${dependencyId}`, {
      method: "DELETE",
    });

    const result = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      throw new Error(result?.error ?? "Failed to remove dependency");
    }

    setDependencies((previous) => previous.filter((dependency) => dependency.id !== dependencyId));
  }

  async function upsertTaskDependency(taskId: string, predecessorTaskId: string | null) {
    setError(null);
    setIsDependencyBusy(true);

    try {
      const existing = dependencies.find((dependency) => dependency.successorTaskId === taskId) ?? null;

      if (!predecessorTaskId) {
        if (existing) {
          await removeDependency(existing.id);
        }
        return;
      }

      if (predecessorTaskId === taskId) {
        throw new Error("A task cannot depend on itself");
      }

      if (existing && existing.predecessorTaskId === predecessorTaskId) {
        return;
      }

      if (existing) {
        await removeDependency(existing.id);
      }

      await createDependency(predecessorTaskId, taskId, "FINISH_TO_START");
    } catch (rawError) {
      setError(rawError instanceof Error ? rawError.message : "Failed to update dependency");
    } finally {
      setIsDependencyBusy(false);
    }
  }

  async function handleDependencySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!depPredecessorTaskId || !depSuccessorTaskId) {
      return;
    }

    if (depPredecessorTaskId === depSuccessorTaskId) {
      setError("Predecessor and successor must be different tasks.");
      return;
    }

    setError(null);
    setIsDependencyBusy(true);

    try {
      await createDependency(depPredecessorTaskId, depSuccessorTaskId, depType);
      setDepPredecessorTaskId("");
      setDepSuccessorTaskId("");
      setDepType("FINISH_TO_START");
    } catch (rawError) {
      setError(rawError instanceof Error ? rawError.message : "Failed to create dependency");
    } finally {
      setIsDependencyBusy(false);
    }
  }

  async function handlePostMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = messageBody.trim();

    if (!body) {
      return;
    }

    setError(null);
    setIsPostingMessage(true);

    try {
      const response = await fetch("/api/project-messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: project.id,
          body,
        }),
      });

      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok || !isMessageResponse(result)) {
        throw new Error(result?.error ?? "Failed to post message");
      }

      setMessages((previous) => [
        {
          ...result.message,
          createdAt: result.message.createdAt,
          updatedAt: result.message.updatedAt,
        },
        ...previous,
      ]);
      setMessageBody("");
    } catch (rawError) {
      setError(rawError instanceof Error ? rawError.message : "Failed to post message");
    } finally {
      setIsPostingMessage(false);
    }
  }

  function onDragStart(event: DragStartEvent) {
    setActiveDragTaskId(parseTaskId(String(event.active.id)));
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveDragTaskId(null);

    if (!event.over) {
      return;
    }

    const taskId = parseTaskId(String(event.active.id));
    const targetStatusId = parseStatusDropId(String(event.over.id));

    if (!targetStatusId || !statuses.some((status) => status.id === targetStatusId)) {
      return;
    }

    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.statusId === targetStatusId) {
      return;
    }

    const targetStatus = statuses.find((status) => status.id === targetStatusId);
    if (!targetStatus) {
      return;
    }

    const optimistic: ProjectTaskRecord = {
      ...task,
      statusId: targetStatusId,
      status: targetStatus,
      position: tasks.filter((item) => item.statusId === targetStatusId).length + 1,
    };

    upsertTask(optimistic);
    await updateTask(task.id, { statusId: targetStatusId });
  }

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const start = startOfWeek(monthStart, { weekStartsOn: 0 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    let cursor = start;

    while (cursor <= end) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }

    return days;
  }, [calendarMonth]);

  return (
    <main className="min-h-screen bg-[radial-gradient(1300px_700px_at_10%_-10%,#fef3c7,transparent),radial-gradient(1200px_700px_at_100%_0%,#dbeafe,transparent)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-4 px-3 py-4 sm:px-4 sm:py-5 lg:px-6">
        <aside className="hidden w-72 shrink-0 rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm backdrop-blur lg:block">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">RabbyTrack</p>
            <p className="mt-1 text-sm text-slate-600">{project.workspace.name}</p>
          </div>

          <Link
            href="/dashboard"
            className="mb-4 block rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to dashboard
          </Link>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Workspace Projects</p>
            <ul className="mt-3 space-y-1">
              {workspaceProjects.map((workspaceProject) => {
                const isCurrent = workspaceProject.id === project.id;
                return (
                  <li key={workspaceProject.id}>
                    <Link
                      href={`/projects/${workspaceProject.id}`}
                      className={`block rounded-lg px-2 py-2 text-sm transition ${
                        isCurrent
                          ? "bg-slate-900 font-semibold text-white"
                          : "text-slate-700 hover:bg-white"
                      }`}
                    >
                      <span className="block truncate">{workspaceProject.name}</span>
                      {workspaceProject.key ? (
                        <span className={`text-xs ${isCurrent ? "text-slate-200" : "text-slate-500"}`}>
                          {workspaceProject.key}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <p className="font-medium text-slate-700">Team Snapshot</p>
            <div className="mt-2 space-y-1 text-slate-600">
              <p>{members.length} members</p>
              <p>{tasks.length} tasks</p>
              <p>{tasksDueThisWeek} due in 7 days</p>
              <p>{dependencies.length} dependencies</p>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Project Workspace</p>
                <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                  {project.name}
                  {project.key ? (
                    <span className="ml-2 text-sm font-semibold text-slate-500">[{project.key}]</span>
                  ) : null}
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {project.description ?? "No description yet. Add goals, timeline details, and ownership notes here."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <div>
                  <p className="uppercase tracking-wide text-slate-500">Start</p>
                  <p className="mt-1 font-semibold text-slate-800">{formatDate(project.startDate)}</p>
                </div>
                <div>
                  <p className="uppercase tracking-wide text-slate-500">Due</p>
                  <p className="mt-1 font-semibold text-slate-800">{formatDate(project.dueDate)}</p>
                </div>
                <div>
                  <p className="uppercase tracking-wide text-slate-500">Tasks</p>
                  <p className="mt-1 font-semibold text-slate-800">{tasks.length}</p>
                </div>
                <div>
                  <p className="uppercase tracking-wide text-slate-500">Completed</p>
                  <p className="mt-1 font-semibold text-emerald-700">{doneCount}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <div className="flex min-w-max items-center gap-2">
                {projectTabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setActiveView(tab.value)}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                      activeView === tab.value
                        ? "bg-slate-900 text-white"
                        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_auto_auto_auto]">
              <input
                type="text"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Add a new task"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sky-500/20 focus:ring"
              />
              <select
                value={taskStatusId}
                onChange={(event) => setTaskStatusId(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
              <select
                value={taskSectionId}
                onChange={(event) => setTaskSectionId(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">No section</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={createTask}
                disabled={isCreating || taskTitle.trim().length === 0}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? "Adding..." : "Add Task"}
              </button>
            </div>

            {error ? (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur sm:p-5"
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search tasks"
                className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500/20 focus:ring"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="ALL">All statuses</option>
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>

            {activeView === "OVERVIEW" ? (
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Completion</p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">{completionRate}%</p>
                    </article>
                    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Dependencies</p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">{dependencies.length}</p>
                    </article>
                    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">In Progress</p>
                      <p className="mt-2 text-3xl font-bold text-amber-600">{inProgressCount}</p>
                    </article>
                    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Blocked</p>
                      <p className="mt-2 text-3xl font-bold text-rose-600">{blockedCount}</p>
                    </article>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-slate-800">Upcoming Deadlines</h3>
                    <ul className="mt-3 space-y-2">
                      {tasks
                        .filter((task) => task.dueDate)
                        .sort((a, b) => new Date(a.dueDate ?? "").getTime() - new Date(b.dueDate ?? "").getTime())
                        .slice(0, 5)
                        .map((task) => (
                          <li key={task.id} className="rounded-lg border border-slate-200 px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-slate-800">{task.title}</p>
                              <span className="text-xs text-slate-500">{formatDate(task.dueDate)}</span>
                            </div>
                          </li>
                        ))}
                      {tasks.filter((task) => task.dueDate).length === 0 ? (
                        <li className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-500">
                          No due dates yet.
                        </li>
                      ) : null}
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-slate-800">Project Roles</h3>
                    <ul className="mt-3 space-y-2">
                      {members.map((member) => (
                        <li key={member.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {member.user.name ?? member.user.email ?? "Team member"}
                            </p>
                            <p className="text-xs text-slate-500">{member.user.email ?? "No email"}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {member.role}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-slate-800">Recent Messages</h3>
                    <ul className="mt-3 space-y-2">
                      {messages.slice(0, 4).map((message) => (
                        <li key={message.id} className="rounded-lg border border-slate-200 px-3 py-2">
                          <p className="text-xs text-slate-500">{getUserName(message)}</p>
                          <p className="mt-1 text-sm text-slate-800">{message.body}</p>
                        </li>
                      ))}
                      {messages.length === 0 ? (
                        <li className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-500">
                          No project messages yet.
                        </li>
                      ) : null}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}

            {activeView === "LIST" ? (
              <div className="space-y-4">
                {groupedForList.bySection.map(({ section, tasks: sectionTasks }) => (
                  <div key={section.id} className="rounded-xl border border-slate-200">
                    <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                      {section.name}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-[980px] w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                            <th className="px-3 py-2">Task</th>
                            <th className="px-3 py-2">Assignee</th>
                            <th className="px-3 py-2">Start</th>
                            <th className="px-3 py-2">Due</th>
                            <th className="px-3 py-2">Priority</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Depends On</th>
                            <th className="px-3 py-2">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sectionTasks.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-3 py-4 text-center text-sm text-slate-500">
                                No tasks in this section.
                              </td>
                            </tr>
                          ) : (
                            sectionTasks.map((task) => {
                              const dependency = dependencyBySuccessor.get(task.id) ?? null;

                              return (
                                <tr key={task.id} className="border-b border-slate-100 last:border-none">
                                  <td className="px-3 py-2">
                                    <input
                                      value={task.title}
                                      onChange={(event) => upsertTask({ ...task, title: event.target.value })}
                                      onBlur={(event) => updateTask(task.id, { title: event.target.value })}
                                      className="w-full rounded-md border border-transparent px-2 py-1 text-sm outline-none hover:border-slate-300 focus:border-sky-400"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <select
                                      value={task.assigneeId ?? ""}
                                      disabled={savingTaskIds.has(task.id)}
                                      onChange={(event) =>
                                        updateTask(task.id, {
                                          assigneeId: event.target.value || null,
                                        })
                                      }
                                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                                    >
                                      <option value="">Unassigned</option>
                                      {members.map((member) => (
                                        <option key={member.user.id} value={member.user.id}>
                                          {member.user.name ?? member.user.email ?? "Unknown"}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="date"
                                      value={toInputDate(task.startDate)}
                                      disabled={savingTaskIds.has(task.id)}
                                      onChange={(event) =>
                                        updateTask(task.id, {
                                          startDate: event.target.value || null,
                                        })
                                      }
                                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="date"
                                      value={toInputDate(task.dueDate)}
                                      disabled={savingTaskIds.has(task.id)}
                                      onChange={(event) =>
                                        updateTask(task.id, {
                                          dueDate: event.target.value || null,
                                        })
                                      }
                                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <select
                                      value={task.priority}
                                      disabled={savingTaskIds.has(task.id)}
                                      onChange={(event) =>
                                        updateTask(task.id, {
                                          priority: event.target.value as ProjectTaskRecord["priority"],
                                        })
                                      }
                                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                                    >
                                      <option value="NONE">None</option>
                                      <option value="LOW">Low</option>
                                      <option value="MEDIUM">Medium</option>
                                      <option value="HIGH">High</option>
                                      <option value="URGENT">Urgent</option>
                                    </select>
                                  </td>
                                  <td className="px-3 py-2">
                                    <select
                                      value={task.statusId}
                                      disabled={savingTaskIds.has(task.id)}
                                      onChange={(event) => updateTask(task.id, { statusId: event.target.value })}
                                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                                    >
                                      {statuses.map((status) => (
                                        <option key={status.id} value={status.id}>
                                          {status.name}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-3 py-2">
                                    <select
                                      value={dependency?.predecessorTaskId ?? ""}
                                      disabled={isDependencyBusy}
                                      onChange={(event) =>
                                        upsertTaskDependency(task.id, event.target.value || null)
                                      }
                                      className="w-44 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                                    >
                                      <option value="">No dependency</option>
                                      {tasks
                                        .filter((candidate) => candidate.id !== task.id)
                                        .map((candidate) => (
                                          <option key={candidate.id} value={candidate.id}>
                                            {candidate.title}
                                          </option>
                                        ))}
                                    </select>
                                  </td>
                                  <td className="px-3 py-2">
                                    <button
                                      type="button"
                                      onClick={() => deleteTask(task.id)}
                                      disabled={savingTaskIds.has(task.id)}
                                      className="rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                <div className="rounded-xl border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                    No Section
                  </div>
                  <div className="px-3 py-3 text-sm text-slate-600">
                    {groupedForList.uncategorized.length === 0
                      ? "No unsectioned tasks"
                      : `${groupedForList.uncategorized.length} unsectioned task(s)`}
                  </div>
                </div>
              </div>
            ) : null}

            {activeView === "BOARD" ? (
              <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <div className="overflow-x-auto">
                  <div className="flex min-h-[380px] gap-3 pb-2">
                    {statusBuckets.map(({ status, tasks: statusTasks }) => (
                      <BoardStatusColumn
                        key={status.id}
                        status={status}
                        tasks={statusTasks}
                        dependencyCountByTask={dependencyCountByTask}
                      />
                    ))}
                  </div>
                </div>

                {activeDragTaskId ? (
                  <p className="mt-3 text-sm text-slate-500">
                    Moving task: {tasks.find((task) => task.id === activeDragTaskId)?.title}
                  </p>
                ) : null}
              </DndContext>
            ) : null}

            {activeView === "TIMELINE" ? (
              <div className="overflow-x-auto">
                <div className="min-w-[900px] space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    Timeline span: {format(timelineItems.minDate, "MMM d, yyyy")} to {format(timelineItems.maxDate, "MMM d, yyyy")}
                  </div>

                  {timelineItems.items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                      No tasks to plot on timeline yet.
                    </div>
                  ) : (
                    timelineItems.items.map(({ task, start, end, dependency }) => {
                      const offset =
                        (differenceInCalendarDays(start, timelineItems.minDate) / timelineTotalDays) * 100;
                      const width =
                        (Math.max(1, differenceInCalendarDays(end, start) + 1) / timelineTotalDays) * 100;

                      return (
                        <div key={task.id} className="grid grid-cols-[260px_1fr] gap-3">
                          <div className="rounded-lg border border-slate-200 px-3 py-2">
                            <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {format(start, "MMM d")} - {format(end, "MMM d")}
                            </p>
                            {dependency ? (
                              <p className="mt-1 text-xs text-amber-700">
                                Waiting on: {dependency.predecessor.title}
                              </p>
                            ) : null}
                          </div>
                          <div className="relative h-12 rounded-lg border border-slate-200 bg-slate-50">
                            <div
                              className="absolute top-1/2 h-7 -translate-y-1/2 rounded-md bg-gradient-to-r from-sky-500 to-cyan-500"
                              style={{
                                left: `${offset}%`,
                                width: `${Math.max(width, 2)}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}

            {activeView === "DASHBOARD" ? (
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-slate-800">Status Breakdown</h3>
                    <div className="mt-3 space-y-2">
                      {statuses.map((status) => {
                        const count = tasks.filter((task) => task.statusId === status.id).length;
                        const pct = tasks.length === 0 ? 0 : Math.round((count / tasks.length) * 100);

                        return (
                          <div key={status.id}>
                            <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                              <span>{status.name}</span>
                              <span>{count} ({pct}%)</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100">
                              <div
                                className="h-2 rounded-full bg-slate-700"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-slate-800">Dependency Risk Radar</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      {dependencies.length === 0
                        ? "No dependency chain risk detected yet."
                        : `${dependencies.length} active dependencies monitored in this project.`}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-slate-800">Health</h3>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{completionRate}%</p>
                    <p className="mt-1 text-xs text-slate-500">Tasks completed</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-slate-800">Communication</h3>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{messages.length}</p>
                    <p className="mt-1 text-xs text-slate-500">Project messages posted</p>
                  </div>
                </div>
              </div>
            ) : null}

            {activeView === "CALENDAR" ? (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCalendarMonth((prev) => addMonths(prev, -1))}
                    className="rounded-md border border-slate-300 px-3 py-1 text-sm"
                  >
                    Prev
                  </button>
                  <p className="text-sm font-semibold text-slate-800">{format(calendarMonth, "MMMM yyyy")}</p>
                  <button
                    type="button"
                    onClick={() => setCalendarMonth((prev) => addMonths(prev, 1))}
                    className="rounded-md border border-slate-300 px-3 py-1 text-sm"
                  >
                    Next
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
                    <div key={label}>{label}</div>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-7 gap-2">
                  {calendarDays.map((day) => {
                    const dueTasks = tasks.filter(
                      (task) => task.dueDate && isSameDay(parseISO(task.dueDate), day),
                    );
                    return (
                      <div
                        key={day.toISOString()}
                        className={`min-h-28 rounded-lg border p-2 text-xs ${
                          isSameMonth(day, calendarMonth)
                            ? "border-slate-200 bg-white"
                            : "border-slate-100 bg-slate-50 text-slate-400"
                        }`}
                      >
                        <p className="mb-2 font-semibold">{format(day, "d")}</p>
                        <div className="space-y-1">
                          {dueTasks.slice(0, 3).map((task) => (
                            <div
                              key={task.id}
                              className={`truncate rounded px-1.5 py-1 text-[11px] font-medium ${statusClass(task.status.category)}`}
                            >
                              {task.title}
                            </div>
                          ))}
                          {dueTasks.length > 3 ? (
                            <p className="text-[11px] text-slate-500">+{dueTasks.length - 3} more</p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {activeView === "WORKFLOW" ? (
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-800">Status Pipeline</h3>
                  <div className="mt-3 space-y-2">
                    {statuses.map((status) => (
                      <div key={status.id} className="rounded-lg border border-slate-200 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(status.category)}`}>
                              {status.category.replace(/_/g, " ")}
                            </span>
                            <p className="text-sm font-medium text-slate-900">{status.name}</p>
                          </div>
                          <p className="text-xs text-slate-500">
                            {tasks.filter((task) => task.statusId === status.id).length} tasks
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-800">Automation Rules (Starter)</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    <li className="rounded-lg border border-slate-200 px-3 py-2">
                      If task moves to Done -&gt; record completion activity
                    </li>
                    <li className="rounded-lg border border-slate-200 px-3 py-2">
                      If due date passes and task is open -&gt; mark as risk
                    </li>
                    <li className="rounded-lg border border-slate-200 px-3 py-2">
                      If dependency added -&gt; notify project message feed
                    </li>
                  </ul>
                </div>
              </div>
            ) : null}

            {activeView === "DEPENDENCIES" ? (
              <div className="space-y-4">
                <form onSubmit={handleDependencySubmit} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_1fr_auto_auto]">
                  <select
                    value={depPredecessorTaskId}
                    onChange={(event) => setDepPredecessorTaskId(event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Predecessor task</option>
                    {tasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </select>

                  <select
                    value={depSuccessorTaskId}
                    onChange={(event) => setDepSuccessorTaskId(event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Successor task</option>
                    {tasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </select>

                  <select
                    value={depType}
                    onChange={(event) => setDepType(event.target.value as ProjectDependencyRecord["type"])}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="FINISH_TO_START">Finish to Start</option>
                    <option value="START_TO_START">Start to Start</option>
                    <option value="FINISH_TO_FINISH">Finish to Finish</option>
                    <option value="START_TO_FINISH">Start to Finish</option>
                  </select>

                  <button
                    type="submit"
                    disabled={isDependencyBusy || !depPredecessorTaskId || !depSuccessorTaskId}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDependencyBusy ? "Saving..." : "Add Dependency"}
                  </button>
                </form>

                {dependencies.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                    No dependencies linked yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[850px] w-full rounded-xl border border-slate-200 text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-2">Predecessor</th>
                          <th className="px-3 py-2">Successor</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Lag</th>
                          <th className="px-3 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dependencies.map((dependency) => (
                          <tr key={dependency.id} className="border-b border-slate-100 last:border-none">
                            <td className="px-3 py-2">{dependency.predecessor.title}</td>
                            <td className="px-3 py-2">{dependency.successor.title}</td>
                            <td className="px-3 py-2">{dependencyTypeLabel[dependency.type]}</td>
                            <td className="px-3 py-2">{dependency.lagMinutes}m</td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => removeDependency(dependency.id).catch((err: unknown) => {
                                  setError(err instanceof Error ? err.message : "Failed to remove dependency");
                                })}
                                className="rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}

            {activeView === "MESSAGES" ? (
              <div className="space-y-4">
                <form onSubmit={handlePostMessage} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <label htmlFor="project-message" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Project Update Message
                  </label>
                  <textarea
                    id="project-message"
                    value={messageBody}
                    onChange={(event) => setMessageBody(event.target.value)}
                    rows={4}
                    placeholder="Share update, blocker, or release note with your team..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500/20 focus:ring"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isPostingMessage || messageBody.trim().length === 0}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPostingMessage ? "Posting..." : "Post message"}
                    </button>
                  </div>
                </form>

                {messages.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                    No project messages yet.
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {messages.map((message) => (
                      <li key={message.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">{getUserName(message)}</p>
                          <p className="text-xs text-slate-500">{formatDate(message.createdAt)}</p>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{message.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {activeView === "FILES" ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                <p className="text-lg font-semibold text-slate-800">Files Module Ready For Next Phase</p>
                <p className="mt-2 text-sm text-slate-600">
                  Project file repository hooks can be connected to Vercel Blob/S3 or Google Drive in the next sprint.
                </p>
              </div>
            ) : null}
          </motion.div>
        </section>
      </div>
    </main>
  );
}
