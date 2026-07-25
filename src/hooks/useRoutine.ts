import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRoutineDay,
  saveRoutineDay,
  getRoutineTemplate,
  saveRoutineTemplate,
} from "@/lib/routine";
import type { RoutineDay, RoutineTemplate } from "@/types";

export function useRoutineDay(date: string) {
  return useQuery({
    queryKey: ["routine-day", date],
    queryFn: () => getRoutineDay(date),
    enabled: !!date,
  });
}

export function useSaveRoutineDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (day: RoutineDay) => saveRoutineDay(day),
    onMutate: async (day) => {
      await qc.cancelQueries({ queryKey: ["routine-day", day.date] });
      const prev = qc.getQueryData<RoutineDay | null>(["routine-day", day.date]);
      qc.setQueryData(["routine-day", day.date], day);
      return { prev };
    },
    onError: (_e, day, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(["routine-day", day.date], ctx.prev);
    },
    onSettled: (_d, _e, day) => {
      qc.invalidateQueries({ queryKey: ["routine-day", day.date] });
    },
  });
}

export function useRoutineTemplate(dayOfWeek: number) {
  return useQuery({
    queryKey: ["routine-template", dayOfWeek],
    queryFn: () => getRoutineTemplate(dayOfWeek),
    enabled: dayOfWeek >= 0 && dayOfWeek <= 6,
  });
}

export function useSaveRoutineTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tpl: RoutineTemplate) => saveRoutineTemplate(tpl),
    onSuccess: (_d, tpl) => {
      qc.invalidateQueries({ queryKey: ["routine-template", tpl.dayOfWeek] });
    },
  });
}