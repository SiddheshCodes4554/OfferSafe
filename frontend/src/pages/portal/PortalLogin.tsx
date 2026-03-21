import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function PortalLogin() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) { setError(err.message); } else { navigate('/portal'); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-3 justify-center mb-10">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">🏢</div>
          <div className="text-center">
            <span className="font-bold text-xl text-text-primary tracking-tight block">SafeOffer Portal</span>
            <span className="text-xs text-text-muted">Placement Cell Dashboard</span>
          </div>
        </Link>

        <div className="rounded-2xl border border-border bg-surface-elevated p-8">
          <h1 className="text-2xl font-bold text-text-primary mb-1">Portal Login</h1>
          <p className="text-sm text-text-muted mb-8">Sign in to your placement cell dashboard</p>

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 mb-6">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-hover px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                placeholder="admin@college.edu" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-hover px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 text-sm hover:shadow-lg hover:shadow-blue-600/25 disabled:opacity-50 transition-all">
              {loading ? 'Signing in…' : 'Sign In to Portal'}
            </button>
          </form>

          <p className="text-center text-sm text-text-muted mt-6">
            Need a portal account?{' '}
            <Link to="/portal/signup" className="text-blue-400 hover:underline font-medium">Register your college</Link>
          </p>
        </div>

        <p className="text-center text-xs text-text-muted mt-6">
          <Link to="/login" className="hover:text-text-secondary transition-colors">← Student Login</Link>
        </p>
      </div>
    </div>
  );
}
