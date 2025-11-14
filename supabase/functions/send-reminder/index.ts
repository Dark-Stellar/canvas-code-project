import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderEmailRequest {
  email: string;
  type: 'morning' | 'evening';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, type }: ReminderEmailRequest = await req.json();

    const subject = type === 'morning' 
      ? 'Plan Your Day - Glow Reminder' 
      : 'Log Your Progress - Glow Reminder';
    
    const message = type === 'morning'
      ? 'Good morning! Time to plan your day. Set your tasks and weights for today.'
      : 'Good evening! Time to log your progress. Update your task completion for today.';

    const emailResponse = await resend.emails.send({
      from: "Glow <onboarding@resend.dev>",
      to: [email],
      subject: subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8B5CF6; text-align: center;">Glow</h1>
          <p style="font-size: 14px; color: #6B7280; text-align: center;">Measure. Grow. Glow.</p>
          
          <div style="background: linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%); padding: 40px; border-radius: 12px; margin: 20px 0;">
            <h2 style="color: white; margin: 0 0 10px 0;">${subject}</h2>
            <p style="color: white; margin: 0; font-size: 16px;">${message}</p>
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${Deno.env.get('VITE_SUPABASE_URL')?.replace('supabase.co', 'lovable.app') || 'https://glow.lovable.app'}" 
               style="background-color: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
              Open Glow
            </a>
          </div>
          
          <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin-top: 40px;">
            You're receiving this because you have notifications enabled in Glow.
          </p>
        </div>
      `,
    });

    console.log("Reminder email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending reminder email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
