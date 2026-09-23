'use client';

import { useEffect, useState, useCallback } from 'react';
import { atsApi } from '@/lib/ats-api';
import {
  Globe,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Clock,
  DollarSign,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
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
  sortOrder: number;
  _count?: { businessUnits: number };
}

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const CURRENCIES = [
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'INR', label: 'Indian Rupee (INR)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'AUD', label: 'Australian Dollar (AUD)' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)' },
  { code: 'SGD', label: 'Singapore Dollar (SGD)' },
  { code: 'AED', label: 'UAE Dirham (AED)' },
];

// ─── Blank form state ─────────────────────────────────────────────────────────
const BLANK_FORM = {
  name: '',
  code: '',
  description: '',
  defaultCurrency: 'USD',
  defaultTimezone: 'America/New_York',
  defaultShift: 'US Shift',
  defaultStartTime: '09:00',
  defaultEndTime: '18:00',
  isActive: true,
  sortOrder: 0,
};

// ─── Modal ───────────────────────────────────────────────────────────────────
function MarketModal({
  segment,
  onClose,
  onSaved,
}: {
  segment: MarketSegment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!segment;
  const [form, setForm] = useState(
    segment
      ? {
          name: segment.name,
          code: segment.code,
          description: segment.description ?? '',
          defaultCurrency: segment.defaultCurrency,
          defaultTimezone: segment.defaultTimezone,
          defaultShift: segment.defaultShift,
          defaultStartTime: segment.defaultStartTime ?? '09:00',
          defaultEndTime: segment.defaultEndTime ?? '18:00',
          isActive: segment.isActive,
          sortOrder: segment.sortOrder,
        }
      : { ...BLANK_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit && segment) {
        await atsApi.marketSegments.update(segment.id, form);
      } else {
        await atsApi.marketSegments.create(form);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save market segment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Globe className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isEdit ? 'Edit Market Segment' : 'Create Market Segment'}
              </h2>
              <p className="text-xs text-gray-500">
                {isEdit ? `Editing ${segment?.name}` : 'Define a new market for your branch units'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Market Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. US IT Staffing, Domestic India, Middle East…"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Market Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={20}
                placeholder="e.g. USIT, DOM, ME"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <p className="text-xs text-gray-400 mt-1">Used in job codes (e.g. BLR-USIT-260922-1001)</p>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Currency</label>
              <select
                value={form.defaultCurrency}
                onChange={(e) => setForm({ ...form, defaultCurrency: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Timezone */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Timezone</label>
              <select
                value={form.defaultTimezone}
                onChange={(e) => setForm({ ...form, defaultTimezone: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            {/* Shift */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Shift Name</label>
              <input
                type="text"
                placeholder="e.g. US Shift, General Shift"
                value={form.defaultShift}
                onChange={(e) => setForm({ ...form, defaultShift: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* Work Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Start Time</label>
              <input
                type="time"
                value={form.defaultStartTime}
                onChange={(e) => setForm({ ...form, defaultStartTime: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work End Time</label>
              <input
                type="time"
                value={form.defaultEndTime}
                onChange={(e) => setForm({ ...form, defaultEndTime: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={2}
                placeholder="Optional notes about this market segment…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              />
            </div>

            {/* Active toggle */}
            <div className="col-span-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, isActive: !form.isActive })}
                className="flex items-center gap-2 text-sm font-medium"
              >
                {form.isActive ? (
                  <ToggleRight className="w-6 h-6 text-indigo-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-gray-400" />
                )}
                <span className={form.isActive ? 'text-indigo-700' : 'text-gray-500'}>
                  {form.isActive ? 'Active' : 'Inactive'}
                </span>
              </button>
              <span className="text-xs text-gray-400">Inactive segments won't appear in unit creation forms</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isEdit ? 'Save Changes' : 'Create Market'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MarketsPage() {
  const [segments, setSegments] = useState<MarketSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editSegment, setEditSegment] = useState<MarketSegment | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MarketSegment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await atsApi.marketSegments.list();
      setSegments(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const user = atsApi.auth.getCurrentUser();
    setIsGlobalAdmin(!!user?.permissions?.includes('tenant:settings'));
  }, [load]);

  const openCreate = () => {
    setEditSegment(null);
    setModalOpen(true);
  };

  const openEdit = (seg: MarketSegment) => {
    setEditSegment(seg);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await atsApi.marketSegments.delete(deleteConfirm.id);
      setDeleteConfirm(null);
      load();
    } catch (err: any) {
      setDeleteError(err?.message ?? 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const totalActive = segments.filter((s) => s.isActive).length;
  const totalUnits = segments.reduce((sum, s) => sum + (s._count?.businessUnits ?? 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Market Segments</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Define markets for branch units. Each unit must be assigned to a market.
          </p>
        </div>
        {isGlobalAdmin && (<button onClick={openCreate} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"><Plus className="w-4 h-4" />New Market</button>)}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Markets', value: segments.length, icon: Globe, color: 'indigo' },
          { label: 'Active Markets', value: totalActive, icon: ToggleRight, color: 'green' },
          { label: 'Units Assigned', value: totalUnits, icon: DollarSign, color: 'amber' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl bg-${kpi.color}-50 flex items-center justify-center`}>
              <kpi.icon className={`w-5 h-5 text-${kpi.color}-600`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-xs text-gray-500">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
        ) : segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Globe className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">No market segments yet</p>
            <p className="text-xs mt-1">Create your first market to start assigning units</p>
            {isGlobalAdmin && (<button onClick={openCreate} className="mt-4 flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"><Plus className="w-4 h-4" /> Create Market</button>)}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left font-medium text-gray-500 px-5 py-3">Market</th>
                <th className="text-left font-medium text-gray-500 px-5 py-3">Code</th>
                <th className="text-left font-medium text-gray-500 px-5 py-3">Currency</th>
                <th className="text-left font-medium text-gray-500 px-5 py-3">Timezone</th>
                <th className="text-left font-medium text-gray-500 px-5 py-3">Shift Hours</th>
                <th className="text-left font-medium text-gray-500 px-5 py-3">Units</th>
                <th className="text-left font-medium text-gray-500 px-5 py-3">Status</th>
                {isGlobalAdmin && <th className="text-left font-medium text-gray-500 px-5 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {segments.map((seg) => (
                <tr key={seg.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-gray-900">{seg.name}</div>
                    {seg.description && (
                      <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{seg.description}</div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
                      {seg.code}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-700">{seg.defaultCurrency}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-gray-700">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs">{seg.defaultTimezone}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-700">
                    <span className="font-mono">{seg.defaultStartTime}</span>
                    {' – '}
                    <span className="font-mono">{seg.defaultEndTime}</span>
                    <div className="text-gray-400">{seg.defaultShift}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                      {seg._count?.businessUnits ?? 0}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {seg.isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-50 text-green-700 px-2 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        Inactive
                      </span>
                    )}
                  </td>
                  {isGlobalAdmin && (<td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(seg)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setDeleteError(''); setDeleteConfirm(seg); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                        disabled={(seg._count?.businessUnits ?? 0) > 0}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <MarketModal
          segment={editSegment}
          onClose={() => setModalOpen(false)}
          onSaved={load}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Delete Market Segment?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




