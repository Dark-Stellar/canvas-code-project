import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAllDailyReports } from "@/lib/storage";
import { Brain, TrendingUp, Calendar, Award, Target, Sparkles, Lightbulb, BarChart3, RefreshCw, FileText, Zap, BookOpen, MessageCircle, Send, X, ArrowUp, ArrowDown } from "lucide-react";
import type { DailyReport } from "@/types";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportInsightsPDF } from "@/lib/exportUtils";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const Insights = () => {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [weeklyReview, setWeeklyReview] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [activeAIType, setActiveAIType] = useState<string>("");
  const insightsRef = useRef<HTMLDivElement>(null);
  
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    loadInsights();
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);
  
  const loadInsights = useCallback(async () => {
    const allReports = await getAllDailyReports();
    setReports(allReports.sort((a, b) => b.date.localeCompare(a.date)));
    setLoading(false);
  }, []);
  
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
  
  const consistencyScore = useMemo(() => {
    if (reports.length === 0) return 0;
    const oldestDate = new Date(reports[reports.length - 1].date);
    const today = new Date();
    const daysSinceStart = Math.floor((today.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.min(100, Math.round((reports.length / daysSinceStart) * 100));
  }, [reports]);
  
  const improvementTrend = useMemo(() => {
    if (reports.length < 14) return null;
    const firstWeek = reports.slice(-7).reduce((sum, r) => sum + r.productivityPercent, 0) / 7;
    const lastWeek = reports.slice(0, 7).reduce((sum, r) => sum + r.productivityPercent, 0) / 7;
    const change = lastWeek - firstWeek;
    
    // Generate auto-details
    const details: string[] = [];
    if (change > 10) details.push("Strong upward momentum! Your productivity is significantly improving.");
    else if (change > 5) details.push("Good progress! You're building better habits.");
    else if (change > 0) details.push("Slight improvement. Keep pushing for consistency.");
    else if (change > -5) details.push("Minor dip. Review your recent routines.");
    else if (change > -10) details.push("Noticeable decline. Consider adjusting your workload.");
    else details.push("Significant drop. Time to reassess priorities and take breaks if needed.");
    
    // Add streak insight
    const recentStreak = reports.slice(0, 7).filter(r => r.productivityPercent >= 60).length;
    if (recentStreak >= 6) details.push(`🔥 ${recentStreak}/7 days above 60% this week!`);
    else if (recentStreak >= 4) details.push(`Good consistency: ${recentStreak}/7 productive days this week.`);
    
    return { change, improving: change > 0, details };
  }, [reports]);
  
  // Trend data for charts
  const trendChartData = useMemo(() => {
    return reports.slice(0, 14).reverse().map(r => ({
      date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      productivity: Math.round(r.productivityPercent)
    }));
  }, [reports]);
  
  const weeklySummary = useMemo(() => {
    const last7 = reports.slice(0, 7);
    if (last7.length === 0) return null;
    const avgProductivity = last7.reduce((sum, r) => sum + r.productivityPercent, 0) / last7.length;
    const bestDay = last7.reduce((best, r) => r.productivityPercent > best.productivityPercent ? r : best, last7[0]);
    const totalTasks = last7.reduce((sum, r) => sum + r.tasks.length, 0);
    const completedTasks = last7.reduce((sum, r) => sum + r.tasks.filter(t => t.completionPercent >= 80).length, 0);
    return { avgProductivity, bestDay, totalTasks, completedTasks, daysTracked: last7.length };
  }, [reports]);
  
  const monthlySummary = useMemo(() => {
    const last30 = reports.slice(0, 30);
    if (last30.length === 0) return null;
    const avgProductivity = last30.reduce((sum, r) => sum + r.productivityPercent, 0) / last30.length;
    const bestDay = last30.reduce((best, r) => r.productivityPercent > best.productivityPercent ? r : best, last30[0]);
    const totalTasks = last30.reduce((sum, r) => sum + r.tasks.length, 0);
    const completedTasks = last30.reduce((sum, r) => sum + r.tasks.filter(t => t.completionPercent >= 80).length, 0);
    const weeks: number[] = [];
    for (let i = 0; i < Math.min(4, Math.ceil(last30.length / 7)); i++) {
      const weekReports = last30.slice(i * 7, (i + 1) * 7);
      if (weekReports.length > 0) {
        weeks.push(weekReports.reduce((sum, r) => sum + r.productivityPercent, 0) / weekReports.length);
      }
    }
    return { avgProductivity, bestDay, totalTasks, completedTasks, daysTracked: last30.length, weeks };
  }, [reports]);
  
  // All 7 days performance
  const allDaysPerformance = useMemo(() => {
    const { dayScores, dayNames } = bestDayOfWeek;
    return dayNames.map((name, idx) => ({
      name,
      shortName: name.substring(0, 3),
      avg: dayScores[idx] ? dayScores[idx].total / dayScores[idx].count : 0,
      count: dayScores[idx]?.count || 0
    }));
  }, [bestDayOfWeek]);
  
  const generateAISuggestions = useCallback(async (type: string = "suggestions") => {
    if (reports.length < 3) {
      toast.error("Need at least 3 days of data for AI insights");
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
      
      if (type === "weekly-review") {
        if (data?.grade) {
          setWeeklyReview(data);
          toast.success("Weekly review generated!");
        } else {
          toast.error("Failed to generate weekly review");
        }
      } else if (type === "deep-analysis") {
        if (data?.analysis) {
          setAiAnalysis(data.analysis);
          if (data.recommendations) {
            setAiSuggestions(data.recommendations);
          }
          toast.success("Deep analysis complete!");
        } else {
          toast.error("Failed to generate analysis");
        }
      } else if (data?.suggestions) {
        setAiSuggestions(data.suggestions);
        toast.success("AI insights generated!");
      }
    } catch (error: any) {
      console.error('AI suggestions error:', error);
      if (error?.message?.includes('429')) {
        toast.error("Rate limited. Please try again later.");
      } else if (error?.message?.includes('402')) {
        toast.error("Please add credits to continue using AI features.");
      } else {
        const suggestions = generateRuleBasedSuggestions();
        setAiSuggestions(suggestions);
        toast.info("Generated local insights");
      }
    } finally {
      setLoadingAI(false);
      setActiveAIType("");
    }
  }, [reports]);

  const sendChatMessage = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return;
    
    if (reports.length < 3) {
      toast.error("Need at least 3 days of data for AI chat");
      return;
    }
    
    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);
    
    try {
      const recentData = reports.slice(0, 14).map(r => ({
        date: r.date,
        productivity: Math.round(r.productivityPercent),
        tasks: r.tasks.map(t => ({ title: t.title, completion: t.completionPercent, category: t.category }))
      }));
      
      const { data, error } = await supabase.functions.invoke('ai-insights', {
        body: { reports: recentData, type: 'chat', chatMessage: userMessage }
      });
      
      if (error) throw error;
      
      if (data?.response) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        throw new Error("No response received");
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      if (error?.message?.includes('429')) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: "I'm currently rate limited. Please try again in a moment." }]);
      } else if (error?.message?.includes('402')) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: "Please add credits to continue chatting." }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't process your question. Please try again." }]);
      }
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, reports]);
  
  const generateRuleBasedSuggestions = useCallback(() => {
    const suggestions: string[] = [];
    
    if (consistencyScore < 60) {
      suggestions.push("Try to track your productivity daily for more accurate insights.");
    }
    
    if (improvementTrend && !improvementTrend.improving) {
      suggestions.push("Your productivity has dipped recently. Consider reviewing your task priorities.");
    }
    
    const worstDay = allDaysPerformance.reduce((worst, day) => day.avg > 0 && day.avg < worst.avg ? day : worst, allDaysPerformance[0]);
    if (worstDay && worstDay.avg < 50 && worstDay.count > 2) {
      suggestions.push(`${worstDay.name}s tend to be your least productive. Consider lighter tasks on these days.`);
    }
    
    if (suggestions.length === 0) {
      suggestions.push("Great job! Keep maintaining your current habits.");
      suggestions.push(`Your best day is ${bestDayOfWeek.name} - schedule important tasks then.`);
    }
    
    return suggestions;
  }, [consistencyScore, improvementTrend, allDaysPerformance, bestDayOfWeek]);

  const handleExportPDF = useCallback(async () => {
    try {
      toast.loading("Generating PDF...");
      await exportInsightsPDF(weeklySummary, monthlySummary, allDaysPerformance, topTasks, aiSuggestions, consistencyScore);
      toast.dismiss();
      toast.success("Insights exported as PDF!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to export PDF");
    }
  }, [weeklySummary, monthlySummary, allDaysPerformance, topTasks, aiSuggestions, consistencyScore]);
  
  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Analyzing your data...</div>
        </div>
      </MobileLayout>
    );
  }
  
  return (
    <MobileLayout>
      <div className="container max-w-2xl mx-auto p-4 space-y-4" ref={insightsRef}>
        <PageHeader
          title="Insights"
          subtitle="Discover your patterns"
          icon={Brain}
          actions={
            <>
              <Button variant="ghost" size="icon" onClick={() => setShowChat(!showChat)} title="Chat with AI">
                <MessageCircle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleExportPDF} title="Export as PDF">
                <FileText className="h-4 w-4" />
              </Button>
            </>
          }
        />

        {/* AI Chat Panel */}
        {showChat && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Productivity Coach</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div ref={chatScrollRef} className="h-64 overflow-y-auto space-y-3 mb-3 p-2 bg-muted/30 rounded-lg">
              {chatMessages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Ask me anything about your productivity!</p>
                  <p className="text-xs mt-1">e.g., "Why am I less productive on Fridays?"</p>
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Input
                placeholder="Ask about your productivity..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                disabled={chatLoading}
              />
              <Button size="icon" onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}
        
        {reports.length < 7 && (
          <Card className="p-4 bg-accent/5">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-accent mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Keep Going!</h3>
                <p className="text-xs text-muted-foreground">
                  Track at least 7 days to unlock deeper insights.
                </p>
              </div>
            </div>
          </Card>
        )}
        
        {/* AI Suggestions */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-5 w-5 text-accent" />
            <h3 className="font-semibold">AI-Powered Insights</h3>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => generateAISuggestions("suggestions")} disabled={loadingAI} className="flex flex-col h-auto py-2">
              {loadingAI && activeAIType === "suggestions" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mb-1" /><span className="text-xs">Quick Tips</span></>}
            </Button>
            <Button variant="outline" size="sm" onClick={() => generateAISuggestions("deep-analysis")} disabled={loadingAI} className="flex flex-col h-auto py-2">
              {loadingAI && activeAIType === "deep-analysis" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><Zap className="h-4 w-4 mb-1" /><span className="text-xs">Deep Analysis</span></>}
            </Button>
            <Button variant="outline" size="sm" onClick={() => generateAISuggestions("weekly-review")} disabled={loadingAI} className="flex flex-col h-auto py-2">
              {loadingAI && activeAIType === "weekly-review" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><BookOpen className="h-4 w-4 mb-1" /><span className="text-xs">Week Review</span></>}
            </Button>
          </div>

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

          {aiAnalysis && (
            <div className="mb-4 p-3 bg-accent/5 rounded-lg">
              <p className="text-sm">{aiAnalysis}</p>
            </div>
          )}

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
              Click a button above to get personalized insights.
            </p>
          )}
        </Card>
        
        {/* Weekly Summary */}
        {weeklySummary && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-5 w-5 text-info" />
              <h3 className="font-semibold">This Week</h3>
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
                <div className="text-2xl font-bold text-success">{Math.round(weeklySummary.bestDay.productivityPercent)}%</div>
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
                  <div className="text-xs text-muted-foreground mb-2">Weekly Trend</div>
                  <div className="flex gap-1">
                    {monthlySummary.weeks.map((week, idx) => (
                      <div key={idx} className="flex-1">
                        <div className="bg-primary/20 rounded-t" style={{ height: `${Math.max(4, week * 0.6)}px` }} />
                        <div className="text-xs text-center mt-1 text-muted-foreground">W{idx + 1}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
        
        {/* Best Days - All 7 days */}
        {reports.length >= 7 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-5 w-5 text-success" />
              <h3 className="font-semibold text-base">Performance by Day</h3>
            </div>
            
            {/* Bar Chart for day performance */}
            <div className="mb-4">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={allDaysPerformance.filter(d => d.count > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="shortName" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={9} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="avg" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-2">
              {allDaysPerformance.map((day) => (
                <div key={day.name} className="flex items-center gap-3">
                  <div className="w-10 text-sm font-medium">{day.shortName}</div>
                  <div className="flex-1">
                    <Progress value={day.avg} className="h-2" />
                  </div>
                  <div className="w-14 text-sm text-right font-medium">
                    {day.count > 0 ? `${Math.round(day.avg)}%` : '-'}
                  </div>
                  <div className="w-8 text-xs text-muted-foreground text-right">
                    ({day.count})
                  </div>
                </div>
              ))}
            </div>
            
            {/* Auto-generated insight */}
            {(() => {
              const best = allDaysPerformance.reduce((a, b) => (a.avg > b.avg && a.count > 0) ? a : b, allDaysPerformance[0]);
              const worst = allDaysPerformance.reduce((a, b) => (b.avg < a.avg && b.count > 0 && a.count > 0) ? b : a, allDaysPerformance[0]);
              if (best && worst && best.count > 0 && worst.count > 0) {
                return (
                  <div className="mt-4 p-3 bg-success/5 rounded-lg border border-success/20">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{best.name}</span> is your best day ({Math.round(best.avg)}%), while <span className="font-medium text-foreground">{worst.name}</span> tends to be lower ({Math.round(worst.avg)}%). Schedule important tasks on {best.name}s!
                    </p>
                  </div>
                );
              }
              return null;
            })()}
          </Card>
        )}
        
        {/* Top Tasks */}
        {topTasks.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-info" />
              <h3 className="font-semibold">Top Performing Tasks</h3>
            </div>
            <div className="space-y-2">
              {topTasks.map((task, idx) => (
                <div key={task.title} className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-info/10 flex items-center justify-center text-xs font-bold text-info">
                    {idx + 1}
                  </div>
                  <div className="flex-1 truncate text-sm">{task.title}</div>
                  <div className="text-sm font-medium">{Math.round(task.avg)}%</div>
                </div>
              ))}
            </div>
          </Card>
        )}
        
        {/* Consistency Score */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-warning" />
            <h3 className="font-semibold">Consistency Score</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Daily tracking</span>
              <span className="font-bold">{consistencyScore}%</span>
            </div>
            <Progress value={consistencyScore} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {consistencyScore >= 80 ? "Excellent tracking consistency!" : consistencyScore >= 60 ? "Good consistency, keep it up!" : "Try to track daily for better insights."}
            </p>
          </div>
        </Card>
        
        {/* Improvement Trend */}
        {improvementTrend && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className={`h-5 w-5 ${improvementTrend.improving ? 'text-success' : 'text-destructive'}`} />
              <h3 className="font-semibold text-base">Progress Trend</h3>
            </div>
            
            {/* Trend Chart */}
            {trendChartData.length > 0 && (
              <div className="mb-4">
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={trendChartData}>
                    <defs>
                      <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={improvementTrend.improving ? "hsl(142, 76%, 36%)" : "hsl(0, 70%, 50%)"} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={improvementTrend.improving ? "hsl(142, 76%, 36%)" : "hsl(0, 70%, 50%)"} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" fontSize={9} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
                    <YAxis fontSize={9} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="productivity" stroke={improvementTrend.improving ? "hsl(142, 76%, 36%)" : "hsl(0, 70%, 50%)"} strokeWidth={2} fill="url(#trendGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${improvementTrend.improving ? 'bg-success/10' : 'bg-destructive/10'}`}>
                {improvementTrend.improving ? <ArrowUp className="h-4 w-4 text-success" /> : <ArrowDown className="h-4 w-4 text-destructive" />}
                <span className={`text-lg font-bold ${improvementTrend.improving ? 'text-success' : 'text-destructive'}`}>
                  {improvementTrend.improving ? '+' : ''}{Math.round(improvementTrend.change)}%
                </span>
              </div>
              <span className="text-sm text-muted-foreground">vs first week</span>
            </div>
            
            {/* Auto-generated details */}
            {improvementTrend.details && improvementTrend.details.length > 0 && (
              <div className="space-y-2">
                {improvementTrend.details.map((detail, idx) => (
                  <div key={idx} className={`p-2.5 rounded-lg text-sm ${improvementTrend.improving ? 'bg-success/5 border border-success/20' : 'bg-warning/5 border border-warning/20'}`}>
                    {detail}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </MobileLayout>
  );
};

export default Insights;
