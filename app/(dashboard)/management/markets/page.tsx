'use client';

import { useEffect, useState, useCallback } from 'react';
import { atsApi } from '@/lib/ats-api';
import {
  Globe,
  Loader2,
  Clock,
  DollarSign,
} from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { usePermissions } from "@/contexts/permissions-context";
import { useRouter } from "next/navigation";

interface MarketSegment {
  id: string;
  name: string;
  code: string;
  description?: string;
  defaultCurrency: string;
  defaultTimezone: string;
  defaultShift: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
  isActive: boolean;
  sortOrder?: number;
}

export default function MarketsManagementPage() {
  const router = useRouter();
  const { hasPermission, loading: permsLoading, profile } = usePermissions();
  
  const [markets, setMarkets] = useState<MarketSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState('');

  const isSuperAdmin = profile?.roles?.includes("SUPER_ADMIN") || hasPermission("platform:manage");

  const fetchMarkets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await atsApi.marketSegments.list();
      setMarkets(data.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0)));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch market segments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!permsLoading) {
      if (!isSuperAdmin) {
        router.push("/dashboard");
      } else {
        fetchMarkets();
      }
    }
  }, [fetchMarkets, permsLoading, isSuperAdmin, router]);

  const toggleStatus = async (market: MarketSegment) => {
    try {
      setToggling(market.id);
      await atsApi.marketSegments.update(market.id, { isActive: !market.isActive });
      setMarkets((prev) =>
        prev.map((m) => (m.id === market.id ? { ...m, isActive: !market.isActive } : m))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update market status');
    } finally {
      setToggling(null);
    }
  };

  if (permsLoading || loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Globe className="h-6 w-6 text-indigo-600" /> Market Segments
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Standard platform market segments. Enable or disable markets globally to control which markets are available for Tenant Admins when creating Business Units.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-100 font-medium">
          {error}
        </div>
      )}

      {/* MARKETS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {markets.map((segment) => (
          <div
            key={segment.id}
            className={`bg-white dark:bg-slate-900 border ${
              segment.isActive 
                ? 'border-indigo-100 dark:border-indigo-900/50 shadow-sm' 
                : 'border-neutral-200 dark:border-slate-800 opacity-60 grayscale-[0.5]'
            } rounded-xl overflow-hidden transition-all duration-200`}
          >
            <div className={`px-5 py-4 border-b ${segment.isActive ? 'border-indigo-50 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-900/10' : 'border-neutral-100 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-850'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white text-lg flex items-center gap-2">
                    {segment.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-semibold px-2 py-0.5 bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-300 rounded">
                      {segment.code}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                      {segment.isActive ? 'Enabled' : 'Disabled'}
                    </span>
                    {toggling === segment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                    ) : (
                      <Switch 
                        checked={segment.isActive} 
                        onCheckedChange={() => toggleStatus(segment)} 
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Currency
                  </span>
                  <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    {segment.defaultCurrency || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Timezone
                  </span>
                  <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 truncate" title={segment.defaultTimezone}>
                    {segment.defaultTimezone || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="bg-neutral-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-neutral-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Default Shift
                  </span>
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    {segment.defaultShift || 'N/A'}
                  </span>
                </div>
                {(segment.defaultStartTime || segment.defaultEndTime) && (
                  <div className="mt-1 text-xs text-neutral-500 font-medium text-right">
                    {segment.defaultStartTime} - {segment.defaultEndTime}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
