import { useMemo, useState } from "react";
import { Plus, Pencil, CheckCircle2, Circle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TASK_CATEGORIES, type RoutineSegment } from "@/types";
import {
  categoryColor,
  categoryHue,
  minutesToTime,
  timeToMinutes,
  hasOverlap,
  routineDayProductivity,
} from "@/lib/routine";

interface RoutineTimelineProps {
  segments: RoutineSegment[];
  onChange: (next: RoutineSegment[]) => void;
  showNowIndicator?: boolean;
  readOnly?: boolean;
  compact?: boolean;
}

const HOUR_MARKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

function emptySegment(startMin = 480): RoutineSegment {
  return {
    id: crypto.randomUUID(),
    startMin,
    endMin: Math.min(startMin + 60, 1440),
    title: "New segment",
    category: "Work",
    completed: false,
  };
}

export function RoutineTimeline({
  segments,
  onChange,
  showNowIndicator,
  readOnly,
  compact,
}: RoutineTimelineProps) {
  const [editing, setEditing] = useState<RoutineSegment | null>(null);
  const [isNew, setIsNew] = useState(false);

  const nowPercent = useMemo(() => {
    const d = new Date();
    return ((d.getHours() * 60 + d.getMinutes()) / 1440) * 100;
  }, []);

  const productivity = routineDayProductivity(segments);
  const scheduledMinutes = segments.reduce(
    (sum, s) => sum + Math.max(0, s.endMin - s.startMin),
    0
  );
  const coveragePercent = Math.round((scheduledMinutes / 1440) * 100);

  const toggleSegment = (id: string) => {
    if (readOnly) return;
    onChange(
      segments.map((s) =>
        s.id === id ? { ...s, completed: !s.completed } : s
      )
    );
  };

  const openEdit = (seg: RoutineSegment) => {
    setEditing({ ...seg });
    setIsNew(false);
  };

  const openNew = () => {
    // Find earliest gap of 60 min
    const sorted = [...segments].sort((a, b) => a.startMin - b.startMin);
    let start = 480;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].startMin >= start + 60) break;
      start = Math.max(start, sorted[i].endMin);
    }
    setEditing(emptySegment(Math.min(start, 1380)));
    setIsNew(true);
  };

  const commitEdit = () => {
    if (!editing) return;
    if (!editing.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (editing.endMin <= editing.startMin) {
      toast.error("End time must be after start time");
      return;
    }
    const others = segments.filter((s) => s.id !== editing.id);
    if (hasOverlap(others, editing)) {
      toast.error("Overlaps another segment");
      return;
    }
    if (isNew) {
      onChange([...segments, editing]);
    } else {
      onChange(segments.map((s) => (s.id === editing.id ? editing : s)));
    }
    setEditing(null);
  };

  const deleteSegment = () => {
    if (!editing) return;
    onChange(segments.filter((s) => s.id !== editing.id));
    setEditing(null);
  };

  const barHeight = compact ? "h-8" : "h-14";

  return (
    <div className="space-y-3">
      {/* Header row */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="font-semibold text-primary">{productivity}%</span>
            <span className="text-muted-foreground"> routine done</span>
            <span className="text-muted-foreground"> · {coveragePercent}% of day scheduled</span>
          </div>
          {!readOnly && (
            <Button size="sm" variant="outline" onClick={openNew} className="h-8">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="relative w-full">
        <div
          className={cn(
            "relative w-full rounded-lg bg-muted/40 overflow-hidden border border-border",
            barHeight
          )}
        >
          {segments.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              No segments yet — add your first block
            </div>
          )}
          {segments.map((s) => {
            const left = (s.startMin / 1440) * 100;
            const width = ((s.endMin - s.startMin) / 1440) * 100;
            const hue = categoryHue(s.category);
            const bg = s.completed
              ? `hsl(${hue} 75% 55%)`
              : `hsl(${hue} 60% 55% / 0.28)`;
            const border = `hsl(${hue} 65% 50%)`;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSegment(s.id)}
                onDoubleClick={() => !readOnly && openEdit(s)}
                title={`${s.title} · ${minutesToTime(s.startMin)}–${minutesToTime(s.endMin)}`}
                className={cn(
                  "absolute top-0 bottom-0 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary",
                  "hover:brightness-110",
                  s.completed &&
                    "shadow-[0_0_12px_hsl(var(--primary)/0.55)] animate-scale-in"
                )}
                style={{
                  left: `${left}%`,
                  width: `${Math.max(width, 0.6)}%`,
                  background: bg,
                  borderLeft: `2px solid ${border}`,
                }}
              >
                {!compact && width > 5 && (
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-foreground/90 truncate px-1">
                    {s.title}
                  </span>
                )}
              </button>
            );
          })}
          {showNowIndicator && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
              style={{ left: `${nowPercent}%` }}
            >
              <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
            </div>
          )}
        </div>

        {/* Hour ticks */}
        <div className="relative w-full mt-1 h-4">
          {HOUR_MARKS.map((h) => (
            <span
              key={h}
              className="absolute text-[10px] text-muted-foreground -translate-x-1/2"
              style={{ left: `${(h / 24) * 100}%` }}
            >
              {h}h
            </span>
          ))}
        </div>
      </div>

      {/* Segment list */}
      {!compact && segments.length > 0 && (
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {[...segments]
            .sort((a, b) => a.startMin - b.startMin)
            .map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border"
              >
                <button
                  onClick={() => toggleSegment(s.id)}
                  disabled={readOnly}
                  className="flex-shrink-0"
                  aria-label={s.completed ? "Mark not done" : "Mark done"}
                >
                  {s.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                <div
                  className="w-2 h-8 rounded-sm flex-shrink-0"
                  style={{ background: categoryColor(s.category) }}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "text-sm font-medium truncate",
                      s.completed && "line-through text-muted-foreground"
                    )}
                  >
                    {s.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {minutesToTime(s.startMin)} – {minutesToTime(s.endMin)}
                    {s.category ? ` · ${s.category}` : ""}
                  </div>
                </div>
                {!readOnly && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => openEdit(s)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Editor dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isNew ? "Add segment" : "Edit segment"}</DialogTitle>
            <DialogDescription>
              Choose the task, category and time range for this block.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="seg-title">Title</Label>
                <Input
                  id="seg-title"
                  value={editing.title}
                  onChange={(e) =>
                    setEditing({ ...editing, title: e.target.value })
                  }
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={editing.category || "Other"}
                  onValueChange={(v) => setEditing({ ...editing, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="seg-start">Start</Label>
                  <Input
                    id="seg-start"
                    type="time"
                    value={minutesToTime(editing.startMin)}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        startMin: timeToMinutes(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="seg-end">End</Label>
                  <Input
                    id="seg-end"
                    type="time"
                    value={minutesToTime(editing.endMin)}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        endMin: timeToMinutes(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            {!isNew ? (
              <Button variant="destructive" size="sm" onClick={deleteSegment}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={commitEdit}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}