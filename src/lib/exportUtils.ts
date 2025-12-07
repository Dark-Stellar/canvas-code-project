import type { DailyReport, Task } from "@/types";
import html2canvas from "html2canvas";

export interface ExportStats {
  totalDays: number;
  avgProductivity: number;
  avg7Days: number;
  currentStreak: number;
  bestDay: DailyReport | null;
  todayTasks: Task[];
  todayProductivity: number;
}

export async function exportElementAsPNG(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const canvas = await html2canvas(element, {
    backgroundColor: null,
    scale: 2,
  });
  const link = document.createElement("a");
  link.download = `${filename}-${new Date().toISOString().split("T")[0]}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export async function exportDashboardPDF(
  stats: ExportStats,
  reports: DailyReport[]
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF() as any;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(139, 92, 246);
  doc.rect(0, 0, 210, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text("Glow Dashboard Report", 105, 18, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 28, {
    align: "center",
  });

  doc.setTextColor(0, 0, 0);
  let yPos = 45;

  // Today's Summary
  doc.setFontSize(16);
  doc.text("Today's Summary", 14, yPos);
  yPos += 8;

  const todaySummary = [
    ["Today's Productivity", `${Math.round(stats.todayProductivity)}%`],
    ["Tasks Planned", `${stats.todayTasks.length}`],
    [
      "Tasks Completed",
      `${stats.todayTasks.filter((t) => t.completionPercent === 100).length}`,
    ],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [["Metric", "Value"]],
    body: todaySummary,
    theme: "striped",
    headStyles: { fillColor: [139, 92, 246] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Quick Stats
  doc.setFontSize(16);
  doc.text("Quick Stats", 14, yPos);
  yPos += 8;

  const quickStats = [
    ["All-time Average", `${Math.round(stats.avgProductivity)}%`],
    ["7-Day Average", `${Math.round(stats.avg7Days)}%`],
    ["Current Streak", `${stats.currentStreak} days`],
    ["Total Days Tracked", `${stats.totalDays}`],
  ];

  if (stats.bestDay) {
    quickStats.push([
      "Best Day",
      `${new Date(stats.bestDay.date).toLocaleDateString()} - ${Math.round(
        stats.bestDay.productivityPercent
      )}%`,
    ]);
  }

  autoTable(doc, {
    startY: yPos,
    head: [["Metric", "Value"]],
    body: quickStats,
    theme: "striped",
    headStyles: { fillColor: [236, 72, 153] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Today's Tasks
  if (stats.todayTasks.length > 0) {
    doc.setFontSize(16);
    doc.text("Today's Tasks", 14, yPos);
    yPos += 8;

    const taskData = stats.todayTasks.map((t) => [
      t.title,
      `${t.weight}%`,
      `${t.completionPercent}%`,
      t.completionPercent === 100 ? "✓ Done" : "In Progress",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Task", "Weight", "Completion", "Status"]],
      body: taskData,
      theme: "grid",
      headStyles: { fillColor: [34, 197, 94] },
    });
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Glow - Measure. Grow. Glow. | Page ${i} of ${pageCount}`,
      105,
      285,
      { align: "center" }
    );
  }

  doc.save(`glow-dashboard-${new Date().toISOString().split("T")[0]}.pdf`);
}

export async function exportInsightsPDF(
  weeklySummary: any,
  monthlySummary: any,
  bestPerformingDays: any[],
  topTasks: any[],
  aiSuggestions: string[],
  consistencyScore: number
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF() as any;

  // Header
  doc.setFillColor(139, 92, 246);
  doc.rect(0, 0, 210, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text("Glow Insights Report", 105, 18, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 28, {
    align: "center",
  });

  doc.setTextColor(0, 0, 0);
  let yPos = 45;

  // AI Suggestions
  if (aiSuggestions.length > 0) {
    doc.setFontSize(16);
    doc.text("AI-Powered Suggestions", 14, yPos);
    yPos += 8;

    aiSuggestions.forEach((suggestion, idx) => {
      const lines = doc.splitTextToSize(`${idx + 1}. ${suggestion}`, 180);
      doc.setFontSize(10);
      doc.text(lines, 14, yPos);
      yPos += lines.length * 5 + 4;
    });

    yPos += 8;
  }

  // Weekly Summary
  if (weeklySummary) {
    doc.setFontSize(16);
    doc.text("This Week's Summary", 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [["Metric", "Value"]],
      body: [
        ["Average Productivity", `${Math.round(weeklySummary.avgProductivity)}%`],
        ["Days Tracked", `${weeklySummary.daysTracked}`],
        ["Tasks Completed", `${weeklySummary.completedTasks}`],
        ["Best Day Score", `${Math.round(weeklySummary.bestDay?.productivityPercent || 0)}%`],
      ],
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Monthly Summary
  if (monthlySummary && monthlySummary.daysTracked > 7) {
    doc.setFontSize(16);
    doc.text("Monthly Overview", 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [["Metric", "Value"]],
      body: [
        ["Average Productivity", `${Math.round(monthlySummary.avgProductivity)}%`],
        ["Days Tracked", `${monthlySummary.daysTracked}`],
        ["Total Tasks", `${monthlySummary.totalTasks}`],
        ["Tasks Completed", `${monthlySummary.completedTasks}`],
      ],
      theme: "striped",
      headStyles: { fillColor: [139, 92, 246] },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Best Performing Days
  if (bestPerformingDays.filter((d) => d.count > 0).length > 0) {
    doc.setFontSize(16);
    doc.text("Best Performing Days", 14, yPos);
    yPos += 8;

    const daysData = bestPerformingDays
      .filter((d) => d.count > 0)
      .map((day, idx) => [
        `#${idx + 1}`,
        day.name,
        `${Math.round(day.avg)}%`,
        `${day.count}x`,
      ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Rank", "Day", "Avg Productivity", "Occurrences"]],
      body: daysData,
      theme: "striped",
      headStyles: { fillColor: [34, 197, 94] },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Top Tasks
  if (topTasks.length > 0) {
    doc.setFontSize(16);
    doc.text("Top Performing Tasks", 14, yPos);
    yPos += 8;

    const tasksData = topTasks.map((t) => [
      t.title.length > 30 ? t.title.substring(0, 30) + "..." : t.title,
      `${Math.round(t.avg)}%`,
      `${t.count}x`,
      t.category || "Other",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Task", "Avg Completion", "Occurrences", "Category"]],
      body: tasksData,
      theme: "striped",
      headStyles: { fillColor: [236, 72, 153] },
    });
  }

  // Consistency Score
  doc.addPage();
  doc.setFontSize(16);
  doc.text("Consistency Score", 14, 20);
  doc.setFontSize(12);
  doc.text(`Your consistency score: ${consistencyScore}%`, 14, 30);
  doc.setFontSize(10);
  const scoreText =
    consistencyScore >= 80
      ? "Excellent! You're very consistent."
      : consistencyScore >= 60
      ? "Good consistency. Keep it up!"
      : consistencyScore >= 40
      ? "Try to track more regularly for better insights."
      : "Track daily to build better habits!";
  doc.text(scoreText, 14, 38);

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Glow - Measure. Grow. Glow. | Page ${i} of ${pageCount}`,
      105,
      285,
      { align: "center" }
    );
  }

  doc.save(`glow-insights-${new Date().toISOString().split("T")[0]}.pdf`);
}
