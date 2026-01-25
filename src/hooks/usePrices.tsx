import { useState, useEffect, useCallback, useRef } from 'react';
import { TRADING_PAIRS, BINANCE_REST_URL } from '@/lib/constants';

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  lastUpdate: number;
}

type PricesMap = Record<string, PriceData>;

export function usePrices() {
  const [prices, setPrices] = useState<PricesMap>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchInitialPrices = useCallback(async () => {
    try {
      const symbols = TRADING_PAIRS.map(p => `${p.base}${p.quote}`);
      const tickerUrl = `${BINANCE_REST_URL}/ticker/24hr?symbols=${JSON.stringify(symbols)}`;
      
      const response = await fetch(tickerUrl);
      if (!response.ok) throw new Error('Failed to fetch prices');
      
      const data = await response.json();
      
      const pricesMap: PricesMap = {};
      data.forEach((ticker: any) => {
        const pair = TRADING_PAIRS.find(p => `${p.base}${p.quote}` === ticker.symbol);
        if (pair) {
          pricesMap[pair.symbol] = {
            symbol: pair.symbol,
            price: parseFloat(ticker.lastPrice),
            change24h: parseFloat(ticker.priceChangePercent),
            high24h: parseFloat(ticker.highPrice),
            low24h: parseFloat(ticker.lowPrice),
            volume24h: parseFloat(ticker.volume),
            lastUpdate: Date.now(),
          };
        }
      });
      
      setPrices(pricesMap);
      setError(null);
    } catch (err) {
      console.error('Error fetching prices:', err);
      setError('Failed to fetch prices');
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const streams = TRADING_PAIRS
      .map(p => `${p.base.toLowerCase()}${p.quote.toLowerCase()}@ticker`)
      .join('/');
    
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
    
    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const { data } = JSON.parse(event.data);
        const pair = TRADING_PAIRS.find(
          p => `${p.base.toLowerCase()}${p.quote.toLowerCase()}` === data.s.toLowerCase()
        );
        
        if (pair) {
          setPrices(prev => ({
            ...prev,
            [pair.symbol]: {
              symbol: pair.symbol,
              price: parseFloat(data.c),
              change24h: parseFloat(data.P),
              high24h: parseFloat(data.h),
              low24h: parseFloat(data.l),
              volume24h: parseFloat(data.v),
              lastUpdate: Date.now(),
            },
          }));
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onerror = () => {
      setError('WebSocket connection error');
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Attempt to reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 5000);
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    fetchInitialPrices();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [fetchInitialPrices, connectWebSocket]);

  const getPrice = useCallback((symbol: string): PriceData | null => {
    return prices[symbol] || null;
  }, [prices]);

  return {
    prices,
    getPrice,
    isConnected,
    error,
    refetch: fetchInitialPrices,
  };
}
