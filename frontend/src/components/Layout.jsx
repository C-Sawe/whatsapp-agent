import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Settings, ShoppingBag, LogOut, ArrowLeft, Menu, X, Database, Users } from 'lucide-react';

export default function Layout({ setAuth }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);

  const logout = () => {
    localStorage.removeItem('mosop_auth');
    setAuth(false);
    navigate('/login');
  };

  const getPageTitle = () => {
    if (location.pathname === '/') return 'ANALYTICS DASHBOARD';
    if (location.pathname === '/inventory') return 'INVENTORY SYNC';
    if (location.pathname === '/whatsapp/orders') return 'ORDERS';
    if (location.pathname === '/whatsapp/config') return 'CONFIGURATIONS';
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
    <div className="min-h-screen bg-stone-50 flex selection:bg-green-600/20 relative">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-overlay md:hidden" 
          onClick={toggleSidebar}
        />
      )}

      <aside 
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 z-sidebar w-64 bg-stone-900 text-stone-300 flex flex-col border-r border-stone-800 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 border-b border-stone-800 flex items-center justify-between min-h-[64px]">
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
            <span className="text-[10px] uppercase tracking-widest">Accounts</span>
          </NavLink>
          <NavLink to="/whatsapp/config" className={({isActive}) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200 group focus-visible:ring-2 focus-visible:ring-green-500 outline-none ${isActive ? 'bg-green-600 text-white font-bold' : 'hover:bg-stone-800 hover:text-white'}`}>
            <Settings className="w-4 h-4 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest">Configurations</span>
          </NavLink>
        </nav>

        <div className="p-4 border-t border-stone-800 space-y-2">
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-stone-400 hover:text-red-400 hover:bg-stone-800 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-green-500 outline-none">
            <LogOut className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-4 md:px-8 z-sticky sticky top-0 shrink-0">
          <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
            <button 
              onClick={toggleSidebar} 
              aria-label="Open menu"
              aria-expanded={isSidebarOpen}
              className="md:hidden min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center text-stone-500 hover:bg-stone-100 rounded-md focus-visible:ring-2 focus-visible:ring-green-500 outline-none"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block h-2 w-2 shrink-0 rounded-full bg-green-500 animate-pulse"></div>
            <h1 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-stone-900 truncate">
              {getPageTitle()} / Protocol Active
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Security Clearance</p>
              <p className="text-[10px] font-bold text-stone-900">Level 01 Administrator</p>
            </div>
            <div className="h-8 w-8 bg-stone-900 rounded-sm flex items-center justify-center text-green-500 font-bold text-xs">
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
        className="fixed bottom-0 w-full bg-white border-t border-stone-200 flex justify-around p-3 z-bottomnav md:hidden"
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
          <Users className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Accts</span>
        </NavLink>
        <NavLink to="/whatsapp/config" aria-current={location.pathname === '/whatsapp/config' ? 'page' : undefined} className={({isActive}) => `flex flex-col items-center gap-1 min-h-[44px] min-w-[44px] justify-center transition-colors ${isActive ? 'text-green-600' : 'text-stone-400'}`}>
          <Settings className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Conf</span>
        </NavLink>
      </nav>
    </div>
  );
}
