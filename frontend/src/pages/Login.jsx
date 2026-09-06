import React, { useState, useEffect } from 'react';
import { Lock, AlertCircle, Clock } from 'lucide-react';
import api, { setAccessToken, getUserRole } from '../api';

export default function Login({ setAuth, setRole }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Restore lockout timer on mount if page was refreshed
  useEffect(() => {
    const savedExpiry = sessionStorage.getItem('mosop_lockout_until');
    if (savedExpiry) {
      const remaining = Math.ceil((parseInt(savedExpiry, 10) - Date.now()) / 1000);
      if (remaining > 0) {
        setLockoutSeconds(remaining);
        setError('MAXIMUM ATTEMPTS EXCEEDED. LOCKOUT ACTIVE.');
      } else {
        sessionStorage.removeItem('mosop_lockout_until');
      }
    }
  }, []);

  // Live countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;

    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          sessionStorage.removeItem('mosop_lockout_until');
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;

    setLoading(true);
    setError('');

    try {
      const cleanUsername = username.trim();
      const res = await api.post('/api/login', { username: cleanUsername, password });
      
      sessionStorage.removeItem('mosop_lockout_until');
      setAccessToken(res.data.token);
      if (setRole) setRole(getUserRole());
      setAuth(true);
    } catch (err) {
      if (err.response && err.response.status === 429) {
        let seconds = 60;
        if (typeof err.response.data?.remaining_seconds === 'number') {
          seconds = err.response.data.remaining_seconds;
        } else if (typeof err.response.data?.detail?.remaining_seconds === 'number') {
          seconds = err.response.data.detail.remaining_seconds;
        } else if (err.response.headers && err.response.headers['retry-after']) {
          const parsed = parseInt(err.response.headers['retry-after'], 10);
          if (!isNaN(parsed) && parsed > 0) seconds = parsed;
        }

        setLockoutSeconds(seconds);
        sessionStorage.setItem('mosop_lockout_until', String(Date.now() + seconds * 1000));
        setError('MAXIMUM ATTEMPTS EXCEEDED. LOCKOUT ACTIVE.');
      } else {
        const remainingAttempts = err.response?.data?.remaining_attempts;
        if (typeof remainingAttempts === 'number') {
          setError(`INVALID CREDENTIALS (${remainingAttempts} ATTEMPT${remainingAttempts === 1 ? '' : 'S'} REMAINING)`);
        } else if (typeof err.response?.data?.detail === 'string') {
          setError(err.response.data.detail.toUpperCase());
        } else {
          setError('INVALID CREDENTIALS');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4 selection:bg-green-600/20">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 flex flex-col items-center">
          <img 
            src="https://mosopfarminputs.co.ke/images/logo_transparent.webp" 
            alt="Mosop Farm Inputs Logo" 
            className="h-20 object-contain mb-4" 
          />
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
                disabled={lockoutSeconds > 0}
                required
                className="w-full bg-stone-900 border border-stone-700 text-white px-4 py-3 rounded-sm text-xs font-mono focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors placeholder:text-stone-600 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Passcode</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={lockoutSeconds > 0}
                required
                className="w-full bg-stone-900 border border-stone-700 text-white px-4 py-3 rounded-sm text-xs font-mono focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors placeholder:text-stone-600 disabled:opacity-50"
              />
            </div>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/40 rounded-sm p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-red-400 text-[10px] font-black uppercase tracking-widest">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>

                {lockoutSeconds > 0 && (
                  <div className="mt-3 pt-3 border-t border-red-500/20">
                    <div className="flex items-center justify-center gap-2 text-red-300 font-mono text-xs">
                      <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                      <span className="font-semibold text-[11px] tracking-wide">TRY AGAIN IN:</span>
                      <span className="bg-red-500/25 text-red-200 px-2 py-0.5 rounded font-black text-xs tracking-wider">
                        {String(Math.floor(lockoutSeconds / 60)).padStart(2, '0')}:
                        {String(lockoutSeconds % 60).padStart(2, '0')}
                      </span>
                    </div>
                    {/* Visual countdown progress bar */}
                    <div className="w-full bg-stone-900/80 h-1.5 rounded-full mt-2.5 overflow-hidden">
                      <div 
                        className="bg-red-500 h-full transition-all duration-1000 ease-linear rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, (lockoutSeconds / 60) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={loading || lockoutSeconds > 0}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest text-xs py-4 rounded-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              {loading 
                ? 'AUTHENTICATING...' 
                : lockoutSeconds > 0 
                  ? `SYSTEM LOCKED (${lockoutSeconds}s)` 
                  : 'AUTHORIZE ACCESS'}
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
