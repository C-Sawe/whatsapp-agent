import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import api, { setAccessToken } from './api';

// Lazy loaded routes (Code Splitting)
const Login = lazy(() => import('./pages/Login'));
const ConfigPage = lazy(() => import('./pages/ConfigPage'));
const DashboardOverview = lazy(() => import('./pages/DashboardOverview'));
const Orders = lazy(() => import('./pages/Orders'));
const Inventory = lazy(() => import('./pages/Inventory'));
const DebtDashboard = lazy(() => import('./pages/DebtDashboard'));
const StaffDashboard = lazy(() => import('./pages/StaffDashboard'));
const QuarterlyReports = lazy(() => import('./pages/QuarterlyReports'));

// Fallback loader while downloading page chunks
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-stone-50">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
  </div>
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await api.post('/api/refresh', {}, { withCredentials: true });
        if (res.data.token) {
          setAccessToken(res.data.token);
          setIsAuthenticated(true);
        }
      } catch (err) {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  if (loading) return null;

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/" /> : <Login setAuth={setIsAuthenticated} />} 
          />
          
          {/* Protected Routes */}
          <Route element={isAuthenticated ? <Layout setAuth={setIsAuthenticated} /> : <Navigate to="/login" />}>
            <Route path="/" element={<DashboardOverview />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/whatsapp/orders" element={<Orders />} />
            <Route path="/debt" element={<DebtDashboard />} />
            <Route path="/staff" element={<StaffDashboard />} />
            <Route path="/whatsapp/config" element={<ConfigPage />} />
            <Route path="/quarterly-reports" element={<QuarterlyReports />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
