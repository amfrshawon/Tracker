export type WorkspaceProjectSummary = {
  id: string;
  name: string;
  key: string | null;
  status: string;
};

export type ProjectStatusRecord = {
  id: string;
  name: string;
  color: string | null;
  category: string;
  position: number;
  isDefault: boolean;
  isTerminal: boolean;
};

export type ProjectSectionRecord = {
  id: string;
  name: string;
  position: number;
};

export type ProjectMemberRecord = {
  id: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

export type ProjectTaskRecord = {
  id: string;
  workspaceId: string;
  projectId: string;
  parentTaskId: string | null;
  sectionId: string | null;
  statusId: string;
  creatorId: string;
  reporterId: string | null;
  assigneeId: string | null;
  title: string;
  description: string | null;
  priority: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  type: "TASK" | "BUG" | "STORY" | "EPIC" | "MILESTONE";
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  estimateMinutes: number | null;
  position: number;
  isMilestone: boolean;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatusRecord;
  section: ProjectSectionRecord | null;
  assignee: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  creator: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

export type ProjectDependencyRecord = {
  id: string;
  predecessorTaskId: string;
  successorTaskId: string;
  type: "FINISH_TO_START" | "START_TO_START" | "FINISH_TO_FINISH" | "START_TO_FINISH";
  lagMinutes: number;
  createdAt: string;
  predecessor: {
    id: string;
    title: string;
    statusId: string;
  };
  successor: {
    id: string;
    title: string;
    statusId: string;
  };
};

export type ProjectMessageRecord = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

export type ProjectWorkspaceData = {
  id: string;
  name: string;
  key: string | null;
  description: string | null;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  statuses: ProjectStatusRecord[];
  sections: ProjectSectionRecord[];
  members: ProjectMemberRecord[];
};
