import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAllDailyReports } from "@/lib/storage";
import { getMonthDays, formatDate, isToday } from "@/lib/dates";
import { format, addMonths, subMonths } from "date-fns";
import type { DailyReport } from "@/types";
import { cn } from "@/lib/utils";

const Calendar = () => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
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
  
  const monthDays = getMonthDays(currentMonth);
  
  function getProductivityColor(productivity: number) {
    if (productivity >= 80) return "bg-success";
    if (productivity >= 60) return "bg-primary";
    if (productivity >= 40) return "bg-warning";
    return "bg-destructive";
  }
  
  function goToPrevMonth() {
    setCurrentMonth(subMonths(currentMonth, 1));
  }
  
  function goToNextMonth() {
    setCurrentMonth(addMonths(currentMonth, 1));
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
  
  return (
    <MobileLayout>
      <div className="container max-w-2xl mx-auto p-4 space-y-4">
        <div className="pt-4">
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-sm text-muted-foreground">View your daily reports</p>
        </div>
        
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <Button variant="ghost" size="icon" onClick={goToNextMonth}>
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
            {/* Empty cells for days before month starts */}
            {Array.from({ length: monthDays[0].getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            
            {/* Month days */}
            {monthDays.map(day => {
              const dateStr = formatDate(day);
              const report = reports[dateStr];
              const hasReport = !!report;
              const isTodayDate = isToday(day);
              
              return (
                <button
                  key={dateStr}
                  onClick={() => navigate(`/day/${dateStr}`)}
                  className={cn(
                    "aspect-square rounded-lg flex flex-col items-center justify-center relative transition-colors cursor-pointer hover:bg-accent/10",
                    isTodayDate && "ring-2 ring-primary",
                    !hasReport && "text-muted-foreground"
                  )}
                >
                  <div className="text-sm font-medium">{format(day, "d")}</div>
                  {hasReport && (
                    <>
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full mt-0.5",
                        getProductivityColor(report.productivityPercent)
                      )} />
                      <div className="text-[10px] font-semibold mt-0.5">
                        {Math.round(report.productivityPercent)}%
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
        
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Legend</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span>80%+ (Excellent)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span>60-79% (Good)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <span>40-59% (Fair)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span>&lt;40% (Needs Improvement)</span>
            </div>
          </div>
        </Card>
      </div>
    </MobileLayout>
  );
};

export default Calendar;
