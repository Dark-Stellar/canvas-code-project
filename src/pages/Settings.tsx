import { useEffect, useState, useCallback } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Database, Info, Send, Moon, Sun, Monitor } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getAllDailyReports } from "@/lib/storage";
import { scheduleNotifications, sendTestNotification } from "@/lib/notifications";
import { useTheme } from "next-themes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [morningTime, setMorningTime] = useState("09:00");
  const [eveningTime, setEveningTime] = useState("21:00");
  const [loading, setLoading] = useState(true);
  const [browserNotificationsGranted, setBrowserNotificationsGranted] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  
  useEffect(() => {
    loadPreferences();
    checkNotificationPermission();
  }, []);
  
  const checkNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      setBrowserNotificationsGranted(Notification.permission === 'granted');
    }
  }, []);
  
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setBrowserNotificationsGranted(permission === 'granted');
      if (permission === 'granted') {
        toast.success("Browser notifications enabled!");
        scheduleAppNotifications();
      } else {
        toast.error("Notification permission denied");
      }
    }
  }, []);
  
  async function loadPreferences() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) {
      setNotificationsEnabled(data.notifications_enabled);
      setMorningTime(data.morning_reminder_time || "09:00");
      setEveningTime(data.evening_reminder_time || "21:00");
    }
    setLoading(false);
  }
  
  function scheduleAppNotifications() {
    if (!browserNotificationsGranted || !notificationsEnabled) return;
    scheduleNotifications(morningTime, eveningTime, notificationsEnabled);
  }
  
  async function savePreferences() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        notifications_enabled: notificationsEnabled,
        morning_reminder_time: morningTime,
        evening_reminder_time: eveningTime,
      });
    
    if (error) {
      toast.error("Failed to save preferences");
    } else {
      toast.success("Preferences saved!");
      if (notificationsEnabled && browserNotificationsGranted) {
        scheduleAppNotifications();
      }
    }
  }
  
  async function handleSendTestNotification() {
    setSendingTest(true);
    try {
      const result = await sendTestNotification();
      if (result.success) {
        toast.success("Test notification sent to your email!");
      } else {
        toast.error(result.error || "Failed to send test notification");
      }
    } catch (error) {
      toast.error("Failed to send test notification");
    } finally {
      setSendingTest(false);
    }
  }
  
  async function handleExportAll() {
    const reports = await getAllDailyReports();
    
    if (reports.length === 0) {
      toast.error("No data to export");
      return;
    }
    
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const doc = new jsPDF() as any;
    
    // Header with gradient effect
    doc.setFillColor(139, 92, 246);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("Glow - Productivity Report", 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text("Measure. Grow. Glow.", 105, 30, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    
    // Summary statistics
    const avgProductivity = reports.reduce((sum, r) => sum + r.productivityPercent, 0) / reports.length;
    const totalDays = reports.length;
    const last7Days = reports.slice(0, 7);
    const avg7Days = last7Days.length > 0 ? last7Days.reduce((sum, r) => sum + r.productivityPercent, 0) / last7Days.length : 0;
    
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
    
    // Best and worst day
    const bestDay = reports.reduce((best, r) => r.productivityPercent > best.productivityPercent ? r : best);
    const worstDay = reports.reduce((worst, r) => r.productivityPercent < worst.productivityPercent ? r : worst);
    
    // Stats boxes
    let yPos = 50;
    const statBoxes = [
      { label: 'Total Days', value: totalDays.toString(), color: [139, 92, 246] },
      { label: 'Avg Productivity', value: `${Math.round(avgProductivity)}%`, color: [236, 72, 153] },
      { label: '7-Day Average', value: `${Math.round(avg7Days)}%`, color: [34, 197, 94] },
      { label: 'Current Streak', value: currentStreak.toString(), color: [59, 130, 246] },
    ];
    
    const boxWidth = 45;
    const boxHeight = 25;
    const startX = 15;
    const gap = 3;
    
    statBoxes.forEach((stat, idx) => {
      const x = startX + (idx * (boxWidth + gap));
      doc.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
      doc.roundedRect(x, yPos, boxWidth, boxHeight, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text(stat.value, x + boxWidth / 2, yPos + 12, { align: 'center' });
      doc.setFontSize(8);
      doc.text(stat.label, x + boxWidth / 2, yPos + 20, { align: 'center' });
    });
    
    doc.setTextColor(0, 0, 0);
    yPos += 35;
    
    // Best and Worst Day Section
    doc.setFontSize(14);
    doc.text("Highlights", 14, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(34, 197, 94);
    doc.text(`Best Day: ${new Date(bestDay.date).toLocaleDateString()} - ${Math.round(bestDay.productivityPercent)}%`, 14, yPos);
    yPos += 6;
    doc.setTextColor(239, 68, 68);
    doc.text(`Lowest Day: ${new Date(worstDay.date).toLocaleDateString()} - ${Math.round(worstDay.productivityPercent)}%`, 14, yPos);
    yPos += 10;
    doc.setTextColor(0, 0, 0);
    
    // Weekly breakdown
    doc.setFontSize(14);
    doc.text("Weekly Breakdown", 14, yPos);
    yPos += 8;
    
    const weeklyData: { week: string; avg: number; days: number }[] = [];
    const weeks = Math.ceil(reports.length / 7);
    for (let i = 0; i < Math.min(weeks, 8); i++) {
      const weekReports = reports.slice(i * 7, (i + 1) * 7);
      if (weekReports.length > 0) {
        const avg = weekReports.reduce((sum, r) => sum + r.productivityPercent, 0) / weekReports.length;
        weeklyData.push({
          week: i === 0 ? 'This Week' : i === 1 ? '1 Week Ago' : `${i} Weeks Ago`,
          avg: Math.round(avg),
          days: weekReports.length
        });
      }
    }
    
    autoTable(doc, {
      head: [['Period', 'Avg Productivity', 'Days Tracked']],
      body: weeklyData.map(w => [w.week, `${w.avg}%`, w.days.toString()]),
      startY: yPos,
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246], fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 3 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    // Detailed report table
    doc.setFontSize(14);
    doc.text("Detailed Daily Reports", 14, yPos);
    yPos += 8;
    
    const tableData = reports.map(r => {
      const tasksList = r.tasks.map(t => `${t.title} (${t.weight}%/${t.completionPercent}%)`).join(', ');
      return [
        new Date(r.date).toLocaleDateString(),
        `${Math.round(r.productivityPercent)}%`,
        r.tasks.length.toString(),
        tasksList.length > 50 ? tasksList.substring(0, 47) + '...' : tasksList
      ];
    });
    
    autoTable(doc, {
      head: [['Date', 'Productivity', 'Tasks', 'Task Details (Weight/Completion)']],
      body: tableData,
      startY: yPos,
      theme: 'grid',
      headStyles: { 
        fillColor: [139, 92, 246],
        fontSize: 10,
        fontStyle: 'bold'
      },
      styles: { 
        fontSize: 8,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 'auto' }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });
    
    // Task Performance Summary on new page
    const allTaskTitles = new Set<string>();
    reports.forEach(r => r.tasks.forEach(t => allTaskTitles.add(t.title)));
    
    if (allTaskTitles.size > 0) {
      doc.addPage();
      doc.setFillColor(139, 92, 246);
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text("Task Performance Summary", 105, 18, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      const taskStats = Array.from(allTaskTitles).map(taskTitle => {
        const taskOccurrences = reports.filter(r => r.tasks.some(t => t.title === taskTitle));
        const avgCompletion = taskOccurrences.reduce((sum, r) => {
          const task = r.tasks.find(t => t.title === taskTitle);
          return sum + (task?.completionPercent || 0);
        }, 0) / taskOccurrences.length;
        
        const avgWeight = taskOccurrences.reduce((sum, r) => {
          const task = r.tasks.find(t => t.title === taskTitle);
          return sum + (task?.weight || 0);
        }, 0) / taskOccurrences.length;
        
        return [
          taskTitle,
          taskOccurrences.length.toString(),
          `${Math.round(avgWeight)}%`,
          `${Math.round(avgCompletion)}%`
        ];
      }).sort((a, b) => parseInt(b[3]) - parseInt(a[3]));
      
      autoTable(doc, {
        head: [['Task Name', 'Occurrences', 'Avg Weight', 'Avg Completion']],
        body: taskStats,
        startY: 40,
        theme: 'striped',
        headStyles: { 
          fillColor: [139, 92, 246],
          fontSize: 11,
          fontStyle: 'bold'
        },
        styles: { 
          fontSize: 9,
          cellPadding: 4
        },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center' }
        }
      });
      
      // Productivity Insights
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.text("Productivity Insights", 14, finalY);
      
      const insights: string[] = [];
      if (avgProductivity >= 80) {
        insights.push("Excellent productivity! You're consistently achieving your goals.");
      } else if (avgProductivity >= 60) {
        insights.push("Good productivity! Consider focusing on your lower-performing tasks.");
      } else {
        insights.push("There's room for improvement. Try breaking tasks into smaller chunks.");
      }
      
      if (currentStreak >= 7) {
        insights.push(`Amazing ${currentStreak}-day streak! Keep up the momentum.`);
      } else if (currentStreak >= 3) {
        insights.push(`Nice ${currentStreak}-day streak building. Consistency is key!`);
      }
      
      const topTask = taskStats[0];
      if (topTask) {
        insights.push(`Your best task: "${topTask[0]}" with ${topTask[3]} avg completion.`);
      }
      
      doc.setFontSize(10);
      insights.forEach((insight, idx) => {
        doc.text(`• ${insight}`, 14, finalY + 8 + (idx * 6));
      });
    }
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
        105,
        285,
        { align: 'center' }
      );
    }
    
    doc.save(`glow-productivity-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("Detailed report exported as PDF!");
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
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your preferences</p>
        </div>
        
        {/* Dark Mode Card */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Moon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Appearance</h3>
              <p className="text-sm text-muted-foreground">Customize your theme</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger>
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Light
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Dark
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    System
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Notifications</h3>
              <p className="text-sm text-muted-foreground">Daily reminders via browser & email</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {!browserNotificationsGranted && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  Browser notifications are not enabled. Click below to enable them.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={requestNotificationPermission}
                  className="w-full"
                >
                  Enable Browser Notifications
                </Button>
              </div>
            )}
            
            {browserNotificationsGranted && (
              <div className="p-3 bg-success/10 rounded-lg text-sm text-success flex items-center gap-2">
                <span className="text-lg">✓</span>
                Browser notifications enabled
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Enable Notifications</div>
                <div className="text-xs text-muted-foreground">Turn on/off all reminders</div>
              </div>
              <Switch 
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="morning">Morning Reminder (Plan your day)</Label>
              <Input
                id="morning"
                type="time"
                value={morningTime}
                onChange={(e) => setMorningTime(e.target.value)}
                disabled={!notificationsEnabled}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="evening">Evening Reminder (Log progress)</Label>
              <Input
                id="evening"
                type="time"
                value={eveningTime}
                onChange={(e) => setEveningTime(e.target.value)}
                disabled={!notificationsEnabled}
              />
            </div>
            
            <Button onClick={savePreferences} className="w-full">
              Save Notification Settings
            </Button>
            
            <div className="pt-2 border-t">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleSendTestNotification}
                disabled={sendingTest}
              >
                <Send className="h-4 w-4 mr-2" />
                {sendingTest ? "Sending..." : "Send Test Email Notification"}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Send a test notification to your profile email
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Database className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold">Data</h3>
              <p className="text-xs text-muted-foreground">Export your data</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button variant="outline" className="w-full" onClick={handleExportAll}>
              Export All Data (PDF)
            </Button>
            <p className="text-xs text-muted-foreground">
              Download all your reports as a comprehensive PDF with insights
            </p>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-info/10 flex items-center justify-center">
              <Info className="h-5 w-5 text-info" />
            </div>
            <div>
              <h3 className="font-semibold">About Glow</h3>
              <p className="text-xs text-muted-foreground">App information</p>
            </div>
          </div>
          
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Version 2.0</p>
            <p className="text-xs">Measure. Grow. Glow.</p>
            <p className="text-xs">
              Track your daily productivity with weighted tasks and visual progress tracking.
            </p>
          </div>
        </Card>
      </div>
    </MobileLayout>
  );
};

export default Settings;