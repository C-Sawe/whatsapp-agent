import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle, Activity, Send } from 'lucide-react';
import axios from 'axios';

export default function ConfigPage() {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  
  // AI Status & Test state
  const [groqStatus, setGroqStatus] = useState('Scanning...');
  const [testInput, setTestInput] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [testing, setTesting] = useState(false);
  const [apiLimits, setApiLimits] = useState(null);

  const fetchConfig = async () => {
    try {
      const auth = localStorage.getItem('mosop_auth');
      const res = await axios.get('/api/config', {
        headers: { Authorization: auth }
      });
      setConfig(res.data);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('mosop_auth');
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchGroqStatus = async () => {
    try {
      const auth = localStorage.getItem('mosop_auth');
      const res = await axios.get('/api/groq-status', {
        headers: { Authorization: auth }
      });
      if (res.data.status === 'success') {
        setGroqStatus('Operational');
        if (res.data.limits) {
          setApiLimits(res.data.limits);
        }
      } else if (res.data.status === 'rate_limited') {
        setGroqStatus('Rate Limit Reached');
      } else {
        setGroqStatus('Error: ' + res.data.message);
      }
    } catch (err) {
      setGroqStatus('Error fetching status');
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchGroqStatus();
  }, []);

  const handleChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key) => {
    setSaving(key);
    try {
      const auth = localStorage.getItem('mosop_auth');
      await axios.post('/api/config', 
        { key, value: config[key] },
        { headers: { Authorization: auth } }
      );
      setSuccess(key);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestAI = async () => {
    if (!testInput.trim()) return;
    setTesting(true);
    setTestResponse('Processing request...');
    try {
      const auth = localStorage.getItem('mosop_auth');
      const res = await axios.post('/api/test-ai', 
        { user_text: testInput },
        { headers: { Authorization: auth } }
      );
      setTestResponse(res.data.reply);
    } catch (err) {
      setTestResponse('Error: Failed to reach AI node.');
    } finally {
      setTesting(false);
    }
  };


  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center text-xs font-black uppercase tracking-widest text-stone-500 animate-pulse">Initializing Configuration Matrix...</div>;
  }

  const renderField = (key, label, type = 'text', rows = 1) => (
    <div className="bg-white border border-stone-200 rounded-sm p-6 mb-4 shadow-sm">
      <div className="mb-0">
        <div className="flex justify-between items-center mb-4">
          <label className="text-xs font-black uppercase tracking-widest text-stone-900 m-0">{label}</label>
          <button 
            type="button" 
            onClick={() => handleSave(key)}
            disabled={saving === key}
            className="flex items-center gap-2 px-3 py-1.5 bg-stone-900 text-white rounded-sm hover:bg-stone-800 transition-colors text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
          >
            {success === key ? <CheckCircle size={14} className="text-green-500" /> : <Save size={14} />}
            {saving === key ? 'Saving...' : success === key ? 'Saved' : 'Save'}
          </button>
        </div>
        {type === 'textarea' ? (
          <textarea 
            value={config[key] || ''} 
            onChange={(e) => handleChange(key, e.target.value)}
            rows={rows}
            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-sm text-sm text-stone-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all resize-y"
          />
        ) : (
          <input 
            type="text" 
            value={config[key] || ''} 
            onChange={(e) => handleChange(key, e.target.value)}
            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-sm text-sm text-stone-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
          />
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-stone-900 p-3 rounded-sm">
          <Settings size={24} className="text-green-500" />
        </div>
        <div>
          <h1 className="text-xl font-black uppercase tracking-widest text-stone-900 m-0">Configurations</h1>
          <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mt-1 m-0">System behavior parameters</p>
        </div>
      </div>

      <div className="mb-8">
        <div className="bg-white border border-stone-200 rounded-sm p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-stone-900 m-0">AI Simulator & Status</h2>
              <div className="flex items-center gap-2 mt-3 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-sm inline-flex">
                <Activity size={14} className={groqStatus === 'Operational' ? 'text-green-500' : 'text-red-500'} />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${groqStatus === 'Operational' ? 'text-green-600' : 'text-red-600'}`}>{groqStatus}</span>
              </div>
            </div>
            
            {apiLimits && apiLimits.limit_tokens && apiLimits.remaining_tokens && (
              <div className="text-right min-w-[200px]">
                <div className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-1">
                  Network Quota ({apiLimits.remaining_tokens} left)
                </div>
                <div className="w-full bg-stone-100 h-2 rounded-sm overflow-hidden mt-1">
                  <div 
                    className="bg-green-600 h-full transition-all duration-500 ease-in-out"
                    style={{ width: `${Math.max(0, Math.min(100, (parseInt(apiLimits.remaining_tokens) / parseInt(apiLimits.limit_tokens)) * 100))}%` }}
                  ></div>
                </div>
                <div className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-2">
                  ≈ {Math.floor(parseInt(apiLimits.remaining_tokens) / 300)} transmissions remaining
                </div>
              </div>
            )}
          </div>
          
          <div className="flex gap-4 mb-4">
            <input 
              type="text" 
              placeholder="Inject payload to AI node..." 
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTestAI()}
              className="flex-1 p-3 bg-stone-50 border border-stone-200 rounded-sm text-sm text-stone-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
            />
            <button 
              onClick={handleTestAI} 
              disabled={testing || !testInput.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-sm hover:bg-green-700 transition-colors text-xs font-black uppercase tracking-widest disabled:opacity-50"
            >
              <Send size={16} /> {testing ? 'Processing...' : 'Execute'}
            </button>
          </div>
          
          {testResponse && (
            <div className="bg-stone-50 border-l-4 border-green-500 p-4 rounded-sm mt-4">
              <strong className="text-[10px] font-black uppercase tracking-widest text-stone-900 block mb-2">Node Response:</strong>
              <div className="text-sm text-stone-600 whitespace-pre-wrap font-mono">{testResponse}</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-stone-500">Business Identity</h2>
          {renderField('COMPANY_NAME', 'Company Name')}
          {renderField('SLOGAN', 'Slogan')}
          {renderField('MISSION', 'Mission Statement', 'textarea', 3)}
        </div>

        <div>
          <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-stone-500">Payment & Delivery</h2>
          {renderField('PAYBILL_NUMBER', 'M-PESA Paybill Number')}
          {renderField('ACCOUNT_NUMBER', 'Account Name')}
          {renderField('DELIVERY_NOTE', 'Delivery Location Note', 'textarea', 3)}
          {renderField('LOCATION_LINK', 'Google Maps Link')}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-stone-500">AI Behavior & Security</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {renderField('TONE', 'AI Tone & Style', 'textarea', 4)}
            {renderField('VOCABULARY', 'Vocabulary Rules', 'textarea', 4)}
          </div>
          <div>
            {renderField('SECURITY_RULES', 'Security & Guardrails', 'textarea', 10)}
          </div>
        </div>
      </div>
    </div>
  );
}
