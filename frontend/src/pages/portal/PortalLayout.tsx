import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { path: '/portal', label: 'Dashboard', icon: '📊' },
  { path: '/portal/submit', label: 'Submit Offer', icon: '📤' },
  { path: '/portal/offers', label: 'Offers Board', icon: '📋' },
];

export default function PortalLayout() {
  const { user, orgInfo, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Sidebar ────────────────────────────────────── */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} border-r border-border bg-surface-elevated flex flex-col transition-all duration-300 shrink-0`}>
        {/* Logo */}
        <div className="h-16 border-b border-border flex items-center px-4 gap-3">
          <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
            🏢
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <p className="font-bold text-sm text-text-primary truncate">SafeOffer Portal</p>
              <p className="text-[10px] text-text-muted truncate">{orgInfo?.org_name ?? 'Placement Cell'}</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
                  ${active
                    ? 'bg-blue-600/15 text-blue-400'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                  }
                `}
              >
                <span className="text-base shrink-0">{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-border p-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all"
          >
            {sidebarOpen ? '← Collapse' : '→'}
          </button>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 border-b border-border bg-surface-elevated/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-40">
          <h2 className="text-sm font-semibold text-text-secondary">
            {orgInfo?.org_name ?? 'College Portal'}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-xs text-text-muted hidden sm:inline truncate max-w-[180px]">{user?.email}</span>
            <span className="text-[10px] rounded-full bg-blue-600/15 text-blue-400 px-2 py-0.5 font-semibold uppercase">
              {orgInfo?.role ?? 'member'}
            </span>
            <button onClick={signOut} className="text-xs font-medium text-text-muted hover:text-red-400 transition-colors">
              Sign Out
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 sm:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
