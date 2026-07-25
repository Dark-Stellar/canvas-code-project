import { useEffect, useState } from "react";
import { Clock, Save, Copy } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { PageHeader } from "@/components/PageHeader";
import { RoutineTimeline } from "@/components/RoutineTimeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useRoutineTemplate, useSaveRoutineTemplate } from "@/hooks/useRoutine";
import type { RoutineSegment } from "@/types";
import { toast } from "sonner";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const Routine = () => {
  const [day, setDay] = useState<number>(new Date().getDay());
  const { data, isLoading } = useRoutineTemplate(day);
  const save = useSaveRoutineTemplate();
  const [segments, setSegments] = useState<RoutineSegment[]>([]);

  useEffect(() => {
    setSegments(data?.segments || []);
  }, [data, day]);

  const handleSave = async () => {
    try {
      await save.mutateAsync({ id: data?.id, dayOfWeek: day, segments });
      toast.success(`Saved routine for ${DAYS[day]}`);
    } catch {
      toast.error("Failed to save routine");
    }
  };

  const copyToAll = async () => {
    try {
      await Promise.all(
        [0, 1, 2, 3, 4, 5, 6].map((d) =>
          save.mutateAsync({ dayOfWeek: d, segments })
        )
      );
      toast.success("Applied to every weekday");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <MobileLayout>
      <div className="container max-w-2xl mx-auto p-4 space-y-4">
        <PageHeader
          title="Weekly Routine"
          subtitle="Design your 24h × 7 day plan"
          icon={Clock}
        />

        <Tabs value={String(day)} onValueChange={(v) => setDay(Number(v))}>
          <TabsList className="grid grid-cols-7 h-9">
            {DAYS.map((d, i) => (
              <TabsTrigger key={i} value={String(i)} className="text-xs px-1">
                {d}
              </TabsTrigger>
            ))}
          </TabsList>
          {DAYS.map((_, i) => (
            <TabsContent key={i} value={String(i)} className="mt-4">
              <Card className="p-4">
                {isLoading ? (
                  <div className="h-14 rounded-lg bg-muted animate-pulse" />
                ) : (
                  <RoutineTimeline
                    segments={segments}
                    onChange={setSegments}
                  />
                )}
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex gap-2 pb-8">
          <Button onClick={handleSave} className="flex-1">
            <Save className="h-4 w-4 mr-2" /> Save {DAYS[day]}
          </Button>
          <Button variant="outline" onClick={copyToAll}>
            <Copy className="h-4 w-4 mr-2" /> Apply to all days
          </Button>
        </div>

        <p className="text-xs text-muted-foreground pb-16">
          Tap a segment on any date to mark it done. Edit routines here to set
          your default plan for each weekday — future dates pick this up
          automatically.
        </p>
      </div>
    </MobileLayout>
  );
};

export default Routine;