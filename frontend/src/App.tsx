import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AppDataProvider } from './hooks/useAppData';
import { DashboardPage } from './pages/DashboardPage';
import { SubmitPage } from './pages/SubmitPage';
import { AdminPage } from './pages/AdminPage';
import { config } from './config';

export default function App() {
  return (
    <AppDataProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path={`/${config.adminRouteSlug}`} element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AppDataProvider>
  );
}
