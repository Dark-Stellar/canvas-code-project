import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/MobileLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllDailyReports } from "@/lib/storage";
import { TrendingUp, Calendar as CalendarIcon, Target, Zap, Edit, Eye, EyeOff, Download, Image, FileText } from "lucide-react";
import type { DailyReport, ProductivityGoal } from "@/types";
import { formatDisplayDate } from "@/lib/dates";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import html2canvas from "html2canvas";

const HIDDEN_TASKS_KEY = 'glow_hidden_tasks';

const Analytics = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [goals, setGoals] = useState<ProductivityGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenTasks, setHiddenTasks] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(HIDDEN_TASKS_KEY);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const chartsRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    loadAnalytics();
    loadGoals();
  }, []);
  
  // Persist hidden tasks to localStorage
  useEffect(() => {
    localStorage.setItem(HIDDEN_TASKS_KEY, JSON.stringify([...hiddenTasks]));
  }, [hiddenTasks]);
  
  async function loadAnalytics() {
    const allReports = await getAllDailyReports();
    setReports(allReports.sort((a, b) => b.date.localeCompare(a.date)));
    setLoading(false);
  }
  
  async function loadGoals() {
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
  }
  
  // Memoize expensive calculations
  const stats = useMemo(() => {
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
    
    return { totalDays, avgProductivity, avg7Days, bestDay, currentStreak };
  }, [reports]);
  
  // Memoize chart data
  const trendData = useMemo(() => {
    return reports.slice(0, 30).reverse().map(r => ({
      date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      productivity: Math.round(r.productivityPercent)
    }));
  }, [reports]);
  
  // Fixed Weekly Averages - correct order
  const weeklyData = useMemo(() => {
    const weeks = Math.min(4, Math.floor(reports.length / 7));
    if (weeks === 0) return [];
    
    return Array.from({ length: weeks }, (_, i) => {
      const weekReports = reports.slice(i * 7, (i + 1) * 7);
      const avg = weekReports.reduce((sum, r) => sum + r.productivityPercent, 0) / weekReports.length;
      return {
        week: i === 0 ? 'This Week' : i === 1 ? '1 Week Ago' : `${i} Weeks Ago`,
        average: Math.round(avg)
      };
    });
  }, [reports]);
  
  // Memoize task data
  const taskData = useMemo(() => {
    const allTaskTitles = new Set<string>();
    reports.forEach(r => r.tasks.forEach(t => allTaskTitles.add(t.title)));
    
    return Array.from(allTaskTitles).map(taskTitle => {
      const taskPerformance = reports.slice(0, 30).reverse().map(r => {
        const task = r.tasks.find(t => t.title === taskTitle);
        return {
          date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          completion: task ? task.completionPercent : 0,
          weight: task ? task.weight : 0
        };
      });
      
      const validCompletions = taskPerformance.filter(d => d.completion > 0);
      const avgCompletion = validCompletions.length > 0 
        ? validCompletions.reduce((sum, d) => sum + d.completion, 0) / validCompletions.length 
        : 0;
      
      return { taskTitle, taskPerformance, avgCompletion };
    }).sort((a, b) => b.avgCompletion - a.avgCompletion);
  }, [reports]);
  
  // Calculate goal progress
  const goalProgress = useMemo(() => {
    return goals.map(goal => {
      const relevantReports = reports.filter(r => 
        r.date >= goal.startDate && r.date <= goal.endDate
      );
      const avgProgress = relevantReports.length > 0
        ? relevantReports.reduce((sum, r) => sum + r.productivityPercent, 0) / relevantReports.length
        : 0;
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
  
  const showAllTasks = useCallback(() => {
    setHiddenTasks(new Set());
  }, []);
  
  const hideAllTasks = useCallback(() => {
    setHiddenTasks(new Set(taskData.map(t => t.taskTitle)));
  }, [taskData]);
  
  const exportCharts = async () => {
    if (!chartsRef.current) return;
    
    try {
      toast.loading("Generating image...");
      const canvas = await html2canvas(chartsRef.current, {
        backgroundColor: null,
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `glow-analytics-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.dismiss();
      toast.success("Charts exported!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to export charts");
    }
  };

  const exportAllStatsPDF = async () => {
    try {
      toast.loading("Generating PDF...");
      
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Title
      doc.setFontSize(24);
      doc.setTextColor(139, 92, 246); // Primary purple
      doc.text('Glow Analytics Report', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' });
      
      // Summary Statistics
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text('Summary Statistics', 14, 45);
      
      const summaryData = [
        ['All-time Average', `${Math.round(stats.avgProductivity)}%`],
        ['7-day Average', `${Math.round(stats.avg7Days)}%`],
        ['Current Streak (60%+)', `${stats.currentStreak} days`],
        ['Total Days Tracked', `${stats.totalDays} days`],
      ];
      
      if (stats.bestDay) {
        summaryData.push(['Best Day', `${formatDisplayDate(new Date(stats.bestDay.date))} - ${Math.round(stats.bestDay.productivityPercent)}%`]);
      }
      
      autoTable(doc, {
        startY: 50,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 246] },
      });
      
      // Goals Progress
      const activeGoals = goalProgress.filter(g => g.isActive);
      if (activeGoals.length > 0) {
        const finalY = (doc as any).lastAutoTable.finalY || 80;
        doc.setFontSize(16);
        doc.text('Active Goals', 14, finalY + 15);
        
        const goalsData = activeGoals.map(g => [
          `${g.goalType.charAt(0).toUpperCase() + g.goalType.slice(1)} Goal`,
          `${Math.round(g.avgProgress)}%`,
          `${g.targetPercentage}%`,
          `${g.daysLeft} days`,
          g.avgProgress >= g.targetPercentage ? 'On Track' : 'Behind'
        ]);
        
        autoTable(doc, {
          startY: finalY + 20,
          head: [['Goal Type', 'Current', 'Target', 'Days Left', 'Status']],
          body: goalsData,
          theme: 'striped',
          headStyles: { fillColor: [139, 92, 246] },
        });
      }
      
      // Weekly Averages
      if (weeklyData.length > 0) {
        const finalY = (doc as any).lastAutoTable.finalY || 120;
        doc.setFontSize(16);
        doc.text('Weekly Averages', 14, finalY + 15);
        
        const weekData = weeklyData.map(w => [w.week, `${w.average}%`]);
        
        autoTable(doc, {
          startY: finalY + 20,
          head: [['Week', 'Average Productivity']],
          body: weekData,
          theme: 'striped',
          headStyles: { fillColor: [139, 92, 246] },
        });
      }
      
      // Task Performance
      if (taskData.length > 0) {
        doc.addPage();
        doc.setFontSize(16);
        doc.text('Task Performance', 14, 20);
        
        const taskTableData = taskData.map(t => [
          t.taskTitle.length > 30 ? t.taskTitle.substring(0, 30) + '...' : t.taskTitle,
          `${Math.round(t.avgCompletion)}%`
        ]);
        
        autoTable(doc, {
          startY: 25,
          head: [['Task', 'Avg Completion']],
          body: taskTableData,
          theme: 'striped',
          headStyles: { fillColor: [139, 92, 246] },
        });
      }
      
      // Daily Reports (last 30 days)
      if (reports.length > 0) {
        const finalY = (doc as any).lastAutoTable.finalY || 80;
        
        // Check if we need a new page
        if (finalY > 200) {
          doc.addPage();
          doc.setFontSize(16);
          doc.text('Daily Reports (Last 30 Days)', 14, 20);
        } else {
          doc.setFontSize(16);
          doc.text('Daily Reports (Last 30 Days)', 14, finalY + 15);
        }
        
        const dailyData = reports.slice(0, 30).map(r => [
          formatDisplayDate(new Date(r.date)),
          `${Math.round(r.productivityPercent)}%`,
          r.tasks.length.toString(),
          r.tasks.filter(t => t.completionPercent === 100).length.toString()
        ]);
        
        autoTable(doc, {
          startY: finalY > 200 ? 25 : finalY + 20,
          head: [['Date', 'Productivity', 'Total Tasks', 'Completed']],
          body: dailyData,
          theme: 'striped',
          headStyles: { fillColor: [139, 92, 246] },
        });
      }
      
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Glow - Measure. Grow. Glow. | Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
      
      doc.save(`glow-full-analytics-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.dismiss();
      toast.success("Full analytics PDF exported!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to export PDF");
      console.error("PDF export error:", error);
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
  
  const { totalDays, avgProductivity, avg7Days, bestDay, currentStreak } = stats;
  
  return (
    <MobileLayout>
      <div className="container max-w-2xl mx-auto p-4 space-y-4">
        <div className="pt-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-sm text-muted-foreground">Track your progress</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCharts}>
              <Image className="h-4 w-4 mr-2" />
              PNG
            </Button>
            <Button variant="default" size="sm" onClick={exportAllStatsPDF}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold">{Math.round(avgProductivity)}%</div>
            <div className="text-xs text-muted-foreground">All-time Average</div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-accent" />
              </div>
            </div>
            <div className="text-2xl font-bold">{Math.round(avg7Days)}%</div>
            <div className="text-xs text-muted-foreground">7-day Average</div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-success" />
              </div>
            </div>
            <div className="text-2xl font-bold">{currentStreak}</div>
            <div className="text-xs text-muted-foreground">Day Streak (60%+)</div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-full bg-info/10 flex items-center justify-center">
                <CalendarIcon className="h-4 w-4 text-info" />
              </div>
            </div>
            <div className="text-2xl font-bold">{totalDays}</div>
            <div className="text-xs text-muted-foreground">Total Days</div>
          </Card>
        </div>
        
        {/* Goal Progress Tracking */}
        {goalProgress.filter(g => g.isActive).length > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Active Goals Progress</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/goals')}>
                View All
              </Button>
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
        
        {bestDay && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Best Day</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">
                  {formatDisplayDate(new Date(bestDay.date))}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {bestDay.tasks.length} tasks completed
                </div>
              </div>
              <div className="text-3xl font-bold text-success">
                {Math.round(bestDay.productivityPercent)}%
              </div>
            </div>
          </Card>
        )}
        
        <div ref={chartsRef} className="space-y-4">
          {/* Productivity Trend Chart */}
          {reports.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Productivity Trend (Last 30 Days)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    fontSize={10}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    fontSize={10}
                    stroke="hsl(var(--muted-foreground))"
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="productivity" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}
          
          {/* Weekly Average Chart */}
          {weeklyData.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Weekly Averages</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="week" 
                    fontSize={12}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    fontSize={10}
                    stroke="hsl(var(--muted-foreground))"
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar 
                    dataKey="average" 
                    fill="hsl(var(--accent))" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
        
        {/* Task Performance Over Time */}
        {taskData.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Task Performance (Last 30 Days)</h3>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={showAllTasks}>
                  <Eye className="h-4 w-4 mr-1" />
                  All
                </Button>
                <Button variant="ghost" size="sm" onClick={hideAllTasks}>
                  <EyeOff className="h-4 w-4 mr-1" />
                  Hide
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Click on any task to hide/show its chart (persists until changed)</p>
            <div className="space-y-6">
              {taskData.map(({ taskTitle, taskPerformance, avgCompletion }) => {
                const isHidden = hiddenTasks.has(taskTitle);
                return (
                  <div key={taskTitle}>
                    <button
                      onClick={() => toggleTaskVisibility(taskTitle)}
                      className="w-full flex items-center justify-between mb-2 p-2 rounded-lg hover:bg-accent/5 transition-colors"
                    >
                      <span className={`text-sm font-medium truncate flex-1 text-left ${isHidden ? 'text-muted-foreground' : ''}`}>
                        {taskTitle}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Avg: {Math.round(avgCompletion)}%
                        </span>
                        {isHidden ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </button>
                    {!isHidden && (
                      <ResponsiveContainer width="100%" height={120}>
                        <LineChart data={taskPerformance}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="date" 
                            fontSize={8}
                            stroke="hsl(var(--muted-foreground))"
                            interval="preserveStartEnd"
                          />
                          <YAxis 
                            fontSize={8}
                            stroke="hsl(var(--muted-foreground))"
                            domain={[0, 100]}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => [`${value}%`, 'Completion']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="completion" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--primary))', r: 2 }}
                          />
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
          <h3 className="font-semibold mb-3">Daily Progress</h3>
          <div className="space-y-2">
            {reports.slice(0, 10).map((report) => (
              <div 
                key={report.date}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div>
                  <div className="font-medium text-sm">
                    {formatDisplayDate(new Date(report.date))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {report.tasks.length} tasks
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-lg font-bold ${
                    report.productivityPercent >= 80 ? 'text-success' :
                    report.productivityPercent >= 60 ? 'text-warning' :
                    'text-destructive'
                  }`}>
                    {Math.round(report.productivityPercent)}%
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/day/${report.date}`)}
                  >
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
