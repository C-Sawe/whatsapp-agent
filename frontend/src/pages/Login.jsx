import React, { useState } from 'react';
import { ShieldCheck, Lock } from 'lucide-react';
import axios from 'axios';

export default function Login({ setAuth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/login', { username, password });
      
      const authHeader = 'Bearer ' + res.data.token;
      localStorage.setItem('mosop_auth', authHeader);
      setAuth(true);
    } catch (err) {
      if (err.response && err.response.status === 429) {
        setError('MAXIMUM ATTEMPTS EXCEEDED. LOCKOUT ACTIVE.');
      } else {
        setError('INVALID CREDENTIALS');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4 selection:bg-green-600/20">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 flex flex-col items-center">
          <img src="https://mosopfarminputs.co.ke/images/logo_transparent.webp" alt="Mosop Farm Inputs Logo" className="h-20 object-contain mb-4" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 mt-2">Central Command Unit</p>
        </div>

        <div className="bg-stone-800 border border-stone-700 p-8 rounded-sm shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Identification</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ADMINISTRATOR EMAIL"
                required
                className="w-full bg-stone-900 border border-stone-700 text-white px-4 py-3 rounded-sm text-xs font-mono focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors placeholder:text-stone-600"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Passcode</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-stone-900 border border-stone-700 text-white px-4 py-3 rounded-sm text-xs font-mono focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors placeholder:text-stone-600"
              />
            </div>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-[10px] font-black uppercase tracking-widest p-3 rounded-sm text-center">
                {error}
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest text-xs py-4 rounded-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              {loading ? 'AUTHENTICATING...' : 'AUTHORIZE ACCESS'}
            </button>
          </form>
        </div>
        
        <p className="text-center text-stone-600 text-[9px] font-black uppercase tracking-widest mt-8">
          Restricted Access. Level 01 Clearance Required.
        </p>
      </div>
    </div>
  );
}
