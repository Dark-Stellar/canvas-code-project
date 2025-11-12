import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/MobileLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllDailyReports } from "@/lib/storage";
import { TrendingUp, Calendar as CalendarIcon, Target, Zap, Edit } from "lucide-react";
import type { DailyReport } from "@/types";
import { formatDisplayDate } from "@/lib/dates";

const Analytics = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  
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
