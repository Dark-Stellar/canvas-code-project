import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Download, TrendingUp, BarChart3, Target, ArrowUp, ArrowDown, FileText } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAllReports } from "@/hooks/useReports";
import { getMonthDays, formatDate, isToday } from "@/lib/dates";
import { format, addMonths, subMonths, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, isSameMonth } from "date-fns";
import type { DailyReport } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type ViewMode = 'month' | 'week' | 'stats';

const Calendar = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const { data: allReports = [], isLoading } = useAllReports();
  const loading = isLoading && allReports.length === 0;
  const reports = useMemo(() => {
    const map: Record<string, DailyReport> = {};
    for (const r of allReports) map[r.date] = r;
    return map;
  }, [allReports]);
  
  const monthDays = useMemo(() => getMonthDays(currentDate), [currentDate]);
  
  const weekDays = useMemo(() => eachDayOfInterval({
    start: startOfWeek(currentDate),
    end: endOfWeek(currentDate)
  }), [currentDate]);

  // Monthly stats
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const monthReports = allReports.filter(r => {
      const date = new Date(r.date);
      return date >= monthStart && date <= monthEnd;
    });

    if (monthReports.length === 0) return null;

    const avgProductivity = monthReports.reduce((sum, r) => sum + r.productivityPercent, 0) / monthReports.length;
    const bestDay = monthReports.reduce((best, r) => r.productivityPercent > best.productivityPercent ? r : best);
    const worstDay = monthReports.reduce((worst, r) => r.productivityPercent < worst.productivityPercent ? r : worst);
    const totalTasks = monthReports.reduce((sum, r) => sum + r.tasks.length, 0);
    const completedTasks = monthReports.reduce((sum, r) => sum + r.tasks.filter(t => t.completionPercent >= 80).length, 0);

    // Weekly breakdown
    const weeks: { week: number; avg: number; days: number }[] = [];
    for (let w = 0; w < 5; w++) {
      const weekStart = new Date(monthStart);
      weekStart.setDate(monthStart.getDate() + (w * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const weekReports = monthReports.filter(r => {
        const date = new Date(r.date);
        return date >= weekStart && date <= weekEnd && isSameMonth(date, currentDate);
      });
      
      if (weekReports.length > 0) {
        weeks.push({
          week: w + 1,
          avg: Math.round(weekReports.reduce((sum, r) => sum + r.productivityPercent, 0) / weekReports.length),
          days: weekReports.length
        });
      }
    }

    return {
      avgProductivity: Math.round(avgProductivity),
      daysTracked: monthReports.length,
      bestDay,
      worstDay,
      totalTasks,
      completedTasks,
      weeks
    };
  }, [allReports, currentDate]);

  // Recent reports for quick access
  const recentReports = useMemo(() => allReports.slice(0, 5), [allReports]);
  
  const getProductivityColor = useCallback((productivity: number) => {
    if (productivity >= 80) return "bg-success";
    if (productivity >= 60) return "bg-primary";
    if (productivity >= 40) return "bg-warning";
    return "bg-destructive";
  }, []);
  
  const getProductivityLabel = useCallback((productivity: number) => {
    if (productivity >= 80) return "Excellent";
    if (productivity >= 60) return "Good";
    if (productivity >= 40) return "Fair";
    return "Needs Work";
  }, []);
  
  const goToPrev = useCallback(() => {
    if (viewMode === 'month' || viewMode === 'stats') {
      setCurrentDate(prev => subMonths(prev, 1));
    } else {
      setCurrentDate(prev => subWeeks(prev, 1));
    }
  }, [viewMode]);
  
  const goToNext = useCallback(() => {
    if (viewMode === 'month' || viewMode === 'stats') {
      setCurrentDate(prev => addMonths(prev, 1));
    } else {
      setCurrentDate(prev => addWeeks(prev, 1));
    }
  }, [viewMode]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const exportMonthPDF = useCallback(async () => {
    if (!monthStats) {
      toast.error("No data to export for this month");
      return;
    }

    try {
      toast.loading("Generating PDF...");
      const pdf = new jsPDF();
      const monthName = format(currentDate, "MMMM yyyy");
      
      pdf.setFontSize(20);
      pdf.text(`Glow - ${monthName} Report`, 20, 20);
      
      pdf.setFontSize(12);
      pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 30);
      
      // Summary stats
      pdf.setFontSize(14);
      pdf.text("Monthly Summary", 20, 45);
      
      pdf.setFontSize(11);
      pdf.text(`Average Productivity: ${monthStats.avgProductivity}%`, 20, 55);
      pdf.text(`Days Tracked: ${monthStats.daysTracked}`, 20, 62);
      pdf.text(`Tasks Completed: ${monthStats.completedTasks} / ${monthStats.totalTasks}`, 20, 69);
      pdf.text(`Best Day: ${format(new Date(monthStats.bestDay.date), "MMM d")} (${Math.round(monthStats.bestDay.productivityPercent)}%)`, 20, 76);
      pdf.text(`Worst Day: ${format(new Date(monthStats.worstDay.date), "MMM d")} (${Math.round(monthStats.worstDay.productivityPercent)}%)`, 20, 83);
      
      // Weekly breakdown table
      if (monthStats.weeks.length > 0) {
        pdf.setFontSize(14);
        pdf.text("Weekly Breakdown", 20, 100);
        
        autoTable(pdf, {
          startY: 105,
          head: [['Week', 'Avg Productivity', 'Days Tracked']],
          body: monthStats.weeks.map(w => [`Week ${w.week}`, `${w.avg}%`, `${w.days} days`]),
          theme: 'grid',
          headStyles: { fillColor: [147, 51, 234] }
        });
      }
      
      // Daily breakdown
      const monthReports = allReports.filter(r => {
        const date = new Date(r.date);
        return isSameMonth(date, currentDate);
      }).sort((a, b) => a.date.localeCompare(b.date));
      
      if (monthReports.length > 0) {
        const finalY = (pdf as any).lastAutoTable?.finalY || 130;
        pdf.setFontSize(14);
        pdf.text("Daily Reports", 20, finalY + 15);
        
        autoTable(pdf, {
          startY: finalY + 20,
          head: [['Date', 'Productivity', 'Tasks', 'Status']],
          body: monthReports.map(r => [
            format(new Date(r.date), "MMM d, yyyy"),
            `${Math.round(r.productivityPercent)}%`,
            `${r.tasks.filter(t => t.completionPercent >= 80).length}/${r.tasks.length}`,
            getProductivityLabel(r.productivityPercent)
          ]),
          theme: 'striped',
          headStyles: { fillColor: [147, 51, 234] }
        });
      }
      
      pdf.save(`glow-${format(currentDate, "yyyy-MM")}-report.pdf`);
      toast.dismiss();
      toast.success("PDF exported successfully!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to export PDF");
    }
  }, [monthStats, currentDate, allReports, getProductivityLabel]);
  
  const renderDayCell = useCallback((day: Date, isWeekView: boolean = false) => {
    const dateStr = formatDate(day);
    const report = reports[dateStr];
    const hasReport = !!report;
    const isTodayDate = isToday(day);
    
    const cellContent = (
      <button
        onClick={() => navigate(`/day/${dateStr}`)}
        className={cn(
          "rounded-lg flex flex-col items-center justify-center relative transition-all duration-200 cursor-pointer hover:bg-accent/10 hover:shadow-sm",
          isWeekView ? "p-4 min-h-[120px] w-full" : "aspect-square",
          isTodayDate && "ring-2 ring-primary",
          !hasReport && "text-muted-foreground"
        )}
      >
        <div className={cn("font-medium", isWeekView ? "text-lg mb-2" : "text-sm")}>{format(day, "d")}</div>
        {isWeekView && (
          <div className="text-xs text-muted-foreground mb-2">{format(day, "EEE")}</div>
        )}
        {hasReport && (
          <>
            <div className={cn(
              "rounded-full",
              isWeekView ? "w-3 h-3 mb-1" : "w-1.5 h-1.5 mt-0.5",
              getProductivityColor(report.productivityPercent)
            )} />
            <div className={cn("font-semibold", isWeekView ? "text-lg" : "text-[10px] mt-0.5")}>
              {Math.round(report.productivityPercent)}%
            </div>
            {isWeekView && (
              <div className={cn("text-xs mt-1", getProductivityColor(report.productivityPercent).replace('bg-', 'text-'))}>
                {getProductivityLabel(report.productivityPercent)}
              </div>
            )}
          </>
        )}
      </button>
    );
    
    if (hasReport && !isWeekView) {
      return (
        <Tooltip key={dateStr}>
          <TooltipTrigger asChild>
            {cellContent}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2 p-1">
              <div className="font-semibold">{format(day, "MMM d, yyyy")}</div>
              <div className="text-sm">
                <span className={cn("font-bold", getProductivityColor(report.productivityPercent).replace('bg-', 'text-'))}>
                  {Math.round(report.productivityPercent)}%
                </span>
                <span className="text-muted-foreground ml-1">productivity</span>
              </div>
              <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                <div className="font-medium mb-1">Tasks:</div>
                {report.tasks.slice(0, 3).map((task, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2">
                    <span className="truncate">{task.title}</span>
                    <span className="flex-shrink-0">{task.completionPercent}%</span>
                  </div>
                ))}
                {report.tasks.length > 3 && (
                  <div className="text-muted-foreground mt-1">+{report.tasks.length - 3} more</div>
                )}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }
    
    return <div key={dateStr}>{cellContent}</div>;
  }, [reports, navigate, getProductivityColor, getProductivityLabel]);
  
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
      <div className="container max-w-2xl mx-auto p-4 space-y-4">
        <PageHeader
          title="Calendar"
          subtitle="View your daily reports"
          icon={CalendarIcon}
          actions={
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={goToToday} title="Go to today">
                <Target className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={exportMonthPDF} title="Export month as PDF">
                <FileText className="h-4 w-4" />
              </Button>
            </div>
          }
        />

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full">
          <TabsList className="grid grid-cols-3 h-9">
            <TabsTrigger value="month" className="gap-1 text-xs px-2">
              <CalendarIcon className="h-3.5 w-3.5" />
              Month
            </TabsTrigger>
            <TabsTrigger value="week" className="gap-1 text-xs px-2">
              <List className="h-3.5 w-3.5" />
              Week
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1 text-xs px-2">
              <BarChart3 className="h-3.5 w-3.5" />
              Stats
            </TabsTrigger>
          </TabsList>
          
          {/* Month View */}
          <TabsContent value="month" className="space-y-4 mt-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={goToPrev}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-lg font-semibold">{format(currentDate, "MMMM yyyy")}</h2>
                <Button variant="ghost" size="icon" onClick={goToNext}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => (
                  <div key={day} className="text-center text-xs text-muted-foreground font-medium p-2">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: monthDays[0].getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {monthDays.map(day => renderDayCell(day, false))}
              </div>
            </Card>

            {/* Recent Reports */}
            {recentReports.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Recent Days
                </h3>
                <div className="space-y-2">
                  {recentReports.map(report => (
                    <button
                      key={report.date}
                      onClick={() => navigate(`/day/${report.date}`)}
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm font-medium">{format(new Date(report.date), "EEE, MMM d")}</span>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", getProductivityColor(report.productivityPercent))} />
                        <span className="text-sm font-bold">{Math.round(report.productivityPercent)}%</span>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>
          
          {/* Week View */}
          <TabsContent value="week" className="space-y-4 mt-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={goToPrev}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-lg font-semibold">
                  {format(startOfWeek(currentDate), "MMM d")} - {format(endOfWeek(currentDate), "MMM d, yyyy")}
                </h2>
                <Button variant="ghost" size="icon" onClick={goToNext}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map(day => renderDayCell(day, true))}
              </div>
            </Card>
          </TabsContent>
          
          {/* Stats View */}
          <TabsContent value="stats" className="space-y-4 mt-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={goToPrev}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-lg font-semibold">{format(currentDate, "MMMM yyyy")}</h2>
                <Button variant="ghost" size="icon" onClick={goToNext}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
              
              {monthStats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{monthStats.avgProductivity}%</div>
                      <div className="text-xs text-muted-foreground">Avg Productivity</div>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold">{monthStats.daysTracked}</div>
                      <div className="text-xs text-muted-foreground">Days Tracked</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-success/10 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <ArrowUp className="h-4 w-4 text-success" />
                        <span className="text-xs text-muted-foreground">Best Day</span>
                      </div>
                      <div className="font-semibold">{format(new Date(monthStats.bestDay.date), "MMM d")}</div>
                      <div className="text-sm text-success font-bold">{Math.round(monthStats.bestDay.productivityPercent)}%</div>
                    </div>
                    <div className="p-3 bg-destructive/10 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <ArrowDown className="h-4 w-4 text-destructive" />
                        <span className="text-xs text-muted-foreground">Worst Day</span>
                      </div>
                      <div className="font-semibold">{format(new Date(monthStats.worstDay.date), "MMM d")}</div>
                      <div className="text-sm text-destructive font-bold">{Math.round(monthStats.worstDay.productivityPercent)}%</div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="text-sm font-medium mb-2">Task Completion</div>
                    <Progress value={(monthStats.completedTasks / monthStats.totalTasks) * 100} className="h-2 mb-1" />
                    <div className="text-xs text-muted-foreground">
                      {monthStats.completedTasks} of {monthStats.totalTasks} tasks completed ({Math.round((monthStats.completedTasks / monthStats.totalTasks) * 100)}%)
                    </div>
                  </div>
                  
                  {monthStats.weeks.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">Weekly Breakdown</div>
                      <div className="space-y-2">
                        {monthStats.weeks.map(w => (
                          <div key={w.week} className="flex items-center gap-3">
                            <span className="text-sm w-16">Week {w.week}</span>
                            <div className="flex-1">
                              <Progress value={w.avg} className="h-2" />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{w.avg}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No data for this month
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
        
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Legend</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span>80%+ Excellent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span>60-79% Good</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <span>40-59% Fair</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span>&lt;40% Needs Work</span>
            </div>
          </div>
        </Card>
      </div>
    </MobileLayout>
  );
};

export default Calendar;
