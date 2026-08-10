import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Database, LogOut, PackageSearch, LayoutGrid, Activity, Cpu, HardDrive } from 'lucide-react';
import api from '../api';

export default function Hub({ setAuth }) {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);

  const logout = () => {
    localStorage.removeItem('mosop_auth');
    setAuth(false);
    navigate('/login');
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await api.get('/api/system-metrics', {
          });
        setMetrics(res.data);
      } catch (err) {
        console.error("Failed to fetch metrics", err);
      }
    };
    
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const modules = [
    {
      id: 'whatsapp',
      title: 'WhatsApp Automation',
      description: 'Configure AI assistant, manage orders, and view chat metrics.',
      icon: MessageSquare,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      path: '/whatsapp'
    },
    {
      id: 'inventory',
      title: 'Inventory Sync',
      description: 'Live stock monitoring from the physical Dynamics RMS database.',
      icon: Database,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      path: '/inventory'
    }
  ];

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col selection:bg-green-600/20">
      <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-8 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <LayoutGrid className="w-5 h-5 text-stone-700" />
          <h1 className="text-xs font-black uppercase tracking-[0.2em] text-stone-900">
            Mosop Central Command / Module Hub
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Security Clearance</p>
            <p className="text-[10px] font-bold text-stone-900">Level 01 Administrator</p>
          </div>
          <button onClick={logout} className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Terminate Session">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          
          {/* System Metrics Banner */}
          <div className="mb-8 flex flex-col sm:flex-row items-center justify-between bg-white border border-stone-200 p-4 rounded-xl shadow-sm gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-100 rounded-lg text-stone-600">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-stone-900">Server Health</h3>
                <p className="text-xs text-stone-500">Google Cloud e2-micro instance</p>
              </div>
            </div>
            
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-stone-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">CPU Usage</span>
                  <span className="text-sm font-semibold text-stone-900">
                    {metrics ? `${metrics.cpu_percent.toFixed(1)}%` : 'Loading...'}
                  </span>
                </div>
              </div>
              <div className="w-px h-8 bg-stone-200"></div>
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-stone-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Memory (RAM)</span>
                  <span className="text-sm font-semibold text-stone-900">
                    {metrics ? `${metrics.memory_used_mb.toFixed(0)} MB / ${metrics.memory_total_mb.toFixed(0)} MB` : 'Loading...'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-10 text-center sm:text-left">
            <h2 className="text-3xl font-black text-stone-900 tracking-tight">Select Module</h2>
            <p className="text-stone-500 mt-2">Access your deployed enterprise systems.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((mod) => (
              <button 
                key={mod.id}
                onClick={() => navigate(mod.path)}
                className="group flex flex-col text-left bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
              >
                <div className={`p-4 rounded-xl inline-flex mb-4 ${mod.bg} ${mod.color} ${mod.border} border`}>
                  <mod.icon className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-lg text-stone-900">{mod.title}</h3>
                <p className="text-stone-500 text-sm mt-2 flex-1">{mod.description}</p>
                
                <div className="mt-6 flex items-center text-xs font-bold uppercase tracking-widest text-stone-400 group-hover:text-stone-900 transition-colors">
                  Launch Module &rarr;
                </div>
                
                {/* Accent line on hover */}
                <div className={`absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-500 ${mod.bg.replace('/10', '')}`}></div>
              </button>
            ))}
            
            {/* Placeholder for future modules */}
            <div className="flex flex-col text-left bg-stone-100 p-6 rounded-2xl border border-stone-200 border-dashed items-center justify-center text-center opacity-70">
              <div className="p-4 rounded-xl inline-flex mb-4 bg-stone-200 text-stone-400">
                <PackageSearch className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg text-stone-500">Add Module</h3>
              <p className="text-stone-400 text-sm mt-2">Deploy new enterprise interfaces here.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
