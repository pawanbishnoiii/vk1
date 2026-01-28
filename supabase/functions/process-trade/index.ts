import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessTradeRequest {
  tradeId: string;
  userId: string;
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

    const { tradeId, userId }: ProcessTradeRequest = await req.json();

    if (!tradeId || !userId) {
      throw new Error("Missing tradeId or userId");
    }

    // Get the trade
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
        JSON.stringify({ message: "Trade already processed", status: trade.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if trade timer has expired
    const endTime = trade.end_time 
      ? new Date(trade.end_time).getTime()
      : new Date(trade.timer_started_at).getTime() + (trade.duration_seconds || 30) * 1000;
    
    const now = Date.now();
    
    if (now < endTime) {
      // Trade not yet expired, calculate remaining time
      const remaining = Math.ceil((endTime - now) / 1000);
      return new Response(
        JSON.stringify({ message: "Trade still active", remaining, endTime }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark trade as processing
    await supabaseAdmin
      .from("trades")
      .update({ processing_status: "processing" })
      .eq("id", tradeId);

    // Get platform settings for win rate and profit percentages
    const { data: settings } = await supabaseAdmin
      .from("platform_settings")
      .select("key, value");

    const globalWinRate = settings?.find(s => s.key === "global_win_rate")?.value || 45;
    const profitPercent = Number(settings?.find(s => s.key === "profit_percentage")?.value) || 80;
    const lossPercent = Number(settings?.find(s => s.key === "loss_percentage")?.value) || 100;

    // Determine result
    let won = false;
    if (trade.expected_result === "win") {
      won = true;
    } else if (trade.expected_result === "loss") {
      won = false;
    } else {
      // Use global win rate
      won = Math.random() * 100 < Number(globalWinRate);
    }

    // Calculate profit/loss using dynamic percentages
    const amount = Number(trade.amount);
    const profitPercentage = trade.profit_percentage || profitPercent;
    const lossPercentage = lossPercent;
    const profitLoss = won ? amount * (profitPercentage / 100) : -(amount * (lossPercentage / 100));

    // Get current wallet balance
    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("balance, locked_balance")
      .eq("user_id", userId)
      .single();

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const currentBalance = Number(wallet.balance);
    const newBalance = won ? currentBalance + profitLoss : currentBalance - amount;

    // Update trade
    await supabaseAdmin
      .from("trades")
      .update({
        status: won ? "won" : "lost",
        profit_loss: profitLoss,
        exit_price: Number(trade.entry_price) * (won ? 1.01 : 0.99),
        closed_at: new Date().toISOString(),
        processing_status: "completed",
      })
      .eq("id", tradeId);

    // Update wallet - unlock and adjust balance
    await supabaseAdmin
      .from("wallets")
      .update({
        balance: newBalance,
        locked_balance: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    // Create transaction record
    await supabaseAdmin.from("transactions").insert({
      user_id: userId,
      type: won ? "trade_win" : "trade_loss",
      amount: profitLoss,
      balance_before: currentBalance,
      balance_after: newBalance,
      reference_id: tradeId,
      description: `${trade.trade_type.toUpperCase()} ${trade.trading_pair} - ${won ? "Won" : "Lost"}`,
    });

    // Create notification
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: won ? "🎉 Trade Won!" : "📉 Trade Lost",
      message: won
        ? `You won ₹${Math.abs(profitLoss).toLocaleString("en-IN")} on ${trade.trading_pair}!`
        : `You lost ₹${Math.abs(profitLoss).toLocaleString("en-IN")} on ${trade.trading_pair}`,
      type: "trade_result",
      metadata: { tradeId, won, profitLoss },
    });

    // Send email notification
    try {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("user_id", userId)
        .single();

      if (profile?.email) {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-email`, {
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
              appUrl: "https://vk1.lovable.app",
            },
          }),
        });
      }
    } catch (emailError) {
      console.error("Email notification failed:", emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        won,
        profitLoss,
        newBalance,
        tradeId,
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