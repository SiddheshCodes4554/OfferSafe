import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface Stats {
  total: number;
  verified: number;
  rejected: number;
  pending: number;
  avgScore: number;
}

interface RecentOffer {
  id: string;
  company_name: string;
  position_title: string;
  trust_score: number | null;
  status: string;
  created_at: string;
}

export default function PortalDashboard() {
  const { orgInfo } = useAuth();
  const [stats, setStats] = useState<Stats>({ total: 0, verified: 0, rejected: 0, pending: 0, avgScore: 0 });
  const [recent, setRecent] = useState<RecentOffer[]>([]);

  useEffect(() => {
    if (!orgInfo) return;
    loadData();
  }, [orgInfo]);

  const loadData = async () => {
    if (!orgInfo) return;

    const { data: offers } = await supabase
      .from('org_offers')
      .select('id, company_name, position_title, trust_score, status, created_at')
      .eq('org_id', orgInfo.org_id)
      .order('created_at', { ascending: false });

    if (offers) {
      setRecent(offers.slice(0, 5) as RecentOffer[]);
      setStats({
        total: offers.length,
        verified: offers.filter(o => o.status === 'verified').length,
        rejected: offers.filter(o => o.status === 'rejected').length,
        pending: offers.filter(o => o.status === 'pending').length,
        avgScore: offers.length > 0
          ? Math.round(offers.reduce((sum, o) => sum + (o.trust_score ?? 0), 0) / offers.length)
          : 0,
      });
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-500/15 text-amber-400',
      verified: 'bg-emerald-500/15 text-emerald-400',
      rejected: 'bg-red-500/15 text-red-400',
      flagged: 'bg-orange-500/15 text-orange-400',
    };
    return map[status] ?? 'bg-gray-500/15 text-gray-400';
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-muted mt-1">Welcome back — here's your placement cell overview</p>
      </div>

      {/* ── Stats Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Offers', value: stats.total, color: 'text-text-primary' },
          { label: 'Verified ✅', value: stats.verified, color: 'text-emerald-400' },
          { label: 'Rejected ❌', value: stats.rejected, color: 'text-red-400' },
          { label: 'Pending ⏳', value: stats.pending, color: 'text-amber-400' },
          { label: 'Avg Score', value: `${stats.avgScore}%`, color: 'text-blue-400' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-surface-elevated p-5 text-center">
            <p className="text-xs uppercase tracking-widest text-text-muted mb-2">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          to="/portal/submit"
          className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6 hover:bg-blue-500/10 transition-all group"
        >
          <span className="text-2xl mb-2 block">📤</span>
          <h3 className="font-bold text-text-primary group-hover:text-blue-400 transition-colors">Submit New Offer</h3>
          <p className="text-sm text-text-muted mt-1">Paste or upload an offer letter for AI analysis</p>
        </Link>
        <Link
          to="/portal/offers"
          className="rounded-2xl border border-border bg-surface-elevated p-6 hover:bg-surface-hover transition-all group"
        >
          <span className="text-2xl mb-2 block">📋</span>
          <h3 className="font-bold text-text-primary group-hover:text-blue-400 transition-colors">View All Offers</h3>
          <p className="text-sm text-text-muted mt-1">Review, verify, or reject offers on the board</p>
        </Link>
      </div>

      {/* ── Recent Offers ────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-bold text-text-primary mb-4">Recent Submissions</h2>
        {recent.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface-elevated p-12 text-center">
            <p className="text-text-muted">No offers submitted yet. Submit your first!</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface-elevated overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-xs uppercase tracking-widest">
                  <th className="text-left px-5 py-3">Company</th>
                  <th className="text-left px-5 py-3">Position</th>
                  <th className="text-left px-5 py-3">Score</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((offer) => (
                  <tr key={offer.id} className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-text-primary">{offer.company_name}</td>
                    <td className="px-5 py-3 text-text-secondary">{offer.position_title}</td>
                    <td className="px-5 py-3 font-bold text-text-primary">{offer.trust_score ?? '—'}%</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge(offer.status)}`}>
                        {offer.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-text-muted">{new Date(offer.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
