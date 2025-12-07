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
    const { reports, type = "suggestions" } = await req.json();
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    
    if (!GOOGLE_AI_API_KEY) {
      console.log("No Google AI API key found, using rule-based suggestions");
      return new Response(
        JSON.stringify({ 
          suggestions: generateRuleBasedSuggestions(reports),
          analysis: generateRuleBasedAnalysis(reports)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let prompt = "";
    
    if (type === "deep-analysis") {
      prompt = `You are an expert productivity coach. Analyze this detailed productivity data and provide:
1. A comprehensive analysis of patterns and trends (2-3 sentences)
2. Top 3 specific, actionable recommendations
3. One motivational insight based on their progress

Data (last 14 days):
${JSON.stringify(reports.slice(0, 14), null, 2)}

Format your response as JSON:
{
  "analysis": "Your analysis here",
  "recommendations": ["rec1", "rec2", "rec3"],
  "motivation": "Your motivational message"
}`;
    } else if (type === "task-optimization") {
      prompt = `Analyze these task completion patterns and suggest optimal task scheduling:
${JSON.stringify(reports.slice(0, 7), null, 2)}

Provide 3 specific suggestions for better task prioritization and timing. Keep each under 40 words.
Format as JSON array: ["suggestion1", "suggestion2", "suggestion3"]`;
    } else if (type === "weekly-review") {
      prompt = `Create a weekly productivity review summary based on this data:
${JSON.stringify(reports.slice(0, 7), null, 2)}

Include:
1. Overall performance grade (A-F)
2. Key achievement
3. Area for improvement
4. Action item for next week

Format as JSON:
{
  "grade": "B+",
  "achievement": "...",
  "improvement": "...",
  "actionItem": "..."
}`;
    } else {
      prompt = `Analyze this productivity data and give 4-5 actionable, personalized suggestions (max 50 words each):
${JSON.stringify(reports.slice(0, 7))}

Focus on: 
- Specific patterns you notice
- Tasks that need attention
- Optimal scheduling insights
- Encouragement based on actual progress

Be specific, practical, and reference actual data points.`;
    }

    console.log(`Generating ${type} insights with Google AI...`);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are an expert productivity coach with deep knowledge of time management, habit formation, and peak performance. Provide actionable, data-driven advice.\n\n${prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google AI API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ 
          suggestions: generateRuleBasedSuggestions(reports),
          analysis: generateRuleBasedAnalysis(reports)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    console.log("AI response received:", content.substring(0, 200));

    // Try to parse as JSON first
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        if (Array.isArray(parsed)) {
          return new Response(
            JSON.stringify({ suggestions: parsed }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        return new Response(
          JSON.stringify(parsed),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (e) {
      console.log("Could not parse as JSON, extracting suggestions");
    }

    // Parse suggestions from text
    const suggestions = content
      .split(/\d+\.\s*|\n-\s*|\n•\s*|\n\*\s*/)
      .filter((s: string) => s.trim().length > 15)
      .map((s: string) => s.trim().replace(/^\s*[\-\•\*]\s*/, ''))
      .slice(0, 5);

    console.log("AI suggestions generated successfully:", suggestions.length);

    return new Response(
      JSON.stringify({ 
        suggestions: suggestions.length > 0 ? suggestions : generateRuleBasedSuggestions(reports) 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI insights error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate insights", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateRuleBasedSuggestions(reports: any[]): string[] {
  const suggestions: string[] = [];
  
  if (!reports || reports.length === 0) {
    return [
      "Start tracking your daily productivity to unlock personalized insights.",
      "Set up 3-4 key tasks each day and track their completion to build momentum.",
      "Consistency is key - try to log your progress at the same time each day."
    ];
  }
  
  const avgProductivity = reports.reduce((sum: number, r: any) => sum + (r.productivity || 0), 0) / reports.length;
  
  // Productivity-based suggestions
  if (avgProductivity < 40) {
    suggestions.push("Focus on completing just 2-3 essential tasks each day. Start small and build momentum gradually.");
    suggestions.push("Try the 'two-minute rule' - if a task takes less than 2 minutes, do it immediately.");
  } else if (avgProductivity < 60) {
    suggestions.push("You're making progress! Try scheduling your most important tasks during your peak energy hours.");
    suggestions.push("Consider using time-blocking to dedicate focused periods to challenging tasks.");
  } else if (avgProductivity < 80) {
    suggestions.push("Great productivity! To reach the next level, try batching similar tasks together.");
    suggestions.push("Review your completed tasks to identify which ones had the highest impact.");
  } else {
    suggestions.push("Excellent performance! Make sure to take breaks to maintain this high level of productivity.");
    suggestions.push("Consider mentoring others or documenting your productivity strategies.");
  }
  
  // Pattern-based suggestions
  if (reports.length >= 7) {
    const weekdays = reports.filter((r: any) => {
      const day = new Date(r.date).getDay();
      return day !== 0 && day !== 6;
    });
    const weekends = reports.filter((r: any) => {
      const day = new Date(r.date).getDay();
      return day === 0 || day === 6;
    });
    
    if (weekdays.length > 0 && weekends.length > 0) {
      const weekdayAvg = weekdays.reduce((sum: number, r: any) => sum + (r.productivity || 0), 0) / weekdays.length;
      const weekendAvg = weekends.reduce((sum: number, r: any) => sum + (r.productivity || 0), 0) / weekends.length;
      
      if (weekdayAvg > weekendAvg + 20) {
        suggestions.push("Your weekend productivity is lower than weekdays. Consider planning lighter tasks or using weekends for review and planning.");
      } else if (weekendAvg > weekdayAvg + 20) {
        suggestions.push("You're more productive on weekends! Try to identify what's different and apply those conditions to weekdays.");
      }
    }
  }
  
  // Task-based suggestions
  const allTasks = reports.flatMap((r: any) => r.tasks || []);
  const lowCompletionTasks = allTasks.filter((t: any) => t.completion < 50);
  
  if (lowCompletionTasks.length > allTasks.length * 0.3) {
    suggestions.push("Many tasks have low completion rates. Try breaking them into smaller, more achievable sub-tasks.");
  }
  
  // Consistency suggestion
  if (reports.length < 7) {
    suggestions.push("Track your productivity for at least 7 days to unlock more detailed pattern analysis and insights.");
  }
  
  return suggestions.slice(0, 5);
}

function generateRuleBasedAnalysis(reports: any[]): string {
  if (!reports || reports.length === 0) {
    return "Start tracking to receive personalized productivity analysis.";
  }
  
  const avgProductivity = reports.reduce((sum: number, r: any) => sum + (r.productivity || 0), 0) / reports.length;
  const recentAvg = reports.slice(0, 3).reduce((sum: number, r: any) => sum + (r.productivity || 0), 0) / Math.min(3, reports.length);
  
  let analysis = `Your average productivity is ${Math.round(avgProductivity)}%. `;
  
  if (recentAvg > avgProductivity + 5) {
    analysis += "You've been improving recently - great momentum! ";
  } else if (recentAvg < avgProductivity - 5) {
    analysis += "There's been a slight dip recently. Consider reviewing your workload or energy levels. ";
  }
  
  if (reports.length >= 7) {
    analysis += `You've tracked ${reports.length} days so far, giving you solid data for patterns.`;
  } else {
    analysis += "Keep tracking to build a more complete picture of your productivity patterns.";
  }
  
  return analysis;
}
