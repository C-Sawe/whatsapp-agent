import React, { useState, useEffect } from 'react';
import { Home, Server, Cpu, Database, Activity } from 'lucide-react';
import axios from 'axios';

export default function Overview() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const auth = localStorage.getItem('mosop_auth');
        const res = await axios.get('/api/system-metrics', {
          headers: { Authorization: auth }
        });
        setMetrics(res.data);
      } catch (err) {
        console.error("Error fetching metrics", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-stone-900 p-3 rounded-sm">
          <Activity size={24} className="text-green-500" />
        </div>
        <div>
          <h1 className="text-xl font-black uppercase tracking-widest text-stone-900">System Overview</h1>
          <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mt-1">Real-time backend performance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-stone-200 rounded-sm p-6 flex flex-col items-center justify-center shadow-sm">
          <Server size={48} className="text-green-600 mb-4" />
          <h3 className="text-sm font-black uppercase tracking-widest text-stone-900 m-0">API Status</h3>
          <p className="text-green-600 font-bold text-lg mt-2">Online & Healthy</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-sm p-6 flex flex-col justify-center shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Cpu size={20} className="text-stone-400" />
            <h3 className="text-sm font-black uppercase tracking-widest text-stone-900 m-0">CPU Usage</h3>
          </div>
          {loading ? (
            <p className="text-stone-500 text-sm font-bold animate-pulse">Scanning...</p>
          ) : (
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-3xl font-black text-stone-900">{metrics?.cpu_percent || 0}%</span>
              </div>
              <div className="w-full bg-stone-100 h-2 rounded-sm overflow-hidden">
                <div 
                  className="bg-green-600 h-full transition-all duration-500 ease-in-out"
                  style={{ width: `${metrics?.cpu_percent || 0}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-stone-200 rounded-sm p-6 flex flex-col justify-center shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Database size={20} className="text-stone-400" />
            <h3 className="text-sm font-black uppercase tracking-widest text-stone-900 m-0">Memory Usage</h3>
          </div>
          {loading ? (
            <p className="text-stone-500 text-sm font-bold animate-pulse">Scanning...</p>
          ) : (
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-3xl font-black text-stone-900">{metrics?.memory_percent || 0}%</span>
                <span className="text-stone-400 text-xs font-bold mb-1">
                  {Math.round(metrics?.memory_used_mb || 0)} MB / {Math.round(metrics?.memory_total_mb || 0)} MB
                </span>
              </div>
              <div className="w-full bg-stone-100 h-2 rounded-sm overflow-hidden">
                <div 
                  className="bg-green-600 h-full transition-all duration-500 ease-in-out"
                  style={{ width: `${metrics?.memory_percent || 0}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
