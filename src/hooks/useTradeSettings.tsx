import { useSettings } from './useSettings';

interface TradeSettings {
  is_trading_enabled: boolean;
  min_trade_amount: number;
  max_trade_amount: number;
  default_profit_percentage: number;
  auto_mode: boolean;
}

export function useTradeSettings() {
  const { settings, isLoading, updateSettings, isUpdating } = useSettings();

  // Map platform settings to trade settings
  const tradeSettings: TradeSettings = {
    is_trading_enabled: true, // Can be added to platform_settings
    min_trade_amount: settings?.min_deposit || 10,
    max_trade_amount: settings?.max_deposit || 100000,
    default_profit_percentage: 80,
    auto_mode: true,
  };

  return {
    tradeSettings,
    isLoading,
    updateSettings: (updates: Partial<TradeSettings>) => {
      // Map back to platform settings format
      updateSettings({
        min_deposit: updates.min_trade_amount,
        max_deposit: updates.max_trade_amount,
      });
    },
    isUpdating,
  };
}