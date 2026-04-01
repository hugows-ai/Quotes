import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UsageLimits {
  plan: string;
  subscriptionStatus: string;
  storageUsedBytes: number;
  storageLimitBytes: number | null;
  aiUsesToday: number;
  aiDailyLimit: number | null;
  canUseAi: boolean;
  hasStorageCapacity: boolean;
  subscriptionEnd: string | null;
  loading: boolean;
}

export function useUsageLimits() {
  const { user, session } = useAuth();
  const [limits, setLimits] = useState<UsageLimits>({
    plan: 'free',
    subscriptionStatus: 'inactive',
    storageUsedBytes: 0,
    storageLimitBytes: 524288000,
    aiUsesToday: 0,
    aiDailyLimit: 5,
    canUseAi: true,
    hasStorageCapacity: true,
    subscriptionEnd: null,
    loading: false,
  });

  const refresh = useCallback(async () => {
    if (!user || !session) return;
    setLimits(prev => ({ ...prev, loading: true }));
    try {
      const { data, error } = await supabase.rpc('get_my_usage_summary');
      if (error) throw error;
      if (data && data.length > 0) {
        const row = data[0];
        setLimits({
          plan: row.plan || 'free',
          subscriptionStatus: row.subscription_status || 'inactive',
          storageUsedBytes: Number(row.storage_used_bytes) || 0,
          storageLimitBytes: row.storage_limit_bytes != null ? Number(row.storage_limit_bytes) : null,
          aiUsesToday: row.ai_uses_today || 0,
          aiDailyLimit: row.ai_daily_limit,
          canUseAi: row.can_use_ai ?? true,
          hasStorageCapacity: row.has_storage_capacity ?? true,
          subscriptionEnd: row.subscription_end || null,
          loading: false,
        });
      }
    } catch (err) {
      console.error('Usage limits error:', err);
      setLimits(prev => ({ ...prev, loading: false }));
    }
  }, [user, session]);

  const trackAiUsage = useCallback(async (feature = 'assistant') => {
    if (!user) return;
    await supabase.from('ai_usage_events').insert({
      user_id: user.id,
      feature,
    });
    refresh();
  }, [user, refresh]);

  useEffect(() => {
    if (user && session) {
      refresh();
      const interval = setInterval(refresh, 60000);
      return () => clearInterval(interval);
    }
  }, [user, session, refresh]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return { ...limits, refresh, trackAiUsage, formatBytes };
}
