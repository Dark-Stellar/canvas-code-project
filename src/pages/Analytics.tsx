import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/MobileLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllDailyReports } from "@/lib/storage";
import { TrendingUp, Calendar as CalendarIcon, Target, Zap, Edit } from "lucide-react";
import type { DailyReport } from "@/types";
import { formatDisplayDate } from "@/lib/dates";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Analytics = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenTasks, setHiddenTasks] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    loadAnalytics();
  }, []);
  
  async function loadAnalytics() {
    const allReports = await getAllDailyReports();
    setReports(allReports.sort((a, b) => b.date.localeCompare(a.date)));
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
  
  // Calculate stats
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
  
  return (
    <MobileLayout>
      <div className="container max-w-2xl mx-auto p-4 space-y-4">
        <div className="pt-4">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Track your progress</p>
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
        
        {/* Productivity Trend Chart */}
        {reports.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Productivity Trend (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={reports.slice(0, 30).reverse().map(r => ({
                date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                productivity: Math.round(r.productivityPercent)
              }))}>
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
        {reports.length >= 7 && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Weekly Averages</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={Array.from({ length: Math.min(4, Math.floor(reports.length / 7)) }, (_, i) => {
                const weekReports = reports.slice(i * 7, (i + 1) * 7);
                const avg = weekReports.reduce((sum, r) => sum + r.productivityPercent, 0) / weekReports.length;
                const weekNum = Math.min(4, Math.floor(reports.length / 7)) - i;
                return {
                  week: i === 0 ? 'This Week' : `${weekNum} Week${weekNum > 1 ? 's' : ''} Ago`,
                  average: Math.round(avg)
                };
              })}>
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
        
        {/* Task Performance Over Time */}
        {reports.length > 0 && (() => {
          const allTaskTitles = new Set<string>();
          reports.forEach(r => r.tasks.forEach(t => allTaskTitles.add(t.title)));
          
          const taskData = Array.from(allTaskTitles).map(taskTitle => {
            const taskPerformance = reports.slice(0, 30).reverse().map(r => {
              const task = r.tasks.find(t => t.title === taskTitle);
              return {
                date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                completion: task ? task.completionPercent : 0,
                weight: task ? task.weight : 0
              };
            });
            
            const avgCompletion = taskPerformance.reduce((sum, d) => sum + d.completion, 0) / taskPerformance.filter(d => d.completion > 0).length || 0;
            
            return { taskTitle, taskPerformance, avgCompletion };
          }).sort((a, b) => b.avgCompletion - a.avgCompletion);
          
          const toggleTaskVisibility = (taskTitle: string) => {
            setHiddenTasks(prev => {
              const newSet = new Set(prev);
              if (newSet.has(taskTitle)) {
                newSet.delete(taskTitle);
              } else {
                newSet.add(taskTitle);
              }
              return newSet;
            });
          };
          
          return (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Task Performance (Last 30 Days)</h3>
              <p className="text-xs text-muted-foreground mb-4">Click on any task to hide/show its chart</p>
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
                          <span className="text-xs text-muted-foreground">
                            {isHidden ? '(Hidden)' : '(Visible)'}
                          </span>
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
          );
        })()}
        
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
