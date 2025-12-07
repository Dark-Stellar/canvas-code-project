import { useEffect, useState, useMemo, useRef } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllDailyReports } from "@/lib/storage";
import { Brain, TrendingUp, Calendar, Award, Target, Sparkles, Lightbulb, BarChart3, RefreshCw, FileText, Image, Zap, BookOpen } from "lucide-react";
import type { DailyReport } from "@/types";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportInsightsPDF, exportElementAsPNG } from "@/lib/exportUtils";

const Insights = () => {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [weeklyReview, setWeeklyReview] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [activeAIType, setActiveAIType] = useState<string>("");
  const insightsRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    loadInsights();
  }, []);
  
  async function loadInsights() {
    const allReports = await getAllDailyReports();
    setReports(allReports.sort((a, b) => b.date.localeCompare(a.date)));
    setLoading(false);
  }
  
  // Calculate insights
  const bestDayOfWeek = useMemo(() => {
    const dayScores: { [key: number]: { total: number; count: number } } = {};
    reports.forEach(r => {
      const day = new Date(r.date).getDay();
      if (!dayScores[day]) dayScores[day] = { total: 0, count: 0 };
      dayScores[day].total += r.productivityPercent;
      dayScores[day].count += 1;
    });
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let bestDay = { day: 0, avg: 0 };
    Object.entries(dayScores).forEach(([day, scores]) => {
      const avg = scores.total / scores.count;
      if (avg > bestDay.avg) {
        bestDay = { day: parseInt(day), avg };
      }
    });
    
    return { name: dayNames[bestDay.day], avg: bestDay.avg, dayScores, dayNames };
  }, [reports]);
  
  // Best performing tasks
  const topTasks = useMemo(() => {
    const taskStats: { [key: string]: { total: number; count: number; category?: string } } = {};
    reports.forEach(r => {
      r.tasks.forEach(t => {
        if (!taskStats[t.title]) taskStats[t.title] = { total: 0, count: 0, category: t.category };
        taskStats[t.title].total += t.completionPercent;
        taskStats[t.title].count += 1;
      });
    });
    
    return Object.entries(taskStats)
      .map(([title, stats]) => ({
        title,
        avg: stats.total / stats.count,
        count: stats.count,
        category: stats.category
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);
  }, [reports]);
  
  // Consistency score
  const consistencyScore = useMemo(() => {
    if (reports.length === 0) return 0;
    const oldestDate = new Date(reports[reports.length - 1].date);
    const today = new Date();
    const daysSinceStart = Math.floor((today.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.min(100, Math.round((reports.length / daysSinceStart) * 100));
  }, [reports]);
  
  // Improvement trend
  const improvementTrend = useMemo(() => {
    if (reports.length < 14) return null;
    const firstWeek = reports.slice(-7).reduce((sum, r) => sum + r.productivityPercent, 0) / 7;
    const lastWeek = reports.slice(0, 7).reduce((sum, r) => sum + r.productivityPercent, 0) / 7;
    const change = lastWeek - firstWeek;
    return { change, improving: change > 0 };
  }, [reports]);
  
  // Weekly summary
  const weeklySummary = useMemo(() => {
    const last7 = reports.slice(0, 7);
    if (last7.length === 0) return null;
    
    const avgProductivity = last7.reduce((sum, r) => sum + r.productivityPercent, 0) / last7.length;
    const bestDay = last7.reduce((best, r) => r.productivityPercent > best.productivityPercent ? r : best, last7[0]);
    const totalTasks = last7.reduce((sum, r) => sum + r.tasks.length, 0);
    const completedTasks = last7.reduce((sum, r) => sum + r.tasks.filter(t => t.completionPercent >= 80).length, 0);
    
    return { avgProductivity, bestDay, totalTasks, completedTasks, daysTracked: last7.length };
  }, [reports]);
  
  // Monthly summary
  const monthlySummary = useMemo(() => {
    const last30 = reports.slice(0, 30);
    if (last30.length === 0) return null;
    
    const avgProductivity = last30.reduce((sum, r) => sum + r.productivityPercent, 0) / last30.length;
    const bestDay = last30.reduce((best, r) => r.productivityPercent > best.productivityPercent ? r : best, last30[0]);
    const totalTasks = last30.reduce((sum, r) => sum + r.tasks.length, 0);
    const completedTasks = last30.reduce((sum, r) => sum + r.tasks.filter(t => t.completionPercent >= 80).length, 0);
    
    // Weekly breakdown
    const weeks: number[] = [];
    for (let i = 0; i < Math.min(4, Math.ceil(last30.length / 7)); i++) {
      const weekReports = last30.slice(i * 7, (i + 1) * 7);
      if (weekReports.length > 0) {
        weeks.push(weekReports.reduce((sum, r) => sum + r.productivityPercent, 0) / weekReports.length);
      }
    }
    
    return { avgProductivity, bestDay, totalTasks, completedTasks, daysTracked: last30.length, weeks };
  }, [reports]);
  
  // Best performing days analysis
  const bestPerformingDays = useMemo(() => {
    const { dayScores, dayNames } = bestDayOfWeek;
    
    return dayNames.map((name, idx) => ({
      name,
      shortName: name.substring(0, 3),
      avg: dayScores[idx] ? dayScores[idx].total / dayScores[idx].count : 0,
      count: dayScores[idx]?.count || 0
    })).sort((a, b) => b.avg - a.avg);
  }, [bestDayOfWeek]);
  
  // Generate AI suggestions with different types
  const generateAISuggestions = async (type: string = "suggestions") => {
    if (reports.length < 3) {
      toast.error("Need at least 3 days of data for AI suggestions");
      return;
    }
    
    setLoadingAI(true);
    setActiveAIType(type);
    
    try {
      const recentData = reports.slice(0, 14).map(r => ({
        date: r.date,
        productivity: Math.round(r.productivityPercent),
        tasks: r.tasks.map(t => ({ title: t.title, completion: t.completionPercent, category: t.category }))
      }));
      
      const { data, error } = await supabase.functions.invoke('ai-insights', {
        body: { reports: recentData, type }
      });
      
      if (error) throw error;
      
      if (type === "weekly-review" && data?.grade) {
        setWeeklyReview(data);
        toast.success("Weekly review generated!");
      } else if (type === "deep-analysis" && data?.analysis) {
        setAiAnalysis(data.analysis);
        if (data.recommendations) {
          setAiSuggestions(data.recommendations);
        }
        toast.success("Deep analysis complete!");
      } else if (data?.suggestions) {
        setAiSuggestions(data.suggestions);
        toast.success("AI insights generated!");
      }
    } catch (error) {
      console.error('AI suggestions error:', error);
      const suggestions = generateRuleBasedSuggestions();
      setAiSuggestions(suggestions);
      toast.info("Generated local insights");
    } finally {
      setLoadingAI(false);
      setActiveAIType("");
    }
  };
  
  // Rule-based fallback suggestions
  const generateRuleBasedSuggestions = () => {
    const suggestions: string[] = [];
    
    if (consistencyScore < 60) {
      suggestions.push("Try to track your productivity daily for more accurate insights and better habit formation.");
    }
    
    if (improvementTrend && !improvementTrend.improving) {
      suggestions.push("Your productivity has dipped recently. Consider reviewing your task priorities or taking breaks to recharge.");
    }
    
    const worstDay = bestPerformingDays[bestPerformingDays.length - 1];
    if (worstDay && worstDay.avg < 50 && worstDay.count > 2) {
      suggestions.push(`${worstDay.name}s tend to be your least productive days. Consider scheduling lighter tasks or using them for planning.`);
    }
    
    if (suggestions.length === 0) {
      suggestions.push("Great job! Keep maintaining your current productivity habits.");
      suggestions.push(`Your best day is ${bestDayOfWeek.name} - schedule important tasks then for maximum output.`);
    }
    
    return suggestions;
  };

  const handleExportPDF = async () => {
    try {
      toast.loading("Generating PDF...");
      await exportInsightsPDF(
        weeklySummary,
        monthlySummary,
        bestPerformingDays,
        topTasks,
        aiSuggestions,
        consistencyScore
      );
      toast.dismiss();
      toast.success("Insights exported as PDF!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to export PDF");
    }
  };

  const handleExportPNG = async () => {
    if (!insightsRef.current) return;
    try {
      toast.loading("Generating image...");
      await exportElementAsPNG(insightsRef.current, "glow-insights");
      toast.dismiss();
      toast.success("Insights exported as PNG!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to export image");
    }
  };
  
  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Analyzing your data...</div>
        </div>
      </MobileLayout>
    );
  }
  
  return (
    <MobileLayout>
      <div className="container max-w-2xl mx-auto p-4 space-y-4" ref={insightsRef}>
        <div className="pt-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Insights</h1>
            </div>
            <p className="text-sm text-muted-foreground">Discover your patterns</p>
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
        
        {reports.length < 7 && (
          <Card className="p-4 bg-accent/5">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-accent mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Keep Going!</h3>
                <p className="text-xs text-muted-foreground">
                  Track at least 7 days to unlock deeper insights and patterns about your productivity.
                </p>
              </div>
            </div>
          </Card>
        )}
        
        {/* AI Suggestions - Enhanced */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-accent" />
              <h3 className="font-semibold">AI-Powered Insights</h3>
            </div>
          </div>
          
          {/* AI Action Buttons */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => generateAISuggestions("suggestions")}
              disabled={loadingAI}
              className="flex flex-col h-auto py-2"
            >
              {loadingAI && activeAIType === "suggestions" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mb-1" />
                  <span className="text-xs">Quick Tips</span>
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => generateAISuggestions("deep-analysis")}
              disabled={loadingAI}
              className="flex flex-col h-auto py-2"
            >
              {loadingAI && activeAIType === "deep-analysis" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Zap className="h-4 w-4 mb-1" />
                  <span className="text-xs">Deep Analysis</span>
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => generateAISuggestions("weekly-review")}
              disabled={loadingAI}
              className="flex flex-col h-auto py-2"
            >
              {loadingAI && activeAIType === "weekly-review" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <BookOpen className="h-4 w-4 mb-1" />
                  <span className="text-xs">Weekly Review</span>
                </>
              )}
            </Button>
          </div>

          {/* Weekly Review Display */}
          {weeklyReview && (
            <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{weeklyReview.grade}</span>
                </div>
                <div>
                  <div className="font-semibold text-sm">Weekly Grade</div>
                  <div className="text-xs text-muted-foreground">Based on your performance</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {weeklyReview.achievement && (
                  <div className="flex gap-2">
                    <Award className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                    <span>{weeklyReview.achievement}</span>
                  </div>
                )}
                {weeklyReview.improvement && (
                  <div className="flex gap-2">
                    <Target className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                    <span>{weeklyReview.improvement}</span>
                  </div>
                )}
                {weeklyReview.actionItem && (
                  <div className="flex gap-2">
                    <Zap className="h-4 w-4 text-info flex-shrink-0 mt-0.5" />
                    <span>{weeklyReview.actionItem}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Analysis Display */}
          {aiAnalysis && (
            <div className="mb-4 p-3 bg-accent/5 rounded-lg">
              <p className="text-sm">{aiAnalysis}</p>
            </div>
          )}

          {/* Suggestions List */}
          {aiSuggestions.length > 0 ? (
            <div className="space-y-3">
              {aiSuggestions.map((suggestion, idx) => (
                <div key={idx} className="flex gap-3 p-3 bg-accent/5 rounded-lg">
                  <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-accent">
                    {idx + 1}
                  </div>
                  <p className="text-sm">{suggestion}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Click one of the buttons above to get personalized productivity insights.
            </p>
          )}
        </Card>
        
        {/* Weekly Summary */}
        {weeklySummary && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-5 w-5 text-info" />
              <h3 className="font-semibold">This Week's Summary</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold">{Math.round(weeklySummary.avgProductivity)}%</div>
                <div className="text-xs text-muted-foreground">Avg Productivity</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{weeklySummary.daysTracked}</div>
                <div className="text-xs text-muted-foreground">Days Tracked</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{weeklySummary.completedTasks}</div>
                <div className="text-xs text-muted-foreground">Tasks Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-success">
                  {Math.round(weeklySummary.bestDay.productivityPercent)}%
                </div>
                <div className="text-xs text-muted-foreground">Best Day</div>
              </div>
            </div>
          </Card>
        )}
        
        {/* Monthly Summary */}
        {monthlySummary && monthlySummary.daysTracked > 7 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Monthly Overview</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold">{Math.round(monthlySummary.avgProductivity)}%</div>
                  <div className="text-xs text-muted-foreground">Avg Productivity</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{monthlySummary.daysTracked}</div>
                  <div className="text-xs text-muted-foreground">Days Tracked</div>
                </div>
              </div>
              {monthlySummary.weeks.length > 1 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Weekly Breakdown</div>
                  <div className="flex gap-2">
                    {monthlySummary.weeks.map((avg, idx) => (
                      <div key={idx} className="flex-1 text-center">
                        <div className="h-16 bg-muted rounded-t relative overflow-hidden">
                          <div 
                            className="absolute bottom-0 left-0 right-0 bg-primary transition-all"
                            style={{ height: `${avg}%` }}
                          />
                        </div>
                        <div className="text-xs mt-1">W{idx + 1}</div>
                        <div className="text-xs font-bold">{Math.round(avg)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
        
        {/* Best Performing Days Analysis */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Best Performing Days</h3>
          </div>
          <div className="space-y-3">
            {bestPerformingDays.filter(d => d.count > 0).map((day, idx) => (
              <div key={day.name} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  idx === 0 ? 'bg-success/20 text-success' : 
                  idx === bestPerformingDays.filter(d => d.count > 0).length - 1 ? 'bg-destructive/20 text-destructive' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{day.name}</span>
                    <span className="text-sm font-bold">{Math.round(day.avg)}%</span>
                  </div>
                  <Progress value={day.avg} className="h-1.5 mt-1" />
                </div>
                <span className="text-xs text-muted-foreground">{day.count}x</span>
              </div>
            ))}
          </div>
        </Card>
        
        {/* Top Performing Tasks */}
        {topTasks.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-5 w-5 text-accent" />
              <h3 className="font-semibold">Top Performing Tasks</h3>
            </div>
            <div className="space-y-3">
              {topTasks.map((task, idx) => (
                <div key={task.title} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === 0 ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{task.title}</span>
                      <span className="text-sm font-bold">{Math.round(task.avg)}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{task.category || 'Other'}</span>
                      <span>•</span>
                      <span>{task.count}x</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
        
        {/* Consistency */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-success" />
            <h3 className="font-semibold">Consistency Score</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">How often you track</span>
              <span className="font-bold">{consistencyScore}%</span>
            </div>
            <Progress value={consistencyScore} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {consistencyScore >= 80 ? "Excellent! You're very consistent." :
               consistencyScore >= 60 ? "Good consistency. Keep it up!" :
               consistencyScore >= 40 ? "Try to track more regularly for better insights." :
               "Track daily to build better habits!"}
            </p>
          </div>
        </Card>
        
        {/* Improvement Trend */}
        {improvementTrend && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className={`h-5 w-5 ${improvementTrend.improving ? 'text-success' : 'text-warning'}`} />
              <h3 className="font-semibold">Improvement Trend</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className={`text-2xl font-bold ${improvementTrend.improving ? 'text-success' : 'text-warning'}`}>
                {improvementTrend.improving ? '+' : ''}{Math.round(improvementTrend.change)}%
              </div>
              <div className="text-sm text-muted-foreground">
                {improvementTrend.improving ? 'improvement' : 'change'} from first week
              </div>
            </div>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
};

export default Insights;
