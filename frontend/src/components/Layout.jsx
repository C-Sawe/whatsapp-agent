import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Settings, ShoppingBag, LogOut, ArrowLeft, Menu, X, Database, Users, Calendar, DollarSign, ClipboardList, UserCog, Truck } from 'lucide-react';
import api, { setAccessToken } from '../api';

export default function Layout({ setAuth }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);

  const logout = async () => {
    try {
      await api.post('/api/logout');
    } catch (e) {}
    setAccessToken(null);
    setAuth(false);
    navigate('/login');
  };

  const getPageTitle = () => {
    if (location.pathname === '/') return 'ANALYTICS DASHBOARD';
    if (location.pathname === '/inventory') return 'INVENTORY SYNC';
    if (location.pathname === '/whatsapp/orders') return 'ORDERS';
    if (location.pathname === '/whatsapp/config') return 'CONFIGURATIONS';
    if (location.pathname === '/debt') return 'ACCOUNTS RECEIVABLE';
    if (location.pathname === '/staff') return 'STAFF PERFORMANCE';
    if (location.pathname === '/quarterly-reports') return 'QUARTERLY REPORTS';
    if (location.pathname === '/stocktake-manager') return 'STOCKTAKE MANAGER';
    if (location.pathname === '/staff-management') return 'STAFF MANAGEMENT';
    if (location.pathname === '/fleet') return 'FLEET RADAR & LOGISTICS';
    return 'DASHBOARD';
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isSidebarOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isSidebarOpen) setIsSidebarOpen(false);
    };
    if (isSidebarOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);

  useEffect(() => {
    const handleTab = (e) => {
      if (!isSidebarOpen || !sidebarRef.current) return;
      
      const focusable = sidebarRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isSidebarOpen]);

  return (
    <div className="flex h-screen bg-stone-50 transition-colors">
      
      {/* Sidebar Overlay */}
      <div 
        className={`fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Desktop & Mobile Sidebar — dark material: translucent + blurred so
          it reads as its own depth layer above the page, like a macOS
          sidebar, rather than a flat opaque panel */}
      <aside
        ref={sidebarRef}
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 material-dark text-stone-300 border-r border-white/10 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >  <div className="p-6 border-b border-white/10 flex items-center justify-between min-h-[64px]">
          <div className="flex-1 text-center">
            <img src="https://mosopfarminputs.co.ke/images/logo_transparent.webp" alt="Mosop Farm Inputs Logo" className="h-12 object-contain mx-auto mb-3" />
            <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-stone-500">Central Command</p>
          </div>
          <button 
            onClick={toggleSidebar} 
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-400 hover:text-white rounded-md focus-visible:ring-2 focus-visible:ring-green-500 outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavLink to="/" end className={({isActive}) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200 group focus-visible:ring-2 focus-visible:ring-green-500 outline-none ${isActive ? 'bg-green-600 text-white font-bold' : 'hover:bg-stone-800 hover:text-white'}`}>
            <Home className="w-4 h-4 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest">Dashboard</span>
          </NavLink>
          <NavLink to="/inventory" className={({isActive}) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200 group focus-visible:ring-2 focus-visible:ring-green-500 outline-none ${isActive ? 'bg-green-600 text-white font-bold' : 'hover:bg-stone-800 hover:text-white'}`}>
            <Database className="w-4 h-4 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest">Inventory</span>
          </NavLink>
          <NavLink to="/whatsapp/orders" className={({isActive}) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200 group focus-visible:ring-2 focus-visible:ring-green-500 outline-none ${isActive ? 'bg-green-600 text-white font-bold' : 'hover:bg-stone-800 hover:text-white'}`}>
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest">Orders</span>
          </NavLink>
          <NavLink to="/debt" className={({isActive}) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200 group focus-visible:ring-2 focus-visible:ring-green-500 outline-none ${isActive ? 'bg-green-600 text-white font-bold' : 'hover:bg-stone-800 hover:text-white'}`}>
            <Users className="w-4 h-4 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest">Accounts Rec.</span>
          </NavLink>
          <NavLink to="/quarterly-reports" className={({isActive}) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200 group focus-visible:ring-2 focus-visible:ring-green-500 outline-none ${isActive ? 'bg-green-600 text-white font-bold' : 'hover:bg-stone-800 hover:text-white'}`}>
            <Calendar className="w-4 h-4 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest">Quarterly Reports</span>
          </NavLink>
          <NavLink to="/stocktake-manager" className={({isActive}) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200 group focus-visible:ring-2 focus-visible:ring-green-500 outline-none ${isActive ? 'bg-green-600 text-white font-bold' : 'hover:bg-stone-800 hover:text-white'}`}>
            <ClipboardList className="w-4 h-4 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest">Stocktake Mgr</span>
          </NavLink>
          <NavLink to="/fleet" className={({isActive}) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200 group focus-visible:ring-2 focus-visible:ring-green-500 outline-none ${isActive ? 'bg-green-600 text-white font-bold' : 'hover:bg-stone-800 hover:text-white'}`}>
            <Truck className="w-4 h-4 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest">Fleet Radar</span>
          </NavLink>
          <NavLink to="/staff-management" className={({isActive}) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200 group focus-visible:ring-2 focus-visible:ring-green-500 outline-none ${isActive ? 'bg-green-600 text-white font-bold' : 'hover:bg-stone-800 hover:text-white'}`}>
            <UserCog className="w-4 h-4 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest">Staff Accounts</span>
          </NavLink>

          <NavLink to="/whatsapp/config" className={({isActive}) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200 group focus-visible:ring-2 focus-visible:ring-green-500 outline-none ${isActive ? 'bg-green-600 text-white font-bold' : 'hover:bg-stone-800 hover:text-white'}`}>
            <Settings className="w-4 h-4 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest">Configurations</span>
          </NavLink>
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-stone-400 hover:text-red-400 hover:bg-stone-800 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-green-500 outline-none">
            <LogOut className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-y-auto w-full relative">
        {/* Header material: translucent + blurred so page content is still
            faintly visible as it scrolls underneath — the "vibrancy" that
            makes a glass surface read as glass instead of a flat bar */}
        <header className="sticky top-0 z-30 material-light border-b px-4 py-4 flex items-center justify-between shadow-sm transition-colors">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-1 md:hidden hover:bg-stone-100 rounded-lg transition-colors text-stone-700"
              aria-label="Toggle Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-sm font-black text-stone-900 tracking-widest">{getPageTitle()}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-stone-900 rounded-lg flex items-center justify-center text-green-500 font-bold text-xs shadow-sm">
              AD
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <Outlet />
          </div>
        </div>
      </main>

      <nav
        aria-label="Primary"
        className="fixed bottom-0 w-full material-light border-t flex justify-around p-3 z-bottomnav md:hidden transition-colors"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
      >
        <NavLink to="/" end aria-current={location.pathname === '/' ? 'page' : undefined} className={({isActive}) => `flex flex-col items-center gap-1 min-h-[44px] min-w-[44px] justify-center transition-colors ${isActive ? 'text-green-600' : 'text-stone-400'}`}>
          <Home className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Dash</span>
        </NavLink>
        <NavLink to="/inventory" aria-current={location.pathname === '/inventory' ? 'page' : undefined} className={({isActive}) => `flex flex-col items-center gap-1 min-h-[44px] min-w-[44px] justify-center transition-colors ${isActive ? 'text-green-600' : 'text-stone-400'}`}>
          <Database className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Stock</span>
        </NavLink>
        <NavLink to="/whatsapp/orders" aria-current={location.pathname === '/whatsapp/orders' ? 'page' : undefined} className={({isActive}) => `flex flex-col items-center gap-1 min-h-[44px] min-w-[44px] justify-center transition-colors ${isActive ? 'text-green-600' : 'text-stone-400'}`}>
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Orders</span>
        </NavLink>
        <NavLink to="/debt" aria-current={location.pathname === '/debt' ? 'page' : undefined} className={({isActive}) => `flex flex-col items-center gap-1 min-h-[44px] min-w-[44px] justify-center transition-colors ${isActive ? 'text-green-600' : 'text-stone-400'}`}>
          <DollarSign className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Accts</span>
        </NavLink>
        <NavLink to="/staff" aria-current={location.pathname === '/staff' ? 'page' : undefined} className={({isActive}) => `flex flex-col items-center gap-1 min-h-[44px] min-w-[44px] justify-center transition-colors ${isActive ? 'text-green-600' : 'text-stone-400'}`}>
          <Users className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Staff</span>
        </NavLink>
        <NavLink to="/quarterly-reports" aria-current={location.pathname === '/quarterly-reports' ? 'page' : undefined} className={({isActive}) => `flex flex-col items-center gap-1 min-h-[44px] min-w-[44px] justify-center transition-colors ${isActive ? 'text-green-600' : 'text-stone-400'}`}>
          <Calendar className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Qtrly</span>
        </NavLink>
      </nav>
    </div>
  );
}
