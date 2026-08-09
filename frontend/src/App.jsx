import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import ConfigPage from './pages/ConfigPage';
import DashboardOverview from './pages/DashboardOverview';
import Orders from './pages/Orders';
import Hub from './pages/Hub';
import Inventory from './pages/Inventory';
import DebtDashboard from './pages/DebtDashboard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('mosop_auth');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  if (loading) return null;

  return (
    <Router>
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
          <Route path="/whatsapp/config" element={<ConfigPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
