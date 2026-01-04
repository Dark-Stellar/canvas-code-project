import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, PlayCircle, Calendar as CalendarIcon, FileText, Rocket, ChevronRight, Home, Sparkles } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { PageHeader } from "@/components/PageHeader";
import { ProgressRing } from "@/components/ProgressRing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getDailyReport, getDraftTasks, calculateProductivity, getAllDailyReports } from "@/lib/storage";
import { getTodayString } from "@/lib/dates";
import { exportDashboardPDF } from "@/lib/exportUtils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Task, DailyReport, Mission } from "@/types";

const Index = () => {
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [productivity, setProductivity] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);

  useEffect(() => {
    loadTodayData();
    loadMissions();
  }, []);

  const loadTodayData = useCallback(async () => {
    const today = getTodayString();
    const allReports = await getAllDailyReports();
    setReports(allReports.sort((a, b) => b.date.localeCompare(a.date)));

    const report = await getDailyReport(today);
    if (report) {
      setTodayTasks(report.tasks);
      setProductivity(report.productivityPercent);
    } else {
      const draft = await getDraftTasks(today);
      if (draft) {
        setTodayTasks(draft);
        setProductivity(calculateProductivity(draft));
      }
    }
    setLoading(false);
  }, []);

  const loadMissions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data } = await supabase
      .from('missions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_completed', false)
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (data) {
      setMissions(data.map(m => ({
        id: m.id,
        title: m.title,
        description: m.description || undefined,
        progressPercent: Number(m.progress_percent),
        category: m.category || 'personal',
        targetDate: m.target_date || undefined,
        isCompleted: m.is_completed,
        createdAt: m.created_at,
        updatedAt: m.updated_at
      })));
    }
  }, []);

  const stats = useMemo(() => {
    const totalDays = reports.length;
    const avgProductivity = totalDays > 0 ? reports.reduce((sum, r) => sum + r.productivityPercent, 0) / totalDays : 0;
    const last7Days = reports.slice(0, 7);
    const avg7Days = last7Days.length > 0 ? last7Days.reduce((sum, r) => sum + r.productivityPercent, 0) / last7Days.length : 0;
    const bestDay = reports.length > 0 ? reports.reduce((best, r) => r.productivityPercent > best.productivityPercent ? r : best) : null;

    let currentStreak = 0;
    const today = new Date();
    for (let i = 0; i < reports.length; i++) {
      const reportDate = new Date(reports[i].date);
      const daysDiff = Math.floor((today.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff === i && reports[i].productivityPercent >= 60) {
        currentStreak++;
      } else {
        break;
      }
    }
    return { totalDays, avgProductivity, avg7Days, currentStreak, bestDay, todayTasks, todayProductivity: productivity };
  }, [reports, todayTasks, productivity]);

  const handleExportPDF = useCallback(async () => {
    try {
      toast.loading("Generating PDF...");
      await exportDashboardPDF(stats, reports);
      toast.dismiss();
      toast.success("Dashboard exported as PDF!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to export PDF");
    }
  }, [stats, reports]);

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </MobileLayout>
    );
  }

  const hasTasksToday = todayTasks.length > 0;

  return (
    <MobileLayout>
      <div className="w-full max-w-lg mx-auto px-4 py-3 space-y-4">
        <PageHeader
          title="Glow"
          subtitle="Measure. Grow. Glow."
          icon={Sparkles}
          actions={
            <Button variant="ghost" size="icon" onClick={handleExportPDF} title="Export as PDF">
              <FileText className="h-4 w-4" />
            </Button>
          }
        />
        
        {/* Progress Ring */}
        <div className="flex justify-center py-4">
          <ProgressRing progress={productivity} />
        </div>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/tasks">
            <Card className="p-4 hover:bg-accent/5 transition-all duration-200 cursor-pointer h-full hover:shadow-md">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
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
            <Card className="p-4 hover:bg-accent/5 transition-all duration-200 cursor-pointer h-full hover:shadow-md">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
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
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Link to="/analytics">
            <Card className="p-3 hover:bg-accent/5 transition-all duration-200 cursor-pointer hover:shadow-sm">
              <div className="text-xs text-muted-foreground mb-1">Tasks</div>
              <div className="text-xl font-bold">{todayTasks.length}</div>
            </Card>
          </Link>
          <Link to="/goals">
            <Card className="p-3 hover:bg-accent/5 transition-all duration-200 cursor-pointer hover:shadow-sm">
              <div className="text-xs text-muted-foreground mb-1">7-Day Avg</div>
              <div className="text-xl font-bold">{Math.round(stats.avg7Days)}%</div>
            </Card>
          </Link>
          <Link to="/insights">
            <Card className="p-3 hover:bg-accent/5 transition-all duration-200 cursor-pointer hover:shadow-sm">
              <div className="text-xs text-muted-foreground mb-1">Streak</div>
              <div className="text-xl font-bold">{stats.currentStreak}</div>
            </Card>
          </Link>
        </div>

        {/* Active Missions */}
        {missions.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Rocket className="h-4 w-4 text-primary" />
                Active Missions
              </h2>
              <Link to="/goals" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {missions.map(mission => (
                <Link to="/goals" key={mission.id} className="block">
                  <div className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium truncate flex-1">{mission.title}</span>
                      <span className="text-xs font-bold text-primary ml-2">{mission.progressPercent}%</span>
                    </div>
                    <Progress value={mission.progressPercent} className="h-1.5" />
                    {mission.category && (
                      <div className="mt-1">
                        <span className="text-xs text-muted-foreground capitalize">{mission.category}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )}
        
        {/* Today's Tasks Summary */}
        {hasTasksToday && (
          <Card className="p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Today's Tasks
            </h2>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {todayTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-accent/5 transition-colors">
                  <span className="truncate flex-1 font-medium">{task.title}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-semibold">{task.weight}%</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-300" 
                          style={{ width: `${task.completionPercent}%` }} 
                        />
                      </div>
                      <span className="text-xs font-medium w-10 text-right">{task.completionPercent}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Total Tasks:</span>
                <span className="text-primary font-bold">{todayTasks.length}</span>
              </div>
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
