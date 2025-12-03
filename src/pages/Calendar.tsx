import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getAllDailyReports } from "@/lib/storage";
import { getMonthDays, formatDate, isToday } from "@/lib/dates";
import { format, addMonths, subMonths, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import type { DailyReport } from "@/types";
import { cn } from "@/lib/utils";

type ViewMode = 'month' | 'week';

const Calendar = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [reports, setReports] = useState<Record<string, DailyReport>>({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadReports();
  }, []);
  
  async function loadReports() {
    const allReports = await getAllDailyReports();
    const reportsMap: Record<string, DailyReport> = {};
    allReports.forEach(report => {
      reportsMap[report.date] = report;
    });
    setReports(reportsMap);
    setLoading(false);
  }
  
  const monthDays = getMonthDays(currentDate);
  
  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate),
    end: endOfWeek(currentDate)
  });
  
  function getProductivityColor(productivity: number) {
    if (productivity >= 80) return "bg-success";
    if (productivity >= 60) return "bg-primary";
    if (productivity >= 40) return "bg-warning";
    return "bg-destructive";
  }
  
  function getProductivityLabel(productivity: number) {
    if (productivity >= 80) return "Excellent";
    if (productivity >= 60) return "Good";
    if (productivity >= 40) return "Fair";
    return "Needs Work";
  }
  
  function goToPrev() {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  }
  
  function goToNext() {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  }
  
  const renderDayCell = (day: Date, isWeekView: boolean = false) => {
    const dateStr = formatDate(day);
    const report = reports[dateStr];
    const hasReport = !!report;
    const isTodayDate = isToday(day);
    
    const cellContent = (
      <button
        onClick={() => navigate(`/day/${dateStr}`)}
        className={cn(
          "rounded-lg flex flex-col items-center justify-center relative transition-colors cursor-pointer hover:bg-accent/10",
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
  
  return (
    <MobileLayout>
      <div className="container max-w-2xl mx-auto p-4 space-y-4">
        <div className="pt-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Calendar</h1>
            <p className="text-sm text-muted-foreground">View your daily reports</p>
          </div>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="month" className="gap-1">
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Month</span>
              </TabsTrigger>
              <TabsTrigger value="week" className="gap-1">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Week</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={goToPrev}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold">
              {viewMode === 'month' 
                ? format(currentDate, "MMMM yyyy")
                : `${format(startOfWeek(currentDate), "MMM d")} - ${format(endOfWeek(currentDate), "MMM d, yyyy")}`
              }
            </h2>
            <Button variant="ghost" size="icon" onClick={goToNext}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          
          {viewMode === 'month' ? (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => (
                  <div key={day} className="text-center text-xs text-muted-foreground font-medium p-2">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: monthDays[0].getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                
                {/* Month days */}
                {monthDays.map(day => renderDayCell(day, false))}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map(day => renderDayCell(day, true))}
            </div>
          )}
        </Card>
        
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
