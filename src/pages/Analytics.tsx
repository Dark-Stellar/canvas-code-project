import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/MobileLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllDailyReports } from "@/lib/storage";
import { TrendingUp, Calendar as CalendarIcon, Target, Zap, Edit, Eye, EyeOff, Download, Image } from "lucide-react";
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
          <Button variant="outline" size="sm" onClick={exportCharts}>
            <Image className="h-4 w-4 mr-2" />
            Export
          </Button>
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
                              fontSize: '12px'
                            }}
                            formatter={(value: number, name: string) => {
                              if (name === 'completion') return [`${value}%`, 'Completion'];
                              if (name === 'weight') return [`${value}%`, 'Weight'];
                              return [value, name];
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="completion" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--primary))', r: 3 }}
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
        
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Daily Progress (Editable)</h3>
          <div className="space-y-3">
            {reports.slice(0, 30).map((report) => (
              <div key={report.id} className="flex items-center justify-between group">
                <div className="text-sm">
                  {formatDisplayDate(new Date(report.date))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium">
                    {Math.round(report.productivityPercent)}%
                  </div>
                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${report.productivityPercent}%` }}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => navigate(`/day/${report.date}`)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          {reports.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No data yet. Start tracking your productivity!
            </p>
          )}
        </Card>
      </div>
    </MobileLayout>
  );
};

export default Analytics;
