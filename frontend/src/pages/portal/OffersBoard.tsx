import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface Offer {
  id: string;
  company_name: string;
  company_domain: string;
  position_title: string;
  trust_score: number | null;
  risk_level: string | null;
  status: string;
  red_flag_count: number;
  reviewer_notes: string;
  created_at: string;
  reviewed_at: string | null;
}

type FilterStatus = 'all' | 'pending' | 'verified' | 'rejected' | 'flagged';

export default function OffersBoard() {
  const { orgInfo } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [selected, setSelected] = useState<Offer | null>(null);
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (orgInfo) loadOffers();
  }, [orgInfo]);

  const loadOffers = async () => {
    if (!orgInfo) return;
    const { data } = await supabase
      .from('org_offers')
      .select('*')
      .eq('org_id', orgInfo.org_id)
      .order('created_at', { ascending: false });
    if (data) setOffers(data as Offer[]);
  };

  const updateStatus = async (offerId: string, newStatus: string) => {
    setUpdating(true);
    await supabase
      .from('org_offers')
      .update({
        status: newStatus,
        reviewer_notes: notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', offerId);
    setUpdating(false);
    setSelected(null);
    setNotes('');
    loadOffers();
  };

  const filtered = filter === 'all' ? offers : offers.filter(o => o.status === filter);

  const statusBadge = (status: string) => ({
    pending: 'bg-amber-500/15 text-amber-400',
    verified: 'bg-emerald-500/15 text-emerald-400',
    rejected: 'bg-red-500/15 text-red-400',
    flagged: 'bg-orange-500/15 text-orange-400',
  }[status] ?? 'bg-gray-500/15 text-gray-400');

  const scoreColor = (score: number | null) => {
    if (score === null) return 'text-text-muted';
    return score < 40 ? 'text-red-400' : score < 60 ? 'text-orange-400' : score < 75 ? 'text-amber-400' : 'text-emerald-400';
  };

  const FILTERS: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'verified', label: 'Verified' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'flagged', label: 'Flagged' },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Offers Board</h1>
          <p className="text-sm text-text-muted mt-1">{filtered.length} offers {filter !== 'all' ? `(${filter})` : ''}</p>
        </div>

        {/* Filters */}
        <div className="flex rounded-xl border border-border bg-surface-elevated p-1 gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setSelected(null); }}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${filter === f.key ? 'bg-blue-600/15 text-blue-400' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'}
              `}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-elevated p-12 text-center">
          <p className="text-text-muted">No offers found.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Offers List ──────────────────────────────── */}
          <div className={`${selected ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-3`}>
            {filtered.map((offer) => (
              <button
                key={offer.id}
                onClick={() => { setSelected(offer); setNotes(offer.reviewer_notes); }}
                className={`
                  w-full text-left rounded-2xl border p-5 transition-all
                  ${selected?.id === offer.id
                    ? 'border-blue-500/50 bg-blue-500/5'
                    : 'border-border bg-surface-elevated hover:bg-surface-hover hover:border-border-hover'
                  }
                `}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-bold text-text-primary truncate">{offer.company_name}</h3>
                    <p className="text-sm text-text-secondary truncate">{offer.position_title}</p>
                    <p className="text-xs text-text-muted mt-1">{new Date(offer.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right shrink-0 space-y-1.5">
                    <p className={`text-xl font-black ${scoreColor(offer.trust_score)}`}>
                      {offer.trust_score ?? '—'}%
                    </p>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge(offer.status)}`}>
                      {offer.status}
                    </span>
                  </div>
                </div>
                {offer.red_flag_count > 0 && (
                  <p className="text-xs text-red-400 mt-2">⚠ {offer.red_flag_count} red flags detected</p>
                )}
              </button>
            ))}
          </div>

          {/* ── Detail Panel ─────────────────────────────── */}
          {selected && (
            <div className="lg:col-span-1 rounded-2xl border border-border bg-surface-elevated p-6 space-y-5 sticky top-24 self-start">
              <div>
                <h3 className="font-bold text-lg text-text-primary">{selected.company_name}</h3>
                <p className="text-sm text-text-secondary">{selected.position_title}</p>
                {selected.company_domain && (
                  <p className="text-xs text-text-muted mt-1">🌐 {selected.company_domain}</p>
                )}
              </div>

              <div className={`rounded-xl border p-4 text-center ${
                selected.trust_score !== null
                  ? (selected.trust_score < 40 ? 'border-red-500/30 bg-red-500/5' : selected.trust_score < 75 ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5')
                  : 'border-border'
              }`}>
                <p className={`text-3xl font-black ${scoreColor(selected.trust_score)}`}>
                  {selected.trust_score ?? '—'}%
                </p>
                <p className="text-xs text-text-muted mt-1">{selected.risk_level ?? 'Not analyzed'}</p>
              </div>

              {/* Status Actions */}
              {orgInfo?.role === 'admin' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold uppercase tracking-widest text-text-muted">Reviewer Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-surface-hover px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-y"
                    placeholder="Add notes about this offer..."
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateStatus(selected.id, 'verified')}
                      disabled={updating}
                      className="rounded-xl bg-emerald-600 text-white font-bold py-2.5 text-sm hover:bg-emerald-500 disabled:opacity-50 transition-all"
                    >
                      ✅ Verify
                    </button>
                    <button
                      onClick={() => updateStatus(selected.id, 'rejected')}
                      disabled={updating}
                      className="rounded-xl bg-red-600 text-white font-bold py-2.5 text-sm hover:bg-red-500 disabled:opacity-50 transition-all"
                    >
                      ❌ Reject
                    </button>
                    <button
                      onClick={() => updateStatus(selected.id, 'flagged')}
                      disabled={updating}
                      className="col-span-2 rounded-xl border border-orange-500/30 text-orange-400 font-bold py-2.5 text-sm hover:bg-orange-500/10 disabled:opacity-50 transition-all"
                    >
                      🚩 Flag for Review
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setSelected(null)}
                className="w-full text-xs text-text-muted hover:text-text-primary transition-colors py-2"
              >
                Close Panel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
