import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, PlayCircle, Calendar as CalendarIcon } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { ProgressRing } from "@/components/ProgressRing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDailyReport, getDraftTasks, calculateProductivity } from "@/lib/storage";
import { getTodayString } from "@/lib/dates";
import type { Task } from "@/types";

const Index = () => {
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [productivity, setProductivity] = useState(0);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadTodayData();
  }, []);
  
  async function loadTodayData() {
    const today = getTodayString();
    
    // Check if there's a saved report for today
    const report = await getDailyReport(today);
    if (report) {
      setTodayTasks(report.tasks);
      setProductivity(report.productivityPercent);
    } else {
      // Check for draft tasks
      const draft = await getDraftTasks(today);
      if (draft) {
        setTodayTasks(draft);
        setProductivity(calculateProductivity(draft));
      }
    }
    
    setLoading(false);
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
  
  const hasTasksToday = todayTasks.length > 0;
  
  return (
    <MobileLayout>
      <div className="container max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="text-center pt-6 pb-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Glow
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Measure. Grow. Glow.</p>
        </div>
        
        {/* Progress Ring */}
        <div className="flex justify-center py-6">
          <ProgressRing progress={productivity} />
        </div>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/tasks">
            <Card className="p-4 hover:bg-accent/5 transition-colors cursor-pointer h-full">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="font-semibold">Edit Plan</div>
                  <div className="text-xs text-muted-foreground">Set up tasks</div>
                </div>
              </div>
            </Card>
          </Link>
          
          <Link to={hasTasksToday ? `/day/${getTodayString()}` : "/tasks"}>
            <Card className="p-4 hover:bg-accent/5 transition-colors cursor-pointer h-full">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <PlayCircle className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <div className="font-semibold">Log Progress</div>
                  <div className="text-xs text-muted-foreground">Update tasks</div>
                </div>
              </div>
            </Card>
          </Link>
        </div>
        
        {/* Today's Tasks Summary */}
        {hasTasksToday && (
          <Card className="p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Today's Tasks
            </h2>
            <div className="space-y-2">
              {todayTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1">{task.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{task.weight}%</span>
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${task.completionPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {todayTasks.length > 3 && (
                <div className="text-xs text-muted-foreground text-center pt-1">
                  +{todayTasks.length - 3} more tasks
                </div>
              )}
            </div>
          </Card>
        )}
        
        {!hasTasksToday && (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground mb-4">No tasks planned for today</p>
            <Button asChild>
              <Link to="/tasks">Get Started</Link>
            </Button>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
};

export default Index;
