import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function usePageTracking() {
  const { user } = useAuth();
  const location = useLocation();
  const pageStartRef = useRef<number>(Date.now());
  const lastPathRef = useRef<string>(location.pathname);

  useEffect(() => {
    if (!user?.id) return;

    const logPageVisit = async (path: string, duration: number) => {
      try {
        await supabase.from('user_activity_logs').insert({
          user_id: user.id,
          activity_type: 'page_visit',
          activity_data: {
            page: path,
            duration_seconds: Math.round(duration / 1000),
            timestamp: new Date().toISOString(),
          },
        });
      } catch (e) {
        // silent fail
      }
    };

    // Log previous page duration on route change
    if (lastPathRef.current !== location.pathname) {
      const duration = Date.now() - pageStartRef.current;
      if (duration > 2000) { // Only log if spent > 2s
        logPageVisit(lastPathRef.current, duration);
      }
      lastPathRef.current = location.pathname;
      pageStartRef.current = Date.now();
    }

    // Log on page unload
    const handleBeforeUnload = () => {
      const duration = Date.now() - pageStartRef.current;
      const data = JSON.stringify({
        user_id: user.id,
        activity_type: 'page_visit',
        activity_data: {
          page: location.pathname,
          duration_seconds: Math.round(duration / 1000),
          last_page: true,
          timestamp: new Date().toISOString(),
        },
      });
      // Use sendBeacon for reliability on unload
      navigator.sendBeacon?.(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_activity_logs`,
        new Blob([data], { type: 'application/json' })
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user?.id, location.pathname]);
}
