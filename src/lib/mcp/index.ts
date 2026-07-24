import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listRecentReports from "./tools/list-recent-reports";
import getDayReport from "./tools/get-day-report";
import saveDayReport from "./tools/save-day-report";
import getStats from "./tools/get-stats";
import listGoals from "./tools/list-goals";

// Build the OAuth issuer from the Vite-inlined project ref so this entry stays
// import-safe (no runtime env reads at module top level).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "glow-mcp",
  title: "Glow — Daily Productivity",
  version: "0.1.0",
  instructions:
    "Tools for the Glow productivity app. Read and save the signed-in user's daily productivity reports, view stats, and list their goals. All tools act as the authenticated user; per-user data is protected by row-level security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listRecentReports, getDayReport, saveDayReport, getStats, listGoals],
});