import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { DailyReport, Template, Task, UserPreferences } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface GlowDB extends DBSchema {
  dailyReports: {
    key: string;
    value: DailyReport;
    indexes: { 'by-date': string };
  };
  templates: {
    key: string;
    value: Template;
  };
  preferences: {
    key: string;
    value: UserPreferences;
  };
  draftTasks: {
    key: string;
    value: { date: string; tasks: Task[] };
  };
}

let db: IDBPDatabase<GlowDB> | null = null;

export async function initDB() {
  if (db) return db;
  
  db = await openDB<GlowDB>('glow-db', 1, {
    upgrade(db) {
      // Daily reports store
      const reportStore = db.createObjectStore('dailyReports', { keyPath: 'id' });
      reportStore.createIndex('by-date', 'date');
      
      // Templates store
      db.createObjectStore('templates', { keyPath: 'id' });
      
      // Preferences store
      db.createObjectStore('preferences', { keyPath: 'id' });
      
      // Draft tasks store (for today's work in progress)
      db.createObjectStore('draftTasks', { keyPath: 'date' });
    },
  });
  
  return db;
}

// Daily Reports
export async function saveDailyReport(report: DailyReport) {
  // Validate input before saving
  if (report.notes && report.notes.length > 5000) {
    throw new Error('Notes exceed maximum length of 5000 characters');
  }
  
  for (const task of report.tasks) {
    if (!task.title || task.title.length > 200) {
      throw new Error('Task title must be 1-200 characters');
    }
    if (task.weight < 0 || task.weight > 100) {
      throw new Error('Task weight must be between 0 and 100');
    }
    if (task.completionPercent < 0 || task.completionPercent > 100) {
      throw new Error('Task completion must be between 0 and 100');
    }
  }

  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const { error } = await supabase
      .from('daily_reports')
      .upsert({
        id: report.id,
        user_id: user.id,
        date: report.date,
        tasks: report.tasks as any,
        productivity_percent: report.productivityPercent,
        notes: report.notes,
        version: report.version,
      }, {
        onConflict: 'id'
      });
    
    if (error) {
      throw new Error('Failed to save daily report');
    }
  }
  
  // Also save locally as backup
  const database = await initDB();
  await database.put('dailyReports', report);
}

export async function getDailyReport(date: string): Promise<DailyReport | undefined> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .maybeSingle();
    
    if (!error && data) {
      return {
        id: data.id,
        date: data.date,
        tasks: data.tasks as any as Task[],
        productivityPercent: data.productivity_percent,
        notes: data.notes || undefined,
        createdAt: data.created_at,
        version: data.version,
      };
    }
  }
  
  // Fallback to local storage
  const database = await initDB();
  const reports = await database.getAllFromIndex('dailyReports', 'by-date', date);
  return reports[0];
}

export async function getAllDailyReports(): Promise<DailyReport[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    
    if (!error && data) {
      return data.map(d => ({
        id: d.id,
        date: d.date,
        tasks: d.tasks as any as Task[],
        productivityPercent: d.productivity_percent,
        notes: d.notes || undefined,
        createdAt: d.created_at,
        version: d.version,
      }));
    }
  }
  
  // Fallback to local storage
  const database = await initDB();
  return database.getAll('dailyReports');
}

export async function getReportsInRange(startDate: string, endDate: string): Promise<DailyReport[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });
    
    if (!error && data) {
      return data.map(d => ({
        id: d.id,
        date: d.date,
        tasks: d.tasks as any as Task[],
        productivityPercent: d.productivity_percent,
        notes: d.notes || undefined,
        createdAt: d.created_at,
        version: d.version,
      }));
    }
  }
  
  // Fallback to local storage
  const database = await initDB();
  const allReports = await database.getAll('dailyReports');
  return allReports.filter(r => r.date >= startDate && r.date <= endDate);
}

