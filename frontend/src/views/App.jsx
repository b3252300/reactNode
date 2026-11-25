// 設定註冊、登入及需驗證的應用程式路由
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import Home from './dashboard/Home';
import Dashboard from './admin/Dashboard';
import LoginPage from './auth/LoginPage';
import Layout from '../layouts';
import MembersPage from './member/MembersPage';
import ProtectedRoute from './auth/ProtectedRoute';
import RegisterPage from './auth/RegisterPage';
import PropertyStatusAssets from './admin/PropertyStatusAssets/List';
import FinancialChart from './admin/FinancialChart.tsx/List';
import ButlerRepairRequest from './admin/ButlerRepairRequest/List';

const MapSearchPage = lazy(() => import('./dashboard/MapSearch/MapSearchPage'));

function MapRouteFallback() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-600 dark:bg-[#090d16] dark:text-slate-300 gap-3">
      <div className="h-8 w-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 dark:border-t-amber-400 animate-spin" />
      <p className="text-sm text-slate-500 dark:text-slate-400">正在載入地圖找房...</p>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route index element={<Home />} />
            <Route
              path="/map"
              element={
                <Suspense fallback={<MapRouteFallback />}>
                  <MapSearchPage />
                </Suspense>
              }
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="admin" element={<Dashboard />} />
                <Route
                  path="property-status-assets"
                  element={<PropertyStatusAssets />}
                />
                <Route
                  path="propertyStatusAssets"
                  element={<Navigate to="/property-status-assets" replace />}
                />
                <Route path="financial-chart" element={<FinancialChart />} />
                <Route
                  path="butler-repair-request"
                  element={<ButlerRepairRequest />}
                />
                <Route path="members" element={<MembersPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
