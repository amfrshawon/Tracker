import { Prisma } from "@prisma/client";

export const taskOutputSelect = {
  id: true,
  workspaceId: true,
  projectId: true,
  parentTaskId: true,
  sectionId: true,
  statusId: true,
  creatorId: true,
  reporterId: true,
  assigneeId: true,
  title: true,
  description: true,
  priority: true,
  type: true,
  startDate: true,
  dueDate: true,
  completedAt: true,
  estimateMinutes: true,
  position: true,
  isMilestone: true,
  createdAt: true,
  updatedAt: true,
  status: {
    select: {
      id: true,
      name: true,
      color: true,
      category: true,
      position: true,
      isDefault: true,
      isTerminal: true,
    },
  },
  section: {
    select: {
      id: true,
      name: true,
      position: true,
    },
  },
  assignee: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  },
  creator: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.TaskSelect;

export type TaskOutput = Prisma.TaskGetPayload<{
  select: typeof taskOutputSelect;
}>;
