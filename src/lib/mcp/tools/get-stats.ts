import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function client(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_productivity_stats",
  title: "Get productivity stats",
  description: "Summary stats for the signed-in user: average productivity over the last N days, best/worst days, day count.",
  inputSchema: {
    days: z.number().int().min(1).max(365).optional().describe("Lookback window in days (default 30)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const n = days ?? 30;
    const { data, error } = await client(ctx)
      .from("daily_reports")
      .select("date, productivity_percent")
      .eq("user_id", ctx.getUserId())
      .order("date", { ascending: false })
      .limit(n);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = data ?? [];
    if (rows.length === 0) {
      return { content: [{ type: "text", text: "No reports yet." }], structuredContent: { count: 0 } };
    }
    const avg = rows.reduce((s, r) => s + Number(r.productivity_percent ?? 0), 0) / rows.length;
    const best = rows.reduce((a, b) => (Number(b.productivity_percent) > Number(a.productivity_percent) ? b : a));
    const worst = rows.reduce((a, b) => (Number(b.productivity_percent) < Number(a.productivity_percent) ? b : a));
    const summary = {
      window_days: n,
      count: rows.length,
      average_productivity_percent: Math.round(avg * 100) / 100,
      best_day: best,
      worst_day: worst,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary) }],
      structuredContent: summary,
    };
  },
});