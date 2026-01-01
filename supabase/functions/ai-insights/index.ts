import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.log("No authorization header provided");
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log("Authentication failed:", authError?.message || "No user found");
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    const { reports, type = "suggestions", chatMessage } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.log("No Lovable AI API key found, using rule-based suggestions");
      return new Response(
        JSON.stringify({ 
          suggestions: generateRuleBasedSuggestions(reports),
          analysis: generateRuleBasedAnalysis(reports)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let systemPrompt = "You are an expert productivity coach with deep knowledge of time management, habit formation, and peak performance. You provide actionable, data-driven advice. Always be encouraging but honest.";
    let userPrompt = "";
    let tools: any[] | undefined;
    let toolChoice: any | undefined;
    
    if (type === "chat") {
      userPrompt = `Based on this productivity data from the last 14 days:
${JSON.stringify(reports.slice(0, 14), null, 2)}

User question: ${chatMessage}

Provide a helpful, personalized response focused on their productivity. Be specific and reference their actual data when relevant.`;
    } else if (type === "deep-analysis") {
      tools = [{
        type: "function",
        function: {
          name: "provide_deep_analysis",
          description: "Provide a comprehensive productivity analysis with recommendations",
          parameters: {
            type: "object",
            properties: {
              analysis: { 
                type: "string",
                description: "2-3 sentence comprehensive analysis of patterns and trends"
              },
              recommendations: {
                type: "array",
                items: { type: "string" },
                description: "Top 3 specific, actionable recommendations"
              },
              motivation: {
                type: "string",
                description: "One motivational insight based on their progress"
              }
            },
            required: ["analysis", "recommendations", "motivation"],
            additionalProperties: false
          }
        }
      }];
      toolChoice = { type: "function", function: { name: "provide_deep_analysis" } };
      
      userPrompt = `Analyze this detailed productivity data and provide insights:
${JSON.stringify(reports.slice(0, 14), null, 2)}`;
    } else if (type === "weekly-review") {
      tools = [{
        type: "function",
        function: {
          name: "provide_weekly_review",
          description: "Provide a weekly productivity review summary",
          parameters: {
            type: "object",
            properties: {
              grade: { 
                type: "string",
                description: "Overall performance grade (A+, A, A-, B+, B, B-, C+, C, C-, D, F)"
              },
              achievement: {
                type: "string",
                description: "Key achievement or strength from this week (1-2 sentences)"
              },
              improvement: {
                type: "string",
                description: "Main area that needs improvement (1-2 sentences)"
              },
              actionItem: {
                type: "string",
                description: "Specific action item for next week (1-2 sentences)"
              }
            },
            required: ["grade", "achievement", "improvement", "actionItem"],
            additionalProperties: false
          }
        }
      }];
      toolChoice = { type: "function", function: { name: "provide_weekly_review" } };
      
      userPrompt = `Create a weekly productivity review based on this data:
${JSON.stringify(reports.slice(0, 7), null, 2)}`;
    } else {
      // Quick tips / suggestions
      tools = [{
        type: "function",
        function: {
          name: "provide_suggestions",
          description: "Provide actionable productivity suggestions",
          parameters: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: { type: "string" },
                description: "4-5 specific, actionable productivity tips (max 50 words each)"
              }
            },
            required: ["suggestions"],
            additionalProperties: false
          }
        }
      }];
      toolChoice = { type: "function", function: { name: "provide_suggestions" } };
      
      userPrompt = `Analyze this productivity data and provide personalized suggestions:
${JSON.stringify(reports.slice(0, 7), null, 2)}

Focus on:
- Specific patterns you notice
- Tasks that need attention
- Optimal scheduling insights
- Encouragement based on actual progress`;
    }

    console.log(`Generating ${type} insights with Lovable AI...`);

    const requestBody: any = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
    };

    if (tools) {
      requestBody.tools = tools;
      requestBody.tool_choice = toolChoice;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "Payment required, please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ 
          suggestions: generateRuleBasedSuggestions(reports),
          analysis: generateRuleBasedAnalysis(reports)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI response received");

    // Handle chat responses (no tool calling)
    if (type === "chat") {
      const content = data.choices?.[0]?.message?.content || "I'm here to help with your productivity questions!";
      return new Response(
        JSON.stringify({ response: content }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle tool call responses
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        console.log("Parsed tool call result:", JSON.stringify(args).substring(0, 200));
        return new Response(
          JSON.stringify(args),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }

    // Fallback to content parsing
    const content = data.choices?.[0]?.message?.content || "";
    
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

    // Parse suggestions from text as last resort
    const suggestions = content
      .split(/\d+\.\s*|\n-\s*|\n•\s*|\n\*\s*/)
      .filter((s: string) => s.trim().length > 15)
      .map((s: string) => s.trim().replace(/^\s*[\-\•\*]\s*/, ''))
      .slice(0, 5);

    console.log("AI suggestions generated:", suggestions.length);

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
  
  const allTasks = reports.flatMap((r: any) => r.tasks || []);
  const lowCompletionTasks = allTasks.filter((t: any) => t.completion < 50);
  
  if (lowCompletionTasks.length > allTasks.length * 0.3) {
    suggestions.push("Many tasks have low completion rates. Try breaking them into smaller, more achievable sub-tasks.");
  }
  
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
