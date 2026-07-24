import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function client(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const TaskSchema = z.object({
  title: z.string(),
  weight: z.number(),
  completionPercent: z.number(),
  category: z.string().optional(),
  note: z.string().optional(),
});

export default defineTool({
  name: "save_day_report",
  title: "Save a daily report",
  description: "Create or update the signed-in user's daily report for a date. Computes productivity as sum(weight*completionPercent)/100.",
  inputSchema: {
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Local date in YYYY-MM-DD."),
    tasks: z.array(TaskSchema).min(1).describe("Task entries with weight (0-100) and completionPercent (0-100)."),
    notes: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ date, tasks, notes }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const productivity = Math.round(
      tasks.reduce((sum, t) => sum + (t.weight * t.completionPercent) / 100, 0) * 100,
    ) / 100;

    const supa = client(ctx);
    const { data, error } = await supa
      .from("daily_reports")
      .upsert(
        {
          user_id: ctx.getUserId(),
          date,
          tasks: tasks as unknown as object,
          notes: notes ?? null,
          productivity_percent: productivity,
        },
        { onConflict: "user_id,date" },
      )
      .select()
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Saved ${date} — productivity ${productivity}%.` }],
      structuredContent: { report: data, productivity_percent: productivity },
    };
  },
});