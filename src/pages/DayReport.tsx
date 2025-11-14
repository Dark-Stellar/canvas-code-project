import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Download, Plus } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { ProgressRing } from "@/components/ProgressRing";
import { TaskRow } from "@/components/TaskRow";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getDailyReport, getDraftTasks, saveDailyReport, calculateProductivity, clearDraftTasks } from "@/lib/storage";
import { formatDisplayDate } from "@/lib/dates";
import type { Task, DailyReport } from "@/types";
import { toast } from "sonner";

const DayReport = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (date) {
      loadDay();
    }
  }, [date]);
  
  async function loadDay() {
    if (!date) return;
    
    const report = await getDailyReport(date);
    
    if (report) {
      setTasks(report.tasks);
      setNotes(report.notes || "");
      setReportId(report.id);
    } else {
      const draft = await getDraftTasks(date);
      if (draft) {
        setTasks(draft);
      }
    }
    
    setLoading(false);
  }
  
  function updateTask(id: string, updated: Task) {
    setTasks(tasks.map(t => t.id === id ? updated : t));
  }
  
  function deleteTask(id: string) {
    setTasks(tasks.filter(t => t.id !== id));
  }
  
  function addTask() {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: "New Task",
      weight: 0,
      completionPercent: 0,
      createdAt: new Date().toISOString(),
    };
    setTasks([...tasks, newTask]);
  }
  
  async function saveReport() {
    if (!date) return;
    
    // Validate notes length
    if (notes && notes.length > 5000) {
      toast.error("Notes must be less than 5000 characters");
      return;
    }

    // Validate tasks
    for (const task of tasks) {
      if (!task.title.trim() || task.title.length > 200) {
        toast.error("Task titles must be 1-200 characters");
        return;
      }
      
      if (task.completionPercent < 0 || task.completionPercent > 100) {
        toast.error("Completion must be between 0 and 100%");
        return;
      }
    }
    
    const productivity = calculateProductivity(tasks);
    
    const report: DailyReport = {
      id: reportId || crypto.randomUUID(),
      date,
      tasks,
      productivityPercent: productivity,
      notes,
      createdAt: new Date().toISOString(),
      version: 1,
    };
    
    await saveDailyReport(report);
    await clearDraftTasks(date);
    setReportId(report.id);
    toast.success("Progress saved!");
  }
  
  async function exportData() {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const productivity = calculateProductivity(tasks);
    const doc = new jsPDF() as any;
    
    doc.setFontSize(20);
    doc.text("Glow Daily Report", 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Date: ${date && formatDisplayDate(new Date(date))}`, 14, 32);
    doc.text(`Productivity: ${Math.round(productivity)}%`, 14, 40);
    
    const tableData = tasks.map(t => [
      t.title,
      `${t.weight}%`,
      `${t.completionPercent}%`,
    ]);
    
    autoTable(doc, {
      head: [['Task', 'Weight', 'Completion']],
      body: tableData,
      startY: 50,
    });
    
    if (notes) {
      const finalY = (doc as any).lastAutoTable.finalY || 50;
      doc.text("Notes:", 14, finalY + 10);
      doc.setFontSize(10);
      const splitNotes = doc.splitTextToSize(notes, 180);
      doc.text(splitNotes, 14, finalY + 18);
    }
    
    doc.save(`glow-report-${date}.pdf`);
    toast.success("PDF exported!");
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
  
  if (!tasks.length) {
    return (
      <MobileLayout>
        <div className="container max-w-2xl mx-auto p-4 space-y-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold">{date && formatDisplayDate(new Date(date))}</h1>
            <p className="text-sm text-muted-foreground">No tasks yet - add your first task</p>
          </div>
          
          <Card className="p-6 text-center space-y-4">
            <p className="text-muted-foreground">Start planning your day</p>
            <Button onClick={addTask}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </Card>
        </div>
      </MobileLayout>
    );
  }
  
  const productivity = calculateProductivity(tasks);
  const totalWeight = tasks.reduce((sum, t) => sum + t.weight, 0);
  const isValidWeight = Math.abs(totalWeight - 100) < 0.1;
  
  return (
    <MobileLayout>
      <div className="container max-w-2xl mx-auto p-4 space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="text-center">
          <h1 className="text-2xl font-bold">{date && formatDisplayDate(new Date(date))}</h1>
          <p className="text-sm text-muted-foreground">Edit progress anytime</p>
        </div>
        
        {!isValidWeight && tasks.length > 0 && (
          <Card className="p-3 bg-destructive/10 border-destructive/20">
            <p className="text-sm text-destructive text-center">
              ⚠️ Total weight is {totalWeight.toFixed(1)}% (should be 100%)
            </p>
          </Card>
        )}
        
        <div className="flex justify-center py-4">
          <ProgressRing progress={isValidWeight ? productivity : 0} />
        </div>
        
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onUpdate={(updated) => updateTask(task.id, updated)}
              onDelete={() => deleteTask(task.id)}
              locked={false}
            />
          ))}
          
          <Button onClick={addTask} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
        
        <Card className="p-4">
          <label className="text-sm font-medium mb-2 block">Notes</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about your day..."
            rows={4}
          />
        </Card>
        
        <div className="flex gap-2 pb-8">
          <Button onClick={saveReport} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Save Progress
          </Button>
          <Button onClick={exportData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default DayReport;
