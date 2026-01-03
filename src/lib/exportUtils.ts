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
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(139, 92, 246);
  doc.rect(0, 0, 210, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text("Glow Insights Report", 105, 18, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 28, {
    align: "center",
  });

  doc.setTextColor(0, 0, 0);
  let yPos = 45;

  // AI Suggestions
  if (aiSuggestions.length > 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("AI-Powered Suggestions", 14, yPos);
    doc.setFont("helvetica", "normal");
    yPos += 8;

    aiSuggestions.forEach((suggestion, idx) => {
      const lines = doc.splitTextToSize(`${idx + 1}. ${suggestion}`, 180);
      doc.setFontSize(10);
      doc.text(lines, 14, yPos);
      yPos += lines.length * 5 + 4;
    });

    yPos += 6;
  }

  // Weekly Summary with mini bar chart
  if (weeklySummary) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("This Week's Summary", 14, yPos);
    doc.setFont("helvetica", "normal");
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

  // Performance by Day - Bar Chart Visualization
  if (bestPerformingDays.filter((d) => d.count > 0).length > 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Performance by Day", 14, yPos);
    doc.setFont("helvetica", "normal");
    yPos += 10;

    // Draw bar chart
    const chartWidth = 170;
    const chartHeight = 50;
    const chartX = 20;
    const chartY = yPos;
    const barWidth = chartWidth / 7 - 4;
    const maxValue = 100;

    // Draw chart background
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(chartX, chartY + chartHeight, chartX + chartWidth, chartY + chartHeight);

    // Draw bars
    bestPerformingDays.forEach((day, idx) => {
      const barHeight = (day.avg / maxValue) * chartHeight;
      const x = chartX + idx * (barWidth + 4);
      
      // Bar color based on performance
      if (day.avg >= 70) doc.setFillColor(34, 197, 94);
      else if (day.avg >= 50) doc.setFillColor(250, 204, 21);
      else doc.setFillColor(239, 68, 68);
      
      if (day.count > 0) {
        doc.rect(x, chartY + chartHeight - barHeight, barWidth, barHeight, "F");
      }
      
      // Day label
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(day.shortName, x + barWidth / 2, chartY + chartHeight + 8, { align: "center" });
      
      // Value label
      if (day.count > 0) {
        doc.setTextColor(0, 0, 0);
        doc.text(`${Math.round(day.avg)}%`, x + barWidth / 2, chartY + chartHeight - barHeight - 3, { align: "center" });
      }
    });

    doc.setTextColor(0, 0, 0);
    yPos = chartY + chartHeight + 18;

    // Table with details
    const daysData = bestPerformingDays
      .filter((d) => d.count > 0)
      .sort((a, b) => b.avg - a.avg)
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

  // Monthly Summary with trend visualization
  if (monthlySummary && monthlySummary.daysTracked > 7) {
    // Check if we need a new page
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Monthly Overview", 14, yPos);
    doc.setFont("helvetica", "normal");
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

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Weekly trend line chart
    if (monthlySummary.weeks && monthlySummary.weeks.length > 1) {
      doc.setFontSize(10);
      doc.text("Weekly Trend:", 14, yPos);
      yPos += 6;

      const lineChartWidth = 160;
      const lineChartHeight = 35;
      const lineChartX = 25;
      const lineChartY = yPos;
      const weekCount = monthlySummary.weeks.length;
      const pointSpacing = lineChartWidth / (weekCount - 1);

      // Draw axis
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.line(lineChartX, lineChartY + lineChartHeight, lineChartX + lineChartWidth, lineChartY + lineChartHeight);

      // Draw line and points
      doc.setDrawColor(139, 92, 246);
      doc.setLineWidth(1.5);
      const points: { x: number; y: number }[] = [];
      
      monthlySummary.weeks.forEach((weekAvg: number, idx: number) => {
        const x = lineChartX + idx * pointSpacing;
        const y = lineChartY + lineChartHeight - (weekAvg / 100) * lineChartHeight;
        points.push({ x, y });
      });

      // Draw connecting lines
      for (let i = 0; i < points.length - 1; i++) {
        doc.line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
      }

      // Draw points and labels
      doc.setFillColor(139, 92, 246);
      points.forEach((point, idx) => {
        doc.circle(point.x, point.y, 2, "F");
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`W${idx + 1}`, point.x, lineChartY + lineChartHeight + 6, { align: "center" });
        doc.setTextColor(0, 0, 0);
        doc.text(`${Math.round(monthlySummary.weeks[idx])}%`, point.x, point.y - 4, { align: "center" });
      });

      doc.setTextColor(0, 0, 0);
      yPos = lineChartY + lineChartHeight + 15;
    }
  }

  // Top Tasks with horizontal bar chart
  if (topTasks.length > 0) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Top Performing Tasks", 14, yPos);
    doc.setFont("helvetica", "normal");
    yPos += 10;

    // Horizontal bar chart
    const barChartX = 60;
    const barChartWidth = 100;
    const barHeight = 8;
    const barSpacing = 14;

    topTasks.slice(0, 5).forEach((task, idx) => {
      const taskName = task.title.length > 20 ? task.title.substring(0, 20) + "..." : task.title;
      const barWidth = (task.avg / 100) * barChartWidth;
      
      // Task name
      doc.setFontSize(9);
      doc.text(taskName, 14, yPos + barHeight / 2 + 2);
      
      // Bar background
      doc.setFillColor(230, 230, 230);
      doc.rect(barChartX, yPos, barChartWidth, barHeight, "F");
      
      // Bar fill
      if (task.avg >= 80) doc.setFillColor(34, 197, 94);
      else if (task.avg >= 60) doc.setFillColor(59, 130, 246);
      else doc.setFillColor(250, 204, 21);
      doc.rect(barChartX, yPos, barWidth, barHeight, "F");
      
      // Percentage
      doc.text(`${Math.round(task.avg)}%`, barChartX + barChartWidth + 5, yPos + barHeight / 2 + 2);
      
      yPos += barSpacing;
    });

    yPos += 5;

    // Table details
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

  // Consistency Score with visual gauge
  doc.addPage();
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Consistency Score", 14, 20);
  doc.setFont("helvetica", "normal");
  
  // Draw gauge
  const gaugeX = 105;
  const gaugeY = 55;
  const gaugeRadius = 30;
  
  // Background arc
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(8);
  doc.arc(gaugeX, gaugeY, gaugeRadius, -0.1, 3.24, "S");
  
  // Progress arc
  if (consistencyScore >= 80) doc.setDrawColor(34, 197, 94);
  else if (consistencyScore >= 60) doc.setDrawColor(59, 130, 246);
  else if (consistencyScore >= 40) doc.setDrawColor(250, 204, 21);
  else doc.setDrawColor(239, 68, 68);
  
  const progressAngle = Math.PI + (consistencyScore / 100) * Math.PI;
  doc.arc(gaugeX, gaugeY, gaugeRadius, Math.PI, progressAngle, "S");
  
  // Score text
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(`${consistencyScore}%`, gaugeX, gaugeY + 5, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const scoreText =
    consistencyScore >= 80
      ? "Excellent! You're very consistent."
      : consistencyScore >= 60
      ? "Good consistency. Keep it up!"
      : consistencyScore >= 40
      ? "Try to track more regularly for better insights."
      : "Track daily to build better habits!";
  doc.text(scoreText, gaugeX, gaugeY + 18, { align: "center" });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Glow v2.5 - Measure. Grow. Glow. | Page ${i} of ${pageCount}`,
      105,
      285,
      { align: "center" }
    );
  }

  doc.save(`glow-insights-${new Date().toISOString().split("T")[0]}.pdf`);
}
