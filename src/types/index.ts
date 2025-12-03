export interface Task {
  id: string;
  title: string;
  description?: string;
  weight: number;
  category?: string;
  dueTime?: string;
  estimatedDuration?: number;
  completionPercent: number;
  createdAt: string;
}

export interface DailyReport {
  id: string;
  date: string;
  tasks: Task[];
  productivityPercent: number;
  notes?: string;
  createdAt: string;
  version: number;
}

export interface Template {
  id: string;
  title: string;
  description?: string;
  tasks: Omit<Task, 'id' | 'completionPercent' | 'createdAt'>[];
  createdAt: string;
}

export interface UserPreferences {
  id?: string;
  morningReminderTime?: string;
  eveningReminderTime?: string;
  notificationsEnabled: boolean;
  maxMajorTasks: number;
  timezone: string;
}

export interface ProductivityGoal {
  id: string;
  goalType: 'daily' | 'weekly' | 'monthly';
  targetPercentage: number;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface Mission {
  id: string;
  title: string;
  description?: string;
  progressPercent: number;
  category: string;
  targetDate?: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export const TASK_CATEGORIES = [
  'Work',
  'Personal',
  'Health',
  'Learning',
  'Creative',
  'Social',
  'Finance',
  'Other'
] as const;

export const MISSION_CATEGORIES = [
  'personal',
  'career',
  'health',
  'learning',
  'financial',
  'creative',
  'social',
  'other'
] as const;

export type TaskCategory = typeof TASK_CATEGORIES[number];
export type MissionCategory = typeof MISSION_CATEGORIES[number];
