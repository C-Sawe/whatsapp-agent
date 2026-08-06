import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Settings, ShoppingBag, LogOut, ShieldCheck } from 'lucide-react';

export default function Layout({ setAuth }) {
  const navigate = useNavigate();
  const location = useLocation();

  const logout = () => {
    localStorage.removeItem('mosop_auth');
    setAuth(false);
    navigate('/login');
  };

  const getPageTitle = () => {
    if (location.pathname === '/') return 'OVERVIEW';
    if (location.pathname === '/orders') return 'ORDERS';
    if (location.pathname === '/config') return 'CONFIGURATIONS';
    return 'DASHBOARD';
  };

  return (
    <div className="min-h-screen bg-stone-50 flex selection:bg-green-600/20">
      {/* Sidebar */}
      <aside className="w-64 bg-stone-900 text-stone-300 flex flex-col border-r border-stone-800">
        <div className="p-6 border-b border-stone-800 text-center">
          <img src="https://mosopfarminputs.co.ke/images/logo_transparent.webp" alt="Mosop Farm Inputs Logo" className="h-12 object-contain mx-auto mb-3" />
          <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-stone-500">Central Command Unit</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavLink to="/" end className={({isActive}) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200 group ${isActive ? 'bg-green-600 text-white font-bold' : 'hover:bg-stone-800 hover:text-white'}`}>
            <Home className="w-4 h-4 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest">Overview</span>
          </NavLink>
          <NavLink to="/orders" className={({isActive}) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200 group ${isActive ? 'bg-green-600 text-white font-bold' : 'hover:bg-stone-800 hover:text-white'}`}>
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest">Orders</span>
          </NavLink>
          <NavLink to="/config" className={({isActive}) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200 group ${isActive ? 'bg-green-600 text-white font-bold' : 'hover:bg-stone-800 hover:text-white'}`}>
            <Settings className="w-4 h-4 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest">Configurations</span>
          </NavLink>
        </nav>

        <div className="p-4 border-t border-stone-800">
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-stone-500 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200">
            <LogOut className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            <h1 className="text-xs font-black uppercase tracking-[0.2em] text-stone-900">
              {getPageTitle()} / Protocol Active
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Security Clearance</p>
              <p className="text-[10px] font-bold text-stone-900">Level 01 Administrator</p>
            </div>
            <div className="h-8 w-8 bg-stone-900 rounded-sm flex items-center justify-center text-green-500 font-bold text-xs">
              AD
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
