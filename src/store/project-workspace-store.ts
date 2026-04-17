import { create } from "zustand";

import type {
  ProjectMemberRecord,
  ProjectSectionRecord,
  ProjectStatusRecord,
  ProjectTaskRecord,
} from "@/types/project-workspace";

export type ProjectViewTab = "LIST" | "BOARD" | "CALENDAR";

type HydratePayload = {
  projectId: string;
  statuses: ProjectStatusRecord[];
  sections: ProjectSectionRecord[];
  members: ProjectMemberRecord[];
  tasks: ProjectTaskRecord[];
};

type ProjectWorkspaceStore = {
  projectId: string | null;
  activeView: ProjectViewTab;
  statuses: ProjectStatusRecord[];
  sections: ProjectSectionRecord[];
  members: ProjectMemberRecord[];
  tasks: ProjectTaskRecord[];
  hydrate: (payload: HydratePayload) => void;
  setActiveView: (view: ProjectViewTab) => void;
  upsertTask: (task: ProjectTaskRecord) => void;
  removeTask: (taskId: string) => void;
};

function sortTasks(tasks: ProjectTaskRecord[]): ProjectTaskRecord[] {
  return [...tasks].sort((a, b) => {
    if (a.status.position !== b.status.position) {
      return a.status.position - b.status.position;
    }

    if ((a.section?.position ?? 99999) !== (b.section?.position ?? 99999)) {
      return (a.section?.position ?? 99999) - (b.section?.position ?? 99999);
    }

    if (a.position !== b.position) {
      return a.position - b.position;
    }

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export const useProjectWorkspaceStore = create<ProjectWorkspaceStore>((set) => ({
  projectId: null,
  activeView: "LIST",
  statuses: [],
  sections: [],
  members: [],
  tasks: [],
  hydrate(payload) {
    set({
      projectId: payload.projectId,
      statuses: [...payload.statuses].sort((a, b) => a.position - b.position),
      sections: [...payload.sections].sort((a, b) => a.position - b.position),
      members: payload.members,
      tasks: sortTasks(payload.tasks),
    });
  },
  setActiveView(view) {
    set({ activeView: view });
  },
  upsertTask(task) {
    set((state) => {
      const existing = state.tasks.find((item) => item.id === task.id);

      if (!existing) {
        return {
          tasks: sortTasks([...state.tasks, task]),
        };
      }

      return {
        tasks: sortTasks(state.tasks.map((item) => (item.id === task.id ? task : item))),
      };
    });
  },
  removeTask(taskId) {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== taskId),
    }));
  },
}));
