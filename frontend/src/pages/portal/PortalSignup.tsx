import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function PortalSignup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState('');
  const [orgDomain, setOrgDomain] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);

    const { error: err } = await signUp(email, password, {
      role: 'org_admin',
      full_name: fullName,
      org_name: orgName,
      org_domain: orgDomain,
    });
    setLoading(false);
    if (err) { setError(err.message); } else { navigate('/portal'); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-3 justify-center mb-10">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">🏢</div>
          <div className="text-center">
            <span className="font-bold text-xl text-text-primary tracking-tight block">SafeOffer Portal</span>
            <span className="text-xs text-text-muted">Register Your College</span>
          </div>
        </Link>

        <div className="rounded-2xl border border-border bg-surface-elevated p-8">
          <h1 className="text-2xl font-bold text-text-primary mb-1">Create Portal Account</h1>
          <p className="text-sm text-text-muted mb-8">Set up your placement cell dashboard</p>

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 mb-6">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-4">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Organization Details</p>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">College / Organization Name</label>
                <input type="text" required value={orgName} onChange={(e) => setOrgName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-hover px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="MIT Placement Cell" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">College Domain (optional)</label>
                <input type="text" value={orgDomain} onChange={(e) => setOrgDomain(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-hover px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="mit.edu" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">Your Full Name</label>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-hover px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="Dr. Jane Smith" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-hover px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="admin@college.edu" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-hover px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="Min 6 characters" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 text-sm hover:shadow-lg hover:shadow-blue-600/25 disabled:opacity-50 transition-all">
              {loading ? 'Creating portal…' : 'Create Portal Account'}
            </button>
          </form>

          <p className="text-center text-sm text-text-muted mt-6">
            Already have a portal?{' '}
            <Link to="/portal/login" className="text-blue-400 hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
