import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import { AppLayout } from './components/layout/AppLayout';
import { Spinner } from './components/ui';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Sponsors } from './pages/Sponsors';
import { SponsorDetail } from './pages/SponsorDetail';
import { Discovery } from './pages/Discovery';
import { Finance } from './pages/Finance';
import { Vendors } from './pages/Vendors';
import { Tournament } from './pages/Tournament';
import { Programme } from './pages/Programme';
import { Venues } from './pages/Venues';
import { Planning } from './pages/Planning';
import { People } from './pages/People';
import { Compliance } from './pages/Compliance';
import { Marketing } from './pages/Marketing';
import { Contacts } from './pages/Contacts';
import { Documents } from './pages/Documents';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { PublicFormsLayout, PublicIndex } from './pages/public/PublicForms';
import { TeamRegistration } from './pages/public/TeamRegistration';
import { VendorApplication } from './pages/public/VendorApplication';
import { VolunteerApplication } from './pages/public/VolunteerApplication';
import { SponsorInquiry } from './pages/public/SponsorInquiry';
import { PerformerApplication } from './pages/public/PerformerApplication';

export function App() {
  const { session, loading } = useAuth();

  return (
    <Routes>
      {/* Public application forms — no auth, no internal data exposed */}
      <Route path="/apply" element={<PublicFormsLayout />}>
        <Route index element={<PublicIndex />} />
        <Route path="team" element={<TeamRegistration />} />
        <Route path="vendor" element={<VendorApplication />} />
        <Route path="volunteer" element={<VolunteerApplication />} />
        <Route path="sponsor" element={<SponsorInquiry />} />
        <Route path="performer" element={<PerformerApplication />} />
      </Route>

      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />

      {loading ? (
        <Route path="*" element={<div className="min-h-screen bg-ink-950 grid place-items-center"><Spinner label="Starting up…" /></div>} />
      ) : !session ? (
        <Route path="*" element={<Navigate to="/login" replace />} />
      ) : (
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sponsors" element={<Sponsors />} />
          <Route path="/sponsors/:id" element={<SponsorDetail />} />
          <Route path="/discovery" element={<Discovery />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/tournament" element={<Tournament />} />
          <Route path="/programme" element={<Programme />} />
          <Route path="/venues" element={<Venues />} />
          <Route path="/planning" element={<Planning />} />
          <Route path="/people" element={<People />} />
          <Route path="/compliance" element={<Compliance />} />
          <Route path="/marketing" element={<Marketing />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      )}
    </Routes>
  );
}
