import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Save, AlertCircle } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { TaskRow } from "@/components/TaskRow";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getDraftTasks, saveDraftTasks, normalizeWeights } from "@/lib/storage";
import { getTodayString } from "@/lib/dates";
import type { Task } from "@/types";
import { toast } from "sonner";
import { saveDefaultTemplate } from "@/lib/defaultTemplate";

const Tasks = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadTasks();
  }, []);
  
  async function loadTasks() {
    const today = getTodayString();
    const draft = await getDraftTasks(today);
    
    if (draft) {
      setTasks(draft);
    } else {
      // Start with one default task
      setTasks([createNewTask("Deep Work")]);
    }
    
    setLoading(false);
  }
  
  function createNewTask(title = ""): Task {
    return {
      id: crypto.randomUUID(),
      title,
      weight: 25,
      completionPercent: 0,
      createdAt: new Date().toISOString(),
    };
  }
  
  function addTask() {
    setTasks([...tasks, createNewTask()]);
  }
  
  function updateTask(id: string, updated: Task) {
    setTasks(tasks.map(t => t.id === id ? updated : t));
  }
  
  function deleteTask(id: string) {
    if (tasks.length === 1) {
      toast.error("You must have at least one task");
      return;
    }
    setTasks(tasks.filter(t => t.id !== id));
  }
  
  function autoNormalize() {
    setTasks(normalizeWeights(tasks));
    toast.success("Weights normalized to 100%");
  }
  
  async function saveTasks() {
    const totalWeight = tasks.reduce((sum, t) => sum + t.weight, 0);
    
    if (Math.abs(totalWeight - 100) > 0.1) {
      toast.error("Weights must sum to 100%. Use Auto-Normalize or adjust manually.");
      return;
    }
    
    // Validate each task
    for (const task of tasks) {
      if (!task.title.trim()) {
        toast.error("All tasks must have a title");
        return;
      }
      
      if (task.title.length > 200) {
        toast.error("Task titles must be less than 200 characters");
        return;
      }

      if (task.weight < 0 || task.weight > 100) {
        toast.error("Weights must be between 0 and 100");
        return;
      }
    }
    
    const today = getTodayString();
    await saveDraftTasks(today, tasks);
    
    // Save as default template for future dates
    await saveDefaultTemplate(tasks);
    
    toast.success("Tasks saved as your default plan!");
    navigate("/");
  }
  
  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </MobileLayout>
    );
  }
  
  const totalWeight = tasks.reduce((sum, t) => sum + t.weight, 0);
  const isValid = Math.abs(totalWeight - 100) < 0.1;
  
  return (
    <MobileLayout>
      <div className="container max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between pt-4">
          <div>
            <h1 className="text-2xl font-bold">Edit Plan</h1>
            <p className="text-sm text-muted-foreground">Define tasks and weights</p>
          </div>
        </div>
        
        {!isValid && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Total weight: {totalWeight.toFixed(1)}%. Must equal 100%.
              <Button 
                variant="link" 
                size="sm" 
                onClick={autoNormalize}
                className="ml-2"
              >
                Auto-Normalize
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <Card className={isValid ? "p-4 border-success" : "p-4"}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">
              Total Weight: <span className={isValid ? "text-success" : "text-destructive"}>
                {totalWeight.toFixed(1)}%
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Target: 100%
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${isValid ? 'bg-success' : 'bg-destructive'}`}
              style={{ width: `${Math.min(totalWeight, 100)}%` }}
            />
          </div>
        </Card>
        
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onUpdate={(updated) => updateTask(task.id, updated)}
              onDelete={() => deleteTask(task.id)}
            />
          ))}
        </div>
        
        <Button 
          variant="outline" 
          onClick={addTask}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
        
        <div className="flex gap-2 pt-4 pb-8">
          <Button 
            onClick={saveTasks}
            disabled={!isValid}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Tasks
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Tasks;
