import { useEffect, useState } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Database, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getAllDailyReports } from "@/lib/storage";
import { scheduleNotifications } from "@/lib/notifications";

const Settings = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [morningTime, setMorningTime] = useState("09:00");
  const [eveningTime, setEveningTime] = useState("21:00");
  const [loading, setLoading] = useState(true);
  const [browserNotificationsGranted, setBrowserNotificationsGranted] = useState(false);
  
  useEffect(() => {
    loadPreferences();
    checkNotificationPermission();
  }, []);
  
  async function checkNotificationPermission() {
    if ('Notification' in window) {
      setBrowserNotificationsGranted(Notification.permission === 'granted');
    }
  }
  
  async function requestNotificationPermission() {
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
  }
  
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
  
  async function handleExportAll() {
    const reports = await getAllDailyReports();
    
    if (reports.length === 0) {
      toast.error("No data to export");
      return;
    }
    
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const doc = new jsPDF() as any;
    
    doc.setFontSize(20);
    doc.text("Glow - All Reports", 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Total Days: ${reports.length}`, 14, 32);
    const avgProductivity = reports.reduce((sum, r) => sum + r.productivityPercent, 0) / reports.length;
    doc.text(`Average Productivity: ${Math.round(avgProductivity)}%`, 14, 40);
    
    const tableData = reports.map(r => [
      r.date,
      `${Math.round(r.productivityPercent)}%`,
      r.tasks.length.toString(),
    ]);
    
    autoTable(doc, {
      head: [['Date', 'Productivity', 'Tasks']],
      body: tableData,
      startY: 50,
    });
    
    doc.save(`glow-all-reports-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("All data exported as PDF!");
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
        
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Notifications</h3>
              <p className="text-sm text-muted-foreground">Daily reminders</p>
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
              Download all your reports as a comprehensive PDF
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
            <p>Version 1.0.0</p>
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
