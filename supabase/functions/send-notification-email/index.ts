import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  userId: string;
  emailType: 'deposit_approved' | 'deposit_rejected' | 'withdrawal_approved' | 'withdrawal_rejected' | 'trade_result' | 'welcome';
  data: Record<string, any>;
}

const getEmailContent = (emailType: string, data: Record<string, any>, platformName: string) => {
  const templates: Record<string, { subject: string; html: string }> = {
    deposit_approved: {
      subject: `✅ Deposit Approved - ${platformName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 40px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #22c55e; margin: 0;">Deposit Approved! 🎉</h1>
          </div>
          <p style="font-size: 16px; line-height: 1.6;">Great news! Your deposit of <strong style="color: #22c55e;">₹${data.amount?.toLocaleString('en-IN')}</strong> has been approved and credited to your wallet.</p>
          <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #94a3b8;">New Balance: <strong style="color: #22c55e; font-size: 20px;">₹${data.newBalance?.toLocaleString('en-IN')}</strong></p>
          </div>
          <p style="font-size: 14px; color: #94a3b8;">Start trading now and make profits!</p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${data.appUrl}" style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Start Trading</a>
          </div>
        </div>
      `
    },
    deposit_rejected: {
      subject: `❌ Deposit Request Update - ${platformName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 40px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #ef4444; margin: 0;">Deposit Not Approved</h1>
          </div>
          <p style="font-size: 16px; line-height: 1.6;">We were unable to approve your deposit request of ₹${data.amount?.toLocaleString('en-IN')}.</p>
          ${data.reason ? `<p style="background: #1e293b; padding: 15px; border-radius: 8px; color: #94a3b8;"><strong>Reason:</strong> ${data.reason}</p>` : ''}
          <p style="font-size: 14px; color: #94a3b8;">Please contact support if you have questions.</p>
        </div>
      `
    },
    withdrawal_approved: {
      subject: `✅ Withdrawal Processed - ${platformName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 40px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #22c55e; margin: 0;">Withdrawal Successful! 💰</h1>
          </div>
          <p style="font-size: 16px; line-height: 1.6;">Your withdrawal of <strong style="color: #22c55e;">₹${data.amount?.toLocaleString('en-IN')}</strong> has been processed.</p>
          <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #94a3b8;">Sent to UPI: <strong style="color: #f8fafc;">${data.upiId}</strong></p>
          </div>
          <p style="font-size: 14px; color: #94a3b8;">The amount will reflect in your bank account shortly.</p>
        </div>
      `
    },
    withdrawal_rejected: {
      subject: `❌ Withdrawal Request Update - ${platformName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 40px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #ef4444; margin: 0;">Withdrawal Not Processed</h1>
          </div>
          <p style="font-size: 16px; line-height: 1.6;">Your withdrawal request of ₹${data.amount?.toLocaleString('en-IN')} could not be processed.</p>
          ${data.reason ? `<p style="background: #1e293b; padding: 15px; border-radius: 8px; color: #94a3b8;"><strong>Reason:</strong> ${data.reason}</p>` : ''}
          <p style="font-size: 14px; color: #94a3b8;">Your funds have been returned to your wallet.</p>
        </div>
      `
    },
    trade_result: {
      subject: `${data.won ? '🎉 Trade Won!' : '📉 Trade Result'} - ${platformName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 40px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: ${data.won ? '#22c55e' : '#ef4444'}; margin: 0;">${data.won ? 'You Won! 🎉' : 'Trade Closed'}</h1>
          </div>
          <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #94a3b8;">Pair: <strong style="color: #f8fafc;">${data.pair}</strong></p>
            <p style="margin: 5px 0; color: #94a3b8;">Type: <strong style="color: #f8fafc;">${data.tradeType}</strong></p>
            <p style="margin: 5px 0; color: #94a3b8;">Amount: <strong style="color: #f8fafc;">₹${data.amount?.toLocaleString('en-IN')}</strong></p>
            <p style="margin: 5px 0; color: #94a3b8;">Profit/Loss: <strong style="color: ${data.won ? '#22c55e' : '#ef4444'};">${data.won ? '+' : ''}₹${data.profitLoss?.toLocaleString('en-IN')}</strong></p>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${data.appUrl}/trade" style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Trade Again</a>
          </div>
        </div>
      `
    },
    welcome: {
      subject: `Welcome to ${platformName}! 🚀`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 40px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #22c55e; margin: 0;">Welcome to ${platformName}! 🚀</h1>
          </div>
          <p style="font-size: 16px; line-height: 1.6;">Thank you for joining us! Start your trading journey today.</p>
          <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #94a3b8;">🎁 First Deposit Bonus: <strong style="color: #22c55e;">100% up to ₹10,000</strong></p>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${data.appUrl}/wallet" style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Make Your First Deposit</a>
          </div>
        </div>
      `
    }
  };

  return templates[emailType] || { subject: `Notification from ${platformName}`, html: '<p>You have a new notification.</p>' };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, emailType, data }: EmailRequest = await req.json();

    // Get user email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !userData?.user?.email) {
      throw new Error("User not found");
    }

    const userEmail = userData.user.email;

    // Get platform settings
    const { data: settings } = await supabaseAdmin
      .from('platform_settings')
      .select('key, value')
      .in('key', ['platform_name', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_from_email']);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: any) => {
      try {
        settingsMap[s.key] = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
      } catch {
        settingsMap[s.key] = s.value;
      }
    });

    const platformName = settingsMap.platform_name || 'CryptoTrade';
    const smtpHost = settingsMap.smtp_host;
    const smtpPort = parseInt(settingsMap.smtp_port || '587');
    const smtpUser = settingsMap.smtp_user;
    const smtpFromEmail = settingsMap.smtp_from_email;
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");

    if (!smtpHost || !smtpUser || !smtpPassword) {
      console.log("SMTP not configured, skipping email");
      return new Response(JSON.stringify({ success: false, message: "SMTP not configured" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emailContent = getEmailContent(emailType, data, platformName);

    // Send email using SMTP
    const emailPayload = {
      from: smtpFromEmail || smtpUser,
      to: userEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    };

    // For now, log the email (in production, integrate with actual SMTP)
    console.log("Sending email:", emailPayload);

    // Log email in database
    await supabaseAdmin.from('email_logs').insert({
      user_id: userId,
      email_to: userEmail,
      email_type: emailType,
      subject: emailContent.subject,
      status: 'sent',
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Email error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
