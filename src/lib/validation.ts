import { z } from 'zod';

/**
 * Security validation schemas for user inputs
 * These prevent malicious or malformed data from reaching the database
 */

export const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string()
    .trim()
    .min(1, 'Task title cannot be empty')
    .max(200, 'Task title must be less than 200 characters'),
  weight: z.number()
    .min(0, 'Weight cannot be negative')
    .max(100, 'Weight cannot exceed 100%'),
  completionPercent: z.number()
    .min(0, 'Completion cannot be negative')
    .max(100, 'Completion cannot exceed 100%'),
  category: z.string().max(50).optional(),
  isMajor: z.boolean().optional(),
});

export const tasksArraySchema = z.array(taskSchema)
  .min(1, 'At least one task is required');

export const notesSchema = z.string()
  .max(5000, 'Notes must be less than 5000 characters')
  .optional();

export const templateSchema = z.object({
  title: z.string()
    .trim()
    .min(1, 'Template title cannot be empty')
    .max(200, 'Template title must be less than 200 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  tasks: tasksArraySchema,
});

export const dailyReportSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  tasks: tasksArraySchema,
  notes: notesSchema,
  productivityPercent: z.number()
    .min(0, 'Productivity cannot be negative')
    .max(100, 'Productivity cannot exceed 100%'),
});

export type ValidatedTask = z.infer<typeof taskSchema>;
export type ValidatedTemplate = z.infer<typeof templateSchema>;
export type ValidatedDailyReport = z.infer<typeof dailyReportSchema>;
