import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, PlayCircle, Calendar as CalendarIcon, FileText, Rocket, ChevronRight, Sparkles, Timer, Lightbulb } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { PageHeader } from "@/components/PageHeader";
import { ProgressRing } from "@/components/ProgressRing";
import { FocusTimer } from "@/components/FocusTimer";
import { QuickStats } from "@/components/QuickStats";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDailyReport, getDraftTasks, calculateProductivity } from "@/lib/storage";
import { useAllReports } from "@/hooks/useReports";
import { getTodayString } from "@/lib/dates";
import { exportDashboardPDF } from "@/lib/exportUtils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Task, DailyReport, Mission } from "@/types";
import React from "react";

// Lazy load heavy components
const SmartSuggestions = React.lazy(() => import("@/components/SmartSuggestions").then(m => ({ default: m.SmartSuggestions })));

const Index = () => {
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [productivity, setProductivity] = useState(0);
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [homeTab, setHomeTab] = useState<'overview' | 'focus'>('overview');
  const { data: reports = [] } = useAllReports();

  useEffect(() => {
    let cancelled = false;
    const today = getTodayString();

    // Phase 1: render today's data ASAP so the UI paints quickly
    Promise.all([getDailyReport(today), getDraftTasks(today)])
      .then(([report, draft]) => {
        if (cancelled) return;
        if (report) {
          setTodayTasks(report.tasks);
          setProductivity(report.productivityPercent);
        } else if (draft) {
          setTodayTasks(draft);
          setProductivity(calculateProductivity(draft));
        }
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });

    // Phase 2: load missions in background (reports come from React Query cache)
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession(); const user = session?.user;
        const missionsResult = user
          ? await supabase.from('missions').select('*').eq('user_id', user.id).eq('is_completed', false).order('created_at', { ascending: false }).limit(3)
          : { data: null as any };
        if (cancelled) return;
        if (missionsResult?.data) {
          setMissions(missionsResult.data.map((m: any) => ({
            id: m.id, title: m.title, description: m.description || undefined,
            progressPercent: Number(m.progress_percent), category: m.category || 'personal',
            targetDate: m.target_date || undefined, isCompleted: m.is_completed,
            createdAt: m.created_at, updatedAt: m.updated_at
          })));
        }
      } catch { /* non-critical */ }
    })();

    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    const totalDays = reports.length;
    const avgProductivity = totalDays > 0 ? reports.reduce((sum, r) => sum + r.productivityPercent, 0) / totalDays : 0;
    const last7Days = reports.slice(0, 7);
    const avg7Days = last7Days.length > 0 ? last7Days.reduce((sum, r) => sum + r.productivityPercent, 0) / last7Days.length : 0;
    const bestDay = reports.length > 0 ? reports.reduce((best, r) => r.productivityPercent > best.productivityPercent ? r : best) : null;

    return { totalDays, avgProductivity, avg7Days, currentStreak: 0, bestDay, todayTasks, todayProductivity: productivity };
  }, [reports, todayTasks, productivity]);

  const handleExportPDF = useCallback(async () => {
    try {
      toast.loading("Generating PDF...");
      await exportDashboardPDF(stats, reports);
      toast.dismiss();
      toast.success("Dashboard exported as PDF!");
    } catch { toast.dismiss(); toast.error("Failed to export PDF"); }
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
      <div className="container max-w-2xl mx-auto p-4 space-y-6">
        <PageHeader title="Glow" subtitle="Measure. Grow. Glow." icon={Sparkles}
          actions={<Button variant="ghost" size="icon" onClick={handleExportPDF} title="Export as PDF"><FileText className="h-4 w-4" /></Button>}
        />
        
        <Tabs value={homeTab} onValueChange={(v) => setHomeTab(v as typeof homeTab)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview" className="text-sm"><Sparkles className="h-4 w-4 mr-2" />Overview</TabsTrigger>
            <TabsTrigger value="focus" className="text-sm"><Timer className="h-4 w-4 mr-2" />Focus Timer</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-4">
            <div className="relative flex justify-center py-6">
              <ProgressRing progress={productivity} size={160} strokeWidth={12} showGlow={true} />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Link to="/tasks">
                <Card className="p-4 hover:bg-accent/5 transition-all duration-200 cursor-pointer h-full hover:shadow-md group">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus className="h-6 w-6 text-primary" />
                    </div>
                    <div><div className="font-semibold">Edit Plan</div><div className="text-xs text-muted-foreground">Set up tasks</div></div>
                  </div>
                </Card>
              </Link>
              <Link to={hasTasksToday ? `/day/${getTodayString()}` : "/tasks"}>
                <Card className="p-4 hover:bg-accent/5 transition-all duration-200 cursor-pointer h-full hover:shadow-md group">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <PlayCircle className="h-6 w-6 text-accent" />
                    </div>
                    <div><div className="font-semibold">Log Progress</div><div className="text-xs text-muted-foreground">Update tasks</div></div>
                  </div>
                </Card>
              </Link>
            </div>
            
            <QuickStats reports={reports} todayProductivity={productivity} />

            <React.Suspense fallback={null}>
              {reports.length >= 3 && <SmartSuggestions reports={reports} todayProductivity={productivity} />}
            </React.Suspense>

            {missions.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold flex items-center gap-2"><Rocket className="h-4 w-4 text-primary" />Active Missions</h2>
                  <Link to="/goals" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">View all <ChevronRight className="h-3 w-3" /></Link>
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
                        {mission.category && <div className="mt-1"><span className="text-xs text-muted-foreground capitalize">{mission.category}</span></div>}
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            )}
            
            {hasTasksToday && (
              <Card className="p-4">
                <h2 className="font-semibold mb-3 flex items-center gap-2"><CalendarIcon className="h-4 w-4" />Today's Tasks</h2>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {todayTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-accent/5 transition-colors">
                      <span className="truncate flex-1 font-medium">{task.title}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground font-semibold">{task.weight}%</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-300" style={{ width: `${task.completionPercent}%` }} />
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
              <Card className="p-6 text-center bg-gradient-to-br from-primary/5 to-accent/5">
                <Lightbulb className="h-12 w-12 text-accent mx-auto mb-4 animate-float" />
                <h3 className="font-semibold mb-2">Ready to Start?</h3>
                <p className="text-muted-foreground text-sm mb-4">Plan your day and track your productivity</p>
                <Button asChild><Link to="/tasks">Get Started</Link></Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="focus" className="mt-4">
            <FocusTimer />
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
};

export default Index;
