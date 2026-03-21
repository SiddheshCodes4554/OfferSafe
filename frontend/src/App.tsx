import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// ── Public pages ──────────────────────────────────────────────
import Landing from './pages/Landing';
import StudentLogin from './pages/StudentLogin';
import StudentSignup from './pages/StudentSignup';

// ── Student (protected) ──────────────────────────────────────
import StudentDashboard from './pages/StudentDashboard';

// ── Portal (public) ──────────────────────────────────────────
import PortalLogin from './pages/portal/PortalLogin';
import PortalSignup from './pages/portal/PortalSignup';

// ── Portal (protected) ──────────────────────────────────────
import PortalLayout from './pages/portal/PortalLayout';
import PortalDashboard from './pages/portal/PortalDashboard';
import SubmitOffer from './pages/portal/SubmitOffer';
import OffersBoard from './pages/portal/OffersBoard';

export default function App() {
  return (
    <Routes>
      {/* ── Public ──────────────────────────────────────── */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<StudentLogin />} />
      <Route path="/signup" element={<StudentSignup />} />
      <Route path="/portal/login" element={<PortalLogin />} />
      <Route path="/portal/signup" element={<PortalSignup />} />

      {/* ── Student (protected) ────────────────────────── */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      {/* ── Portal (protected, with sidebar layout) ───── */}
      <Route
        path="/portal"
        element={
          <ProtectedRoute allowedRoles={['org_admin', 'org_member']}>
            <PortalLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PortalDashboard />} />
        <Route path="submit" element={<SubmitOffer />} />
        <Route path="offers" element={<OffersBoard />} />
      </Route>
    </Routes>
  );
}
