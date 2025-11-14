import { supabase } from '@/integrations/supabase/client';
import type { Task } from '@/types';

export async function saveDefaultTemplate(tasks: Task[]) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;
  
  const { error } = await supabase
    .from('default_template')
    .upsert({
      user_id: user.id,
      tasks: tasks as any,
    }, {
      onConflict: 'user_id'
    });
  
  if (error) {
    console.error('Failed to save default template:', error);
  }
}

export async function getDefaultTemplate(): Promise<Task[] | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const { data } = await supabase
    .from('default_template')
    .select('tasks')
    .eq('user_id', user.id)
    .maybeSingle();
  
  if (data && data.tasks) {
    return data.tasks as any as Task[];
  }
  
  return null;
}
