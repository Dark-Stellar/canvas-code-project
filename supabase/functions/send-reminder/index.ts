import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderEmailRequest {
  email: string;
  type: 'morning' | 'evening' | 'test';
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send-reminder function called at:", new Date().toISOString());
  console.log("Request method:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if RESEND_API_KEY is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured. Please add RESEND_API_KEY in secrets." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);

    // Verify authenticated user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized - no authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase environment variables not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Authentication failed:", authError?.message || "No user found");
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Authenticated user:", user.id);

    const body = await req.json();
    const { email, type }: ReminderEmailRequest = body;
    
    console.log(`Processing ${type} reminder for email: ${email}`);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      console.error("Invalid email format:", email);
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate type parameter
    const allowedTypes = ['morning', 'evening', 'test'];
    if (!type || !allowedTypes.includes(type)) {
      console.error("Invalid reminder type:", type);
      return new Response(
        JSON.stringify({ error: "Invalid reminder type. Must be: morning, evening, or test" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the email belongs to the authenticated user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error("Failed to fetch user profile:", profileError.message);
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userEmail = profile?.email || user.email;
    
    if (userEmail !== email) {
      console.error("Email mismatch - user attempted to send to different address");
      console.error("User email:", userEmail, "Requested email:", email);
      return new Response(
        JSON.stringify({ error: "Cannot send emails to addresses you don't own" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let subject: string;
    let message: string;
    
    switch (type) {
      case 'morning':
        subject = 'Plan Your Day - Glow Reminder';
        message = 'Good morning! Time to plan your day. Set your tasks and weights for today.';
        break;
      case 'evening':
        subject = 'Log Your Progress - Glow Reminder';
        message = 'Good evening! Time to log your progress. Update your task completion for today.';
        break;
      case 'test':
        subject = 'Test Notification - Glow';
        message = 'This is a test notification from Glow. Your email notifications are working correctly!';
        break;
      default:
        subject = 'Glow Reminder';
        message = 'You have a reminder from Glow.';
    }

    console.log(`Sending ${type} email to ${email}...`);

    const emailResponse = await resend.emails.send({
      from: "Glow <onboarding@resend.dev>",
      to: [email],
      subject: subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #8B5CF6; margin: 0; font-size: 32px;">Glow</h1>
            <p style="font-size: 14px; color: #6B7280; margin: 5px 0 0 0;">Measure. Grow. Glow.</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%); padding: 40px; border-radius: 16px; margin: 20px 0;">
            <h2 style="color: white; margin: 0 0 15px 0; font-size: 24px;">${subject}</h2>
            <p style="color: white; margin: 0; font-size: 16px; line-height: 1.6;">${message}</p>
          </div>
          
          ${type !== 'test' ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://glow.lovable.app'}" 
               style="background-color: #8B5CF6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
              Open Glow
            </a>
          </div>
          ` : `
          <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #F3F4F6; border-radius: 8px;">
            <p style="color: #22C55E; font-weight: 600; margin: 0;">✓ Email notifications are working!</p>
            <p style="color: #6B7280; font-size: 14px; margin: 10px 0 0 0;">You will receive morning and evening reminders at your scheduled times.</p>
          </div>
          `}
          
          <div style="border-top: 1px solid #E5E7EB; margin-top: 30px; padding-top: 20px;">
            <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin: 0;">
              You're receiving this because you have notifications enabled in Glow.<br/>
              Track your daily productivity with Glow.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", JSON.stringify(emailResponse));

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-reminder function:", error.message || error);
    console.error("Error stack:", error.stack);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
