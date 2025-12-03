import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reports } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      // Fallback to rule-based suggestions if no AI key
      return new Response(
        JSON.stringify({ suggestions: generateRuleBasedSuggestions(reports) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Analyze this productivity data and give 3-4 actionable suggestions (max 50 words each):
${JSON.stringify(reports.slice(0, 7))}

Focus on: patterns, improvement areas, and encouragement. Be specific and practical.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a productivity coach. Give brief, actionable advice based on data." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ suggestions: generateRuleBasedSuggestions(reports) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse suggestions from AI response
    const suggestions = content
      .split(/\d+\.\s*|\n-\s*|\n•\s*/)
      .filter((s: string) => s.trim().length > 10)
      .slice(0, 4);

    return new Response(
      JSON.stringify({ suggestions: suggestions.length > 0 ? suggestions : generateRuleBasedSuggestions(reports) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI insights error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate insights" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateRuleBasedSuggestions(reports: any[]): string[] {
  const suggestions: string[] = [];
  
  if (reports.length > 0) {
    const avgProductivity = reports.reduce((sum: number, r: any) => sum + r.productivity, 0) / reports.length;
    
    if (avgProductivity < 50) {
      suggestions.push("Consider breaking down large tasks into smaller, more manageable pieces to build momentum.");
    } else if (avgProductivity >= 80) {
      suggestions.push("Excellent productivity! Maintain your current habits and consider mentoring others.");
    }
    
    suggestions.push("Schedule your most important tasks during your peak energy hours for better results.");
    suggestions.push("Take short breaks between tasks to maintain focus and prevent burnout.");
  }
  
  return suggestions;
}
