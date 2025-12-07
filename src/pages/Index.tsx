import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Plus, PlayCircle, Calendar as CalendarIcon, Download, FileText, Image } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { ProgressRing } from "@/components/ProgressRing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDailyReport, getDraftTasks, calculateProductivity, getAllDailyReports } from "@/lib/storage";
import { getTodayString } from "@/lib/dates";
import { exportDashboardPDF, exportElementAsPNG } from "@/lib/exportUtils";
import { toast } from "sonner";
import type { Task, DailyReport } from "@/types";

const Index = () => {
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [productivity, setProductivity] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    loadTodayData();
  }, []);
  
  async function loadTodayData() {
    const today = getTodayString();
    
    // Load all reports for stats
    const allReports = await getAllDailyReports();
    setReports(allReports.sort((a, b) => b.date.localeCompare(a.date)));
    
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

  // Calculate stats for export
  const getExportStats = () => {
    const totalDays = reports.length;
    const avgProductivity = totalDays > 0
      ? reports.reduce((sum, r) => sum + r.productivityPercent, 0) / totalDays
      : 0;
    
    const last7Days = reports.slice(0, 7);
    const avg7Days = last7Days.length > 0
      ? last7Days.reduce((sum, r) => sum + r.productivityPercent, 0) / last7Days.length
      : 0;
    
    const bestDay = reports.length > 0
      ? reports.reduce((best, r) => r.productivityPercent > best.productivityPercent ? r : best)
      : null;
    
    // Calculate streak
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

    return {
      totalDays,
      avgProductivity,
      avg7Days,
      currentStreak,
      bestDay,
      todayTasks,
      todayProductivity: productivity
    };
  };

  const handleExportPDF = async () => {
    try {
      toast.loading("Generating PDF...");
      await exportDashboardPDF(getExportStats(), reports);
      toast.dismiss();
      toast.success("Dashboard exported as PDF!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to export PDF");
    }
  };

  const handleExportPNG = async () => {
    if (!dashboardRef.current) return;
    try {
      toast.loading("Generating image...");
      await exportElementAsPNG(dashboardRef.current, "glow-dashboard");
      toast.dismiss();
      toast.success("Dashboard exported as PNG!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to export image");
    }
  };
  
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
      <div className="container max-w-2xl mx-auto p-4 space-y-6" ref={dashboardRef}>
        {/* Header with Export */}
        <div className="flex items-center justify-between pt-6 pb-2">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Glow
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Measure. Grow. Glow.</p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={handleExportPNG} title="Export as PNG">
              <Image className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleExportPDF} title="Export as PDF">
              <FileText className="h-4 w-4" />
            </Button>
          </div>
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
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Link to="/analytics">
            <Card className="p-3 hover:bg-accent/5 transition-colors cursor-pointer">
              <div className="text-xs text-muted-foreground mb-1">Tasks</div>
              <div className="text-xl font-bold">{todayTasks.length}</div>
            </Card>
          </Link>
          <Link to="/goals">
            <Card className="p-3 hover:bg-accent/5 transition-colors cursor-pointer">
              <div className="text-xs text-muted-foreground mb-1">Goal</div>
              <div className="text-xl font-bold">75%</div>
            </Card>
          </Link>
          <Link to="/insights">
            <Card className="p-3 hover:bg-accent/5 transition-colors cursor-pointer">
              <div className="text-xs text-muted-foreground mb-1">Streak</div>
              <div className="text-xl font-bold">{getExportStats().currentStreak}</div>
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
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {todayTasks.map((task) => (
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
