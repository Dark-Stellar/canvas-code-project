import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllDailyReports, getDailyReport, getDraftTasks } from "@/lib/storage";
import type { DailyReport, Task } from "@/types";

export const REPORTS_KEY = ["daily-reports", "all"] as const;
export const dayReportKey = (date: string) => ["daily-report", date] as const;
export const draftTasksKey = (date: string) => ["draft-tasks", date] as const;

export function useAllReports() {
  return useQuery<DailyReport[]>({
    queryKey: REPORTS_KEY,
    queryFn: async () => {
      const reports = await getAllDailyReports();
      return reports.sort((a, b) => b.date.localeCompare(a.date));
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useDayReport(date: string | undefined) {
  return useQuery<DailyReport | undefined>({
    queryKey: dayReportKey(date ?? ""),
    queryFn: () => (date ? getDailyReport(date) : Promise.resolve(undefined)),
    enabled: !!date,
    staleTime: 60_000,
  });
}

export function useDraftTasks(date: string | undefined) {
  return useQuery<Task[] | undefined>({
    queryKey: draftTasksKey(date ?? ""),
    queryFn: () => (date ? getDraftTasks(date) : Promise.resolve(undefined)),
    enabled: !!date,
    staleTime: 60_000,
  });
}

export function useInvalidateReports() {
  const qc = useQueryClient();
  return (date?: string) => {
    qc.invalidateQueries({ queryKey: REPORTS_KEY });
    if (date) {
      qc.invalidateQueries({ queryKey: dayReportKey(date) });
      qc.invalidateQueries({ queryKey: draftTasksKey(date) });
    }
  };
}