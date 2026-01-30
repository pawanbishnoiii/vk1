import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessTradeRequest {
  tradeId: string;
  userId: string;
  forceResult?: 'win' | 'loss';
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { tradeId, userId, forceResult }: ProcessTradeRequest = await req.json();

    if (!tradeId || !userId) {
      throw new Error("Missing tradeId or userId");
    }

    const settlementId = crypto.randomUUID();

    // Get the trade with lock check
    const { data: trade, error: tradeError } = await supabaseAdmin
      .from("trades")
      .select("*")
      .eq("id", tradeId)
      .single();

    if (tradeError || !trade) {
      throw new Error("Trade not found");
    }

    // Check if trade is still pending
    if (trade.status !== "pending") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Trade already processed", 
          status: trade.status,
          profitLoss: trade.profit_loss
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already being processed
    if (trade.processing_status === 'processing' || trade.settlement_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Trade is being processed or already settled"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For non-forced trades, check if timer has expired
    if (!forceResult) {
      const endTime = trade.end_time 
        ? new Date(trade.end_time).getTime()
        : new Date(trade.timer_started_at).getTime() + (trade.duration_seconds || 30) * 1000;
      
      const now = Date.now();
      
      if (now < endTime) {
        const remaining = Math.ceil((endTime - now) / 1000);
        return new Response(
          JSON.stringify({ message: "Trade still active", remaining, endTime }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Mark trade as processing (optimistic lock)
    const { error: lockError } = await supabaseAdmin
      .from("trades")
      .update({ processing_status: "processing" })
      .eq("id", tradeId)
      .eq("processing_status", "pending");

    if (lockError) {
      console.error("Lock error:", lockError);
      throw new Error("Failed to acquire processing lock");
    }

    // Get platform settings
    const { data: settings } = await supabaseAdmin
      .from("platform_settings")
      .select("key, value");

    const globalWinRate = settings?.find(s => s.key === "global_win_rate")?.value || 45;
    const profitPercent = Number(settings?.find(s => s.key === "profit_percentage")?.value) || 80;
    const lossPercent = Number(settings?.find(s => s.key === "loss_percentage")?.value) || 100;

    // Determine result
    let won = false;
    if (forceResult) {
      won = forceResult === 'win';
    } else if (trade.expected_result === "win") {
      won = true;
    } else if (trade.expected_result === "loss") {
      won = false;
    } else {
      won = Math.random() * 100 < Number(globalWinRate);
    }

    // Calculate profit/loss
    const amount = Number(trade.amount);
    const profitPercentage = trade.profit_percentage || profitPercent;
    const lossPercentage = lossPercent;
    const profitLoss = won ? amount * (profitPercentage / 100) : -(amount * (lossPercentage / 100));
    const exitPrice = Number(trade.entry_price) * (won ? 1.01 : 0.99);

    // Use atomic settlement function
    const { data: settlementResult, error: settlementError } = await supabaseAdmin
      .rpc('settle_trade', {
        p_trade_id: tradeId,
        p_user_id: userId,
        p_won: won,
        p_profit_loss: profitLoss,
        p_exit_price: exitPrice,
        p_settlement_id: settlementId
      });

    if (settlementError) {
      console.error("Settlement error:", settlementError);
      await supabaseAdmin
        .from("trades")
        .update({ processing_status: "pending" })
        .eq("id", tradeId);
      throw new Error("Settlement failed: " + settlementError.message);
    }

    if (!settlementResult?.success) {
      console.log("Settlement already done:", settlementResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: settlementResult?.error || "Settlement failed",
          status: settlementResult?.status
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update wagering progress for active bonuses (non-blocking)
    try {
      await supabaseAdmin.rpc('update_wagering_progress', {
        p_user_id: userId,
        p_trade_amount: amount
      });
    } catch (wagerError) {
      console.error("Wagering update error:", wagerError);
    }

    // Send email notification (non-blocking)
    try {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("user_id", userId)
        .single();

      if (profile?.email) {
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            to: profile.email,
            type: "trade_result",
            data: {
              won,
              pair: trade.trading_pair,
              tradeType: trade.trade_type,
              amount: trade.amount,
              profitLoss,
              appUrl: Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || "https://app.lovable.dev",
            },
          }),
        }).catch(e => console.error("Email send error:", e));
      }
    } catch (emailError) {
      console.error("Email notification failed:", emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        won,
        profitLoss,
        newBalance: settlementResult.newBalance,
        tradeId,
        settlementId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Process trade error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