// Templates
export async function saveTemplate(template: Template) {
  // Validate input before saving
  if (!template.title || template.title.length > 200) {
    throw new Error('Template title must be 1-200 characters');
  }
  
  if (template.description && template.description.length > 500) {
    throw new Error('Template description must be less than 500 characters');
  }
  
  for (const task of template.tasks) {
    if (!task.title || task.title.length > 200) {
      throw new Error('Task title must be 1-200 characters');
    }
    if (task.weight < 0 || task.weight > 100) {
      throw new Error('Task weight must be between 0 and 100');
    }
  }

  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const { error } = await supabase
      .from('templates')
      .upsert({
        user_id: user.id,
        title: template.title,
        description: template.description,
        tasks: template.tasks as any,
      });
    
    if (error) throw error;
  }
  
  // Also save locally as backup
  const database = await initDB();
  await database.put('templates', template);
}

export async function getTemplate(id: string): Promise<Template | undefined> {
  const database = await initDB();
  return database.get('templates', id);
}

export async function getAllTemplates(): Promise<Template[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      return data.map(d => ({
        id: d.id,
        title: d.title,
        description: d.description || undefined,
        tasks: d.tasks as Omit<Task, 'id' | 'completionPercent' | 'createdAt'>[],
        createdAt: d.created_at,
      }));
    }
  }
  
  // Fallback to local storage
  const database = await initDB();
  return database.getAll('templates');
}

export async function deleteTemplate(id: string) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    await supabase
      .from('templates')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
  }
  
  // Also delete locally
  const database = await initDB();
  await database.delete('templates', id);
}

// Draft Tasks (work in progress for a specific date)
export async function saveDraftTasks(date: string, tasks: Task[]) {
  // Validate input before saving
  for (const task of tasks) {
    if (!task.title || task.title.length > 200) {
      throw new Error('Task title must be 1-200 characters');
    }
    if (task.weight < 0 || task.weight > 100) {
      throw new Error('Task weight must be between 0 and 100');
    }
  }

  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const { error } = await supabase
      .from('draft_tasks')
      .upsert({
        user_id: user.id,
        date,
        tasks: tasks as any,
      }, {
        onConflict: 'user_id,date'
      });
    
    if (error) {
      throw new Error('Failed to save draft tasks');
    }
  }
  
  // Also save locally as backup
  const database = await initDB();
  await database.put('draftTasks', { date, tasks });
}

export async function getDraftTasks(date: string): Promise<Task[] | undefined> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const { data, error } = await supabase
      .from('draft_tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .maybeSingle();
    
    if (!error && data) {
      return data.tasks as any as Task[];
    }
  }
  
  // Fallback to local storage
  const database = await initDB();
  const draft = await database.get('draftTasks', date);
  return draft?.tasks;
}

export async function clearDraftTasks(date: string) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    await supabase
      .from('draft_tasks')
      .delete()
      .eq('user_id', user.id)
      .eq('date', date);
  }
  
  // Also delete locally
  const database = await initDB();
  await database.delete('draftTasks', date);
}

// Preferences
export async function savePreferences(preferences: UserPreferences) {
  const database = await initDB();
  await database.put('preferences', preferences as any);
}

export async function getPreferences(): Promise<UserPreferences | undefined> {
  const database = await initDB();
  return database.get('preferences', 'user-preferences');
}

// Utility: Calculate productivity
export function calculateProductivity(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  
  const totalWeight = tasks.reduce((sum, task) => sum + task.weight, 0);
  if (totalWeight === 0) return 0;
  
  const weightedCompletion = tasks.reduce(
    (sum, task) => sum + (task.weight * task.completionPercent) / 100,
    0
  );
  
  return Math.round((weightedCompletion / totalWeight) * 100 * 100) / 100;
}

// Utility: Normalize weights to sum to 100
export function normalizeWeights(tasks: Task[]): Task[] {
  const totalWeight = tasks.reduce((sum, task) => sum + task.weight, 0);
  
  if (totalWeight === 0) {
    const equalWeight = Math.round((100 / tasks.length) * 100) / 100;
    return tasks.map(task => ({ ...task, weight: equalWeight }));
  }
  
  if (totalWeight === 100) return tasks;
  
  const scale = 100 / totalWeight;
  let normalized = tasks.map(task => ({
    ...task,
    weight: Math.round(task.weight * scale * 100) / 100,
  }));
  
  // Fix rounding errors
  const newTotal = normalized.reduce((sum, task) => sum + task.weight, 0);
  if (newTotal !== 100 && normalized.length > 0) {
    normalized[0].weight = Math.round((normalized[0].weight + (100 - newTotal)) * 100) / 100;
  }
  
  return normalized;
}
