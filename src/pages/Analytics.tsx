import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/MobileLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllDailyReports } from "@/lib/storage";
import { TrendingUp, Calendar as CalendarIcon, Target, Zap, Edit, Eye, EyeOff, FileText, BarChart3, PieChart, Activity, ArrowUp, ArrowDown, Flame, Trophy } from "lucide-react";
import type { DailyReport, ProductivityGoal } from "@/types";
import { formatDisplayDate } from "@/lib/dates";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Cell, Pie, AreaChart, Area } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const HIDDEN_TASKS_KEY = 'glow_hidden_tasks';
const CHART_COLORS = ['hsl(270, 60%, 45%)', 'hsl(45, 95%, 55%)', 'hsl(142, 76%, 36%)', 'hsl(199, 89%, 48%)', 'hsl(0, 70%, 50%)'];

const Analytics = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [goals, setGoals] = useState<ProductivityGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenTasks, setHiddenTasks] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(HIDDEN_TASKS_KEY);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [chartRange, setChartRange] = useState<'7' | '14' | '30' | '90'>('30');
  const [chartView, setChartView] = useState<'trend' | 'distribution' | 'comparison'>('trend');
  const chartsRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    loadAnalytics();
    loadGoals();
  }, []);
  
  useEffect(() => {
    localStorage.setItem(HIDDEN_TASKS_KEY, JSON.stringify([...hiddenTasks]));
  }, [hiddenTasks]);
  
  const loadAnalytics = useCallback(async () => {
    const allReports = await getAllDailyReports();
    setReports(allReports.sort((a, b) => b.date.localeCompare(a.date)));
    setLoading(false);
  }, []);
  
  const loadGoals = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data } = await supabase
      .from('productivity_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) {
      setGoals(data.map(g => ({
        id: g.id,
        goalType: g.goal_type as 'daily' | 'weekly' | 'monthly',
        targetPercentage: g.target_percentage,
        startDate: g.start_date,
        endDate: g.end_date,
        createdAt: g.created_at
      })));
    }
  }, []);
  
  const stats = useMemo(() => {
    const totalDays = reports.length;
    const avgProductivity = totalDays > 0 ? reports.reduce((sum, r) => sum + r.productivityPercent, 0) / totalDays : 0;
    const last7Days = reports.slice(0, 7);
    const avg7Days = last7Days.length > 0 ? last7Days.reduce((sum, r) => sum + r.productivityPercent, 0) / last7Days.length : 0;
    const prev7Days = reports.slice(7, 14);
    const avgPrev7 = prev7Days.length > 0 ? prev7Days.reduce((sum, r) => sum + r.productivityPercent, 0) / prev7Days.length : 0;
    const weeklyChange = avg7Days - avgPrev7;
    const bestDay = reports.length > 0 ? reports.reduce((best, r) => r.productivityPercent > best.productivityPercent ? r : best) : null;
    const worstDay = reports.length > 0 ? reports.reduce((worst, r) => r.productivityPercent < worst.productivityPercent ? r : worst) : null;
    
    // Current streak (consecutive days >= 60%)
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
    
    // Longest streak ever
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedReports = [...reports].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 0; i < sortedReports.length; i++) {
      if (sortedReports[i].productivityPercent >= 60) {
        tempStreak++;
        if (i > 0) {
          const prevDate = new Date(sortedReports[i - 1].date);
          const currDate = new Date(sortedReports[i].date);
          const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff !== 1) {
            tempStreak = 1;
          }
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    
    // Best week (highest 7-day average)
    let bestWeekAvg = 0;
    let bestWeekStart = '';
    for (let i = 0; i <= reports.length - 7; i++) {
      const weekReports = reports.slice(i, i + 7);
      const weekAvg = weekReports.reduce((sum, r) => sum + r.productivityPercent, 0) / 7;
      if (weekAvg > bestWeekAvg) {
        bestWeekAvg = weekAvg;
        bestWeekStart = weekReports[weekReports.length - 1].date;
      }
    }
    
    return { totalDays, avgProductivity, avg7Days, avgPrev7, weeklyChange, bestDay, worstDay, currentStreak, longestStreak, bestWeekAvg, bestWeekStart };
  }, [reports]);
  
  const trendData = useMemo(() => {
    const range = parseInt(chartRange);
    return reports.slice(0, range).reverse().map(r => ({
      date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      productivity: Math.round(r.productivityPercent),
      tasks: r.tasks.length,
      completed: r.tasks.filter(t => t.completionPercent === 100).length
    }));
  }, [reports, chartRange]);
  
  const distributionData = useMemo(() => {
    const ranges = [
      { name: '0-40%', min: 0, max: 40, count: 0 },
      { name: '40-60%', min: 40, max: 60, count: 0 },
      { name: '60-80%', min: 60, max: 80, count: 0 },
      { name: '80-100%', min: 80, max: 100, count: 0 }
    ];
    reports.forEach(r => {
      const range = ranges.find(rng => r.productivityPercent >= rng.min && r.productivityPercent < (rng.max === 100 ? 101 : rng.max));
      if (range) range.count++;
    });
    return ranges;
  }, [reports]);
  
  const dayOfWeekData = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayScores: { [key: number]: { total: number; count: number } } = {};
    reports.forEach(r => {
      const day = new Date(r.date).getDay();
      if (!dayScores[day]) dayScores[day] = { total: 0, count: 0 };
      dayScores[day].total += r.productivityPercent;
      dayScores[day].count += 1;
    });
    return dayNames.map((name, idx) => ({
      name,
      avg: dayScores[idx] ? Math.round(dayScores[idx].total / dayScores[idx].count) : 0
    }));
  }, [reports]);
  
  const weeklyData = useMemo(() => {
    const weeks = Math.min(8, Math.floor(reports.length / 7));
    if (weeks === 0) return [];
    return Array.from({ length: weeks }, (_, i) => {
      const weekReports = reports.slice(i * 7, (i + 1) * 7);
      const avg = weekReports.reduce((sum, r) => sum + r.productivityPercent, 0) / weekReports.length;
      return {
        week: i === 0 ? 'This Week' : i === 1 ? 'Last Week' : `${i}W Ago`,
        average: Math.round(avg)
      };
    });
  }, [reports]);
  
  const taskData = useMemo(() => {
    const allTaskTitles = new Set<string>();
    reports.forEach(r => r.tasks.forEach(t => allTaskTitles.add(t.title)));
    
    return Array.from(allTaskTitles).map(taskTitle => {
      const range = parseInt(chartRange);
      const taskPerformance = reports.slice(0, range).reverse().map(r => {
        const task = r.tasks.find(t => t.title === taskTitle);
        return {
          date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          completion: task ? task.completionPercent : 0,
          weight: task ? task.weight : 0
        };
      });
      
      const validCompletions = taskPerformance.filter(d => d.completion > 0);
      const avgCompletion = validCompletions.length > 0 ? validCompletions.reduce((sum, d) => sum + d.completion, 0) / validCompletions.length : 0;
      
      return { taskTitle, taskPerformance, avgCompletion, occurrences: validCompletions.length };
    }).sort((a, b) => b.avgCompletion - a.avgCompletion);
  }, [reports, chartRange]);
  
  const goalProgress = useMemo(() => {
    return goals.map(goal => {
      const relevantReports = reports.filter(r => r.date >= goal.startDate && r.date <= goal.endDate);
      const avgProgress = relevantReports.length > 0 ? relevantReports.reduce((sum, r) => sum + r.productivityPercent, 0) / relevantReports.length : 0;
      const daysLeft = Math.ceil((new Date(goal.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return { ...goal, avgProgress, daysLeft, isActive: daysLeft >= 0 };
    });
  }, [goals, reports]);
  
  const toggleTaskVisibility = useCallback((taskTitle: string) => {
    setHiddenTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskTitle)) {
        newSet.delete(taskTitle);
      } else {
        newSet.add(taskTitle);
      }
      return newSet;
    });
  }, []);
  
  const showAllTasks = useCallback(() => setHiddenTasks(new Set()), []);
  const hideAllTasks = useCallback(() => setHiddenTasks(new Set(taskData.map(t => t.taskTitle))), [taskData]);
  
  const exportAllStatsPDF = useCallback(async () => {
    try {
      toast.loading("Generating PDF...");
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF() as any;
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFillColor(139, 92, 246);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('Glow Analytics Report', pageWidth / 2, 18, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      
      const summaryData = [
        ['All-time Average', `${Math.round(stats.avgProductivity)}%`],
        ['7-day Average', `${Math.round(stats.avg7Days)}%`],
        ['Weekly Change', `${stats.weeklyChange >= 0 ? '+' : ''}${Math.round(stats.weeklyChange)}%`],
        ['Current Streak', `${stats.currentStreak} days`],
        ['Total Days Tracked', `${stats.totalDays} days`],
      ];
      
      if (stats.bestDay) {
        summaryData.push(['Best Day', `${formatDisplayDate(new Date(stats.bestDay.date))} - ${Math.round(stats.bestDay.productivityPercent)}%`]);
      }
      
      autoTable(doc, {
        startY: 45,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 246] },
      });
      
      if (weeklyData.length > 0) {
        const finalY = doc.lastAutoTable.finalY || 80;
        doc.setFontSize(14);
        doc.text('Weekly Averages', 14, finalY + 12);
        autoTable(doc, {
          startY: finalY + 16,
          head: [['Week', 'Average Productivity']],
          body: weeklyData.map(w => [w.week, `${w.average}%`]),
          theme: 'striped',
          headStyles: { fillColor: [139, 92, 246] },
        });
      }
      
      if (taskData.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Task Performance', 14, 20);
        autoTable(doc, {
          startY: 25,
          head: [['Task', 'Avg Completion', 'Occurrences']],
          body: taskData.map(t => [
            t.taskTitle.length > 30 ? t.taskTitle.substring(0, 30) + '...' : t.taskTitle,
            `${Math.round(t.avgCompletion)}%`,
            t.occurrences.toString()
          ]),
          theme: 'striped',
          headStyles: { fillColor: [139, 92, 246] },
        });
      }
      
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Glow v2.5 | Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
      }
      
      doc.save(`glow-analytics-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.dismiss();
      toast.success("Analytics exported as PDF!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to export PDF");
    }
  }, [stats, weeklyData, taskData]);
  
  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </MobileLayout>
    );
  }
  
  return (
    <MobileLayout>
      <div className="w-full max-w-lg mx-auto px-4 py-3 space-y-3">
        <PageHeader
          title="Stats"
          subtitle="Track your progress"
          icon={BarChart3}
          actions={
            <Button variant="default" size="sm" onClick={exportAllStatsPDF}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          }
        />
        
        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>
            <div className="text-xl font-bold">{Math.round(stats.avgProductivity)}%</div>
            <div className="text-xs text-muted-foreground">All-time Average</div>
          </Card>
          
          <Card className="p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-accent" />
              </div>
              {stats.weeklyChange !== 0 && (
                <span className={`text-xs font-medium flex items-center ${stats.weeklyChange > 0 ? 'text-success' : 'text-destructive'}`}>
                  {stats.weeklyChange > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {Math.abs(Math.round(stats.weeklyChange))}%
                </span>
              )}
            </div>
            <div className="text-xl font-bold">{Math.round(stats.avg7Days)}%</div>
            <div className="text-xs text-muted-foreground">7-day Average</div>
          </Card>
          
          <Card className="p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-7 w-7 rounded-lg bg-success/10 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-success" />
              </div>
            </div>
            <div className="text-xl font-bold">{stats.currentStreak}</div>
            <div className="text-xs text-muted-foreground">Current Streak</div>
          </Card>
          
          <Card className="p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-7 w-7 rounded-lg bg-warning/10 flex items-center justify-center">
                <Flame className="h-3.5 w-3.5 text-warning" />
              </div>
            </div>
            <div className="text-xl font-bold">{stats.longestStreak}</div>
            <div className="text-xs text-muted-foreground">Longest Streak</div>
          </Card>
          
          <Card className="p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-7 w-7 rounded-lg bg-info/10 flex items-center justify-center">
                <CalendarIcon className="h-3.5 w-3.5 text-info" />
              </div>
            </div>
            <div className="text-xl font-bold">{stats.totalDays}</div>
            <div className="text-xs text-muted-foreground">Total Days</div>
          </Card>
          
          <Card className="p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trophy className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>
            <div className="text-xl font-bold">{stats.bestWeekAvg > 0 ? `${Math.round(stats.bestWeekAvg)}%` : '-'}</div>
            <div className="text-xs text-muted-foreground">Best Week Avg</div>
          </Card>
        </div>
        
        {/* Goal Progress */}
        {goalProgress.filter(g => g.isActive).length > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Active Goals</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/goals')}>View All</Button>
            </div>
            <div className="space-y-4">
              {goalProgress.filter(g => g.isActive).slice(0, 3).map((goal) => {
                const progressPercent = Math.min(100, (goal.avgProgress / goal.targetPercentage) * 100);
                const isAchieved = goal.avgProgress >= goal.targetPercentage;
                return (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium capitalize">{goal.goalType} Goal</span>
                      <span className={isAchieved ? 'text-success font-bold' : ''}>
                        {Math.round(goal.avgProgress)}% / {goal.targetPercentage}%
                      </span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{goal.daysLeft} days left</span>
                      {isAchieved && <span className="text-success">✓ On track!</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
        
        {/* Charts Section */}
        <Card className="p-4" ref={chartsRef}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Productivity Analysis</h3>
            <div className="flex gap-2">
              <Select value={chartRange} onValueChange={(v) => setChartRange(v as any)}>
                <SelectTrigger className="w-20 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Tabs value={chartView} onValueChange={(v) => setChartView(v as any)} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="trend" className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                Trend
              </TabsTrigger>
              <TabsTrigger value="distribution" className="text-xs">
                <PieChart className="h-3 w-3 mr-1" />
                Distribution
              </TabsTrigger>
              <TabsTrigger value="comparison" className="text-xs">
                <BarChart3 className="h-3 w-3 mr-1" />
                By Day
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="trend">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorProductivity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(270, 60%, 45%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(270, 60%, 45%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" fontSize={9} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
                    <YAxis fontSize={9} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="productivity" stroke="hsl(270, 60%, 45%)" strokeWidth={2} fill="url(#colorProductivity)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>
              )}
            </TabsContent>
            
            <TabsContent value="distribution">
              {distributionData.some(d => d.count > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <RechartsPie>
                    <Pie data={distributionData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {distributionData.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>
              )}
            </TabsContent>
            
            <TabsContent value="comparison">
              {dayOfWeekData.some(d => d.avg > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dayOfWeekData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={9} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="avg" fill="hsl(45, 95%, 55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
        
        {/* Weekly Averages */}
        {weeklyData.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Weekly Comparison</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" fontSize={9} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                <YAxis dataKey="week" type="category" fontSize={10} stroke="hsl(var(--muted-foreground))" width={70} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="average" fill="hsl(270, 60%, 45%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
        
        {/* Best & Worst Days */}
        {stats.bestDay && stats.worstDay && (
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUp className="h-4 w-4 text-success" />
                <span className="text-xs text-muted-foreground">Best Day</span>
              </div>
              <div className="text-xl font-bold text-success">{Math.round(stats.bestDay.productivityPercent)}%</div>
              <div className="text-xs text-muted-foreground">{formatDisplayDate(new Date(stats.bestDay.date))}</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDown className="h-4 w-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Lowest Day</span>
              </div>
              <div className="text-xl font-bold text-destructive">{Math.round(stats.worstDay.productivityPercent)}%</div>
              <div className="text-xs text-muted-foreground">{formatDisplayDate(new Date(stats.worstDay.date))}</div>
            </Card>
          </div>
        )}
        
        {/* Task Performance */}
        {taskData.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Task Performance</h3>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={showAllTasks}>
                  <Eye className="h-3 w-3 mr-1" />
                  All
                </Button>
                <Button variant="ghost" size="sm" onClick={hideAllTasks}>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Hide
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              {taskData.slice(0, 8).map(({ taskTitle, taskPerformance, avgCompletion }) => {
                const isHidden = hiddenTasks.has(taskTitle);
                return (
                  <div key={taskTitle}>
                    <button onClick={() => toggleTaskVisibility(taskTitle)} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-accent/5 transition-colors">
                      <span className={`text-sm font-medium truncate flex-1 text-left ${isHidden ? 'text-muted-foreground' : ''}`}>{taskTitle}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Avg: {Math.round(avgCompletion)}%</span>
                        {isHidden ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-primary" />}
                      </div>
                    </button>
                    {!isHidden && (
                      <ResponsiveContainer width="100%" height={100}>
                        <LineChart data={taskPerformance}>
                          <XAxis dataKey="date" fontSize={8} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
                          <YAxis fontSize={8} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                          <Line type="monotone" dataKey="completion" stroke="hsl(270, 60%, 45%)" strokeWidth={2} dot={{ fill: 'hsl(270, 60%, 45%)', r: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
        
        {/* Daily Progress List */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Recent Days</h3>
          <div className="space-y-2">
            {reports.slice(0, 10).map((report) => (
              <div key={report.date} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                <div>
                  <div className="font-medium text-sm">{formatDisplayDate(new Date(report.date))}</div>
                  <div className="text-xs text-muted-foreground">{report.tasks.length} tasks</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-lg font-bold ${report.productivityPercent >= 80 ? 'text-success' : report.productivityPercent >= 60 ? 'text-warning' : 'text-destructive'}`}>
                    {Math.round(report.productivityPercent)}%
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/day/${report.date}`)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </MobileLayout>
  );
};

export default Analytics;
