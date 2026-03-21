import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { analyzeText, type AnalysisResponse } from '../../api';

export default function SubmitOffer() {
  const { orgInfo } = useAuth();
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');
  const [positionTitle, setPositionTitle] = useState('');
  const [offerText, setOfferText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!orgInfo) { setError('Organization info not loaded. Please refresh or relogin.'); return; }
    if (offerText.length < 50) { setError('Offer text must be at least 50 characters'); return; }
    setError('');
    setLoading(true);

    try {
      // Run AI analysis
      const analysis = await analyzeText(offerText);
      setResult(analysis);

      // Save to DB
      await supabase.from('org_offers').insert({
        org_id: orgInfo.org_id,
        company_name: companyName,
        company_domain: companyDomain,
        position_title: positionTitle,
        offer_text: offerText,
        trust_score: analysis.trust_score,
        risk_level: analysis.risk_level,
        analysis_layers: analysis.analysis_layers ?? [],
        findings: analysis.findings ?? [],
        red_flag_count: analysis.red_flag_count,
        status: 'pending',
      });

      setLoading(false);
    } catch (err: unknown) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    }
  };

  const riskColor = (score: number) =>
    score < 40 ? 'text-red-400 border-red-500/30 bg-red-500/5' :
    score < 60 ? 'text-orange-400 border-orange-500/30 bg-orange-500/5' :
    score < 75 ? 'text-amber-400 border-amber-500/30 bg-amber-500/5' :
    'text-emerald-400 border-emerald-500/30 bg-emerald-500/5';

  if (result) {
    return (
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">Analysis Complete</h1>

        <div className={`rounded-2xl border p-8 text-center ${riskColor(result.trust_score)}`}>
          <p className="text-5xl font-black">{result.trust_score}%</p>
          <p className="text-sm font-semibold mt-2">{result.risk_level}</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-surface-elevated p-4 text-center">
            <p className="text-xs text-text-muted uppercase tracking-widest mb-1">Company</p>
            <p className="font-bold text-text-primary">{companyName}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface-elevated p-4 text-center">
            <p className="text-xs text-text-muted uppercase tracking-widest mb-1">Position</p>
            <p className="font-bold text-text-primary">{positionTitle}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface-elevated p-4 text-center">
            <p className="text-xs text-text-muted uppercase tracking-widest mb-1">Red Flags</p>
            <p className="font-bold text-text-primary">{result.red_flag_count}</p>
          </div>
        </div>

        {/* Layer Breakdown */}
        {result.analysis_layers && result.analysis_layers.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Score Breakdown</h3>
            <div className="space-y-2">
              {result.analysis_layers.map((layer) => {
                const barColor = layer.score < 40 ? 'bg-red-500' : layer.score < 60 ? 'bg-orange-500' : layer.score < 75 ? 'bg-amber-400' : 'bg-emerald-500';
                const textColor = layer.score < 40 ? 'text-red-400' : layer.score < 60 ? 'text-orange-400' : layer.score < 75 ? 'text-amber-400' : 'text-emerald-400';
                return (
                  <div key={layer.name} className="flex items-center gap-3">
                    <span className="text-xs text-text-muted w-36 shrink-0 truncate">{layer.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-surface-hover overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${Math.max(2, layer.score)}%` }} />
                    </div>
                    <span className={`text-xs font-bold tabular-nums w-10 text-right ${textColor}`}>{layer.score}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-sm text-text-muted">
          This offer has been saved to your board as <span className="font-semibold text-amber-400">Pending</span>.
          Go to the Offers Board to verify or reject it.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/portal/offers')}
            className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 text-sm hover:shadow-lg transition-all"
          >
            View Offers Board
          </button>
          <button
            onClick={() => { setResult(null); setCompanyName(''); setCompanyDomain(''); setPositionTitle(''); setOfferText(''); }}
            className="flex-1 rounded-xl border border-border bg-surface-elevated text-text-primary font-bold py-3 text-sm hover:bg-surface-hover transition-all"
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Submit Offer for Analysis</h1>
        <p className="text-sm text-text-muted mt-1">Paste the offer letter text — our AI will analyze it instantly</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">Company Name</label>
            <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-hover px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              placeholder="Google, TCS, etc." />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">Company Domain (optional)</label>
            <input type="text" value={companyDomain} onChange={(e) => setCompanyDomain(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-hover px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              placeholder="google.com" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">Position Title</label>
          <input type="text" required value={positionTitle} onChange={(e) => setPositionTitle(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-hover px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            placeholder="Software Engineer, Data Analyst, etc." />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">Offer Letter Text</label>
          <textarea
            required
            value={offerText}
            onChange={(e) => setOfferText(e.target.value)}
            rows={10}
            className="w-full rounded-xl border border-border bg-surface-hover px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono resize-y"
            placeholder="Paste the full offer letter text here..."
          />
          <p className="text-xs text-text-muted mt-1">{offerText.length} characters (min. 50)</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 text-sm hover:shadow-lg hover:shadow-blue-600/25 disabled:opacity-50 transition-all"
        >
          {loading ? '🔍 Analyzing…' : '🔍 Analyze & Submit'}
        </button>
      </form>
    </div>
  );
}
