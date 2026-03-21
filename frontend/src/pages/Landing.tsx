import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="border-b border-border bg-surface-elevated/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm">SO</div>
            <span className="font-bold text-lg tracking-tight">SafeOffer</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
              Log In
            </Link>
            <Link to="/signup" className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-widest mb-6">
          🛡️ AI-Powered Fraud Detection
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight tracking-tight mb-6">
          Verify Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Offer Letter</span> in Seconds
        </h1>
        <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
          SafeOffer uses a 6-layer AI analysis engine to detect fraudulent job offers.
          Upload your PDF, paste the text, or verify the company — get an instant trust score.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/signup"
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-bold text-base shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
          >
            Scan Your Offer — Free
          </Link>
          <Link
            to="/portal/signup"
            className="px-8 py-4 rounded-2xl border border-border text-text-primary font-bold text-base hover:bg-surface-elevated hover:border-border-hover transition-all"
          >
            College Portal →
          </Link>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-24 grid sm:grid-cols-3 gap-6">
        {[
          { icon: '📄', title: 'Upload PDF', desc: 'Drop your offer letter PDF and get instant OCR + AI analysis' },
          { icon: '🔍', title: '6-Layer Analysis', desc: 'ML model, keywords, structure, urgency, legitimacy, and domain checks' },
          { icon: '🏢', title: 'College Portals', desc: 'Placement cells can verify offers in bulk before sharing with students' },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-surface-elevated p-6 hover:border-border-hover transition-colors">
            <span className="text-3xl mb-4 block">{f.icon}</span>
            <h3 className="font-bold text-lg mb-2">{f.title}</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-border py-8 text-center text-sm text-text-muted">
        SafeOffer © {new Date().getFullYear()} — AI Offer Authenticator
      </footer>
    </div>
  );
}
