import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Settings2 } from "lucide-react";
import { RoutineTimeline } from "./RoutineTimeline";
import { useRoutineDay, useSaveRoutineDay } from "@/hooks/useRoutine";
import type { RoutineSegment } from "@/types";

interface RoutineCardProps {
  date: string;
  title?: string;
  showNow?: boolean;
  showEditLink?: boolean;
}

export function RoutineCard({
  date,
  title = "Today's Routine",
  showNow = true,
  showEditLink = true,
}: RoutineCardProps) {
  const { data, isLoading } = useRoutineDay(date);
  const save = useSaveRoutineDay();
  const [segments, setSegments] = useState<RoutineSegment[]>([]);

  useEffect(() => {
    if (data) setSegments(data.segments);
  }, [data]);

  const handleChange = (next: RoutineSegment[]) => {
    setSegments(next);
    save.mutate({ id: data?.id, date, segments: next });
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          {title}
        </h2>
        {showEditLink && (
          <Button asChild variant="ghost" size="sm" className="h-8 gap-1">
            <Link to="/routine">
              <Settings2 className="h-3.5 w-3.5" />
              Weekly
            </Link>
          </Button>
        )}
      </div>
      {isLoading ? (
        <div className="h-14 rounded-lg bg-muted animate-pulse" />
      ) : (
        <RoutineTimeline
          segments={segments}
          onChange={handleChange}
          showNowIndicator={showNow}
        />
      )}
    </Card>
  );
}