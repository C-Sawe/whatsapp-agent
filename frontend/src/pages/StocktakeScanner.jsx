import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Save, X, CheckCircle, Smartphone, List, AlertTriangle, 
  Clock, ShieldCheck, Plus, Minus, RotateCcw, Barcode, 
  RefreshCw, Tag, PackageCheck, LogOut
} from 'lucide-react';
import api, { getAccessToken, setAccessToken } from '../api';

const formatKES = (amount) => {
  return 'KES ' + Number(amount || 0).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const MobileScanner = ({ sessionId = 1, setAuth }) => {
  // Session & User state
  const [isAssigned, setIsAssigned] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [username, setUsername] = useState('Staff');

  // Navigation: 'lookup' (Price & Actual Stock), 'scan' (Stocktake Count), 'counts' (My Counts)
  const [activeTab, setActiveTab] = useState('lookup');

  // Notifications & Global Loading
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // =========================================================================
  // PRICE & ACTUAL STOCK LOOKUP STATE (MAIN STORE)
  // =========================================================================
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [selectedLookupItem, setSelectedLookupItem] = useState(null);
  const lookupInputRef = useRef(null);

  // =========================================================================
  // STOCKTAKE COUNT MODE STATE (UNBIASED PHYSICAL COUNTING)
  // =========================================================================
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantityStr, setQuantityStr] = useState('');
  const [condition, setCondition] = useState('GOOD');
  const [myCounts, setMyCounts] = useState([]);
  const [isCommitted, setIsCommitted] = useState(false);
  const searchInputRef = useRef(null);

  // -------------------------------------------------------------------------
  // Session Status Check & Auth
  // -------------------------------------------------------------------------
  const fetchSessionStatus = async () => {
    try {
      const token = getAccessToken();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.sub) setUsername(payload.sub);
        } catch (e) {}
      }

      const statusRes = await api.get('/api/sessions/current/status');
      if (statusRes.data && statusRes.data.active) {
        setHasActiveSession(true);
        if (statusRes.data.session_id) {
          setCurrentSessionId(statusRes.data.session_id);
        }
        setSessionName(statusRes.data.name || `Session #${statusRes.data.session_id}`);
        
        const userAssigned = Boolean(statusRes.data.is_assigned);
        setIsAssigned(userAssigned);
        
        if (statusRes.data.participant_status === 'COMMITTED') {
          setIsCommitted(true);
        }

        if (userAssigned) {
          // Assigned to active stocktake: Price & Stock lookup is strictly FORBIDDEN
          setActiveTab(prev => (prev === 'counts' ? 'counts' : 'scan'));
        } else {
          // Unassigned user / regular salesperson: Price & Stock lookup mode
          setActiveTab('lookup');
        }
      } else {
        setHasActiveSession(false);
        setIsAssigned(false);
        setSessionName('');
        setActiveTab('lookup');
      }
    } catch (err) {
      console.error('Session status check error:', err);
      setHasActiveSession(false);
      setIsAssigned(false);
      setActiveTab('lookup');
    }
  };

  const fetchMyCounts = async () => {
    try {
      const res = await api.get('/api/counts/my');
      setMyCounts(res.data || []);
    } catch (err) {
      console.error('Fetch my counts error:', err);
    }
  };

  useEffect(() => {
    fetchSessionStatus();
    fetchMyCounts();
  }, []);

  useEffect(() => {
    if (activeTab === 'counts') {
      fetchMyCounts();
    }
  }, [activeTab]);

  // -------------------------------------------------------------------------
  // LOOKUP MODE: Search Main Store Price & Actual Stock
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (isAssigned || activeTab !== 'lookup') return;
    const trimmed = lookupQuery.trim();

    const delay = setTimeout(async () => {
      setLookupLoading(true);
      try {
        const res = await api.get('/api/items/search', { 
          params: { q: trimmed, for_count: false } 
        });
        setLookupResults(res.data || []);
      } catch (err) {
        console.error('Lookup search failed:', err);
      } finally {
        setLookupLoading(false);
      }
    }, 200);

    return () => clearTimeout(delay);
  }, [lookupQuery, activeTab]);

  // Auto-focus lookup input
  useEffect(() => {
    if (activeTab === 'lookup' && !selectedLookupItem && lookupInputRef.current) {
      lookupInputRef.current.focus();
    }
  }, [activeTab, selectedLookupItem]);

  // Hardware barcode scanner support in Lookup Mode
  const handleLookupKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = lookupQuery.trim();
      if (!trimmed) return;

      if (lookupResults.length > 0) {
        const exact = lookupResults.find(r => 
          r.item_lookup_code?.toLowerCase() === trimmed.toLowerCase() ||
          r.sku?.toLowerCase() === trimmed.toLowerCase()
        );
        if (exact) {
          setSelectedLookupItem(exact);
          return;
        }
      }

      setLookupLoading(true);
      try {
        const res = await api.get('/api/items/search', { 
          params: { q: trimmed, for_count: false } 
        });
        if (res.data && res.data.length > 0) {
          const exact = res.data.find(r => 
            r.item_lookup_code?.toLowerCase() === trimmed.toLowerCase() || 
            r.sku?.toLowerCase() === trimmed.toLowerCase()
          ) || res.data[0];
          setSelectedLookupItem(exact);
        }
      } catch (err) {
        console.error('Direct lookup failed:', err);
      } finally {
        setLookupLoading(false);
      }
    }
  };

  // -------------------------------------------------------------------------
  // STOCKTAKE COUNT MODE: Unbiased Physical Counting
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'scan') return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      try {
        const res = await api.get('/api/items/search', { 
          params: { q: trimmed, for_count: true } 
        });
        setResults(res.data || []);
      } catch (err) {
        console.error('Count search failed:', err);
      }
    }, 200);
    return () => clearTimeout(delay);
  }, [query, activeTab]);

  useEffect(() => {
    if (activeTab === 'scan' && !selectedItem && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [activeTab, selectedItem]);

  const handleSelectCountItem = (item) => {
    setSelectedItem(item);
    setQuery('');
    setResults([]);
    setQuantityStr('');
    setCondition('GOOD');
  };

  // Hardware scanner or keyboard listener in Count Mode
  useEffect(() => {
    if (!selectedItem || activeTab !== 'scan') return;
    const handleKeyDown = (e) => {
      if (['0','1','2','3','4','5','6','7','8','9','.'].includes(e.key)) {
        e.preventDefault();
        handleNumpad(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleNumpad('DEL');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (quantityStr && !loading) {
          handleSave(false);
        }
      } else if (e.key === 'Escape') {
        setSelectedItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, quantityStr, loading, condition, activeTab]);

  const handleSearchKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;

      if (results.length > 0) {
        const exact = results.find(r => 
          r.item_lookup_code?.toLowerCase() === trimmed.toLowerCase() ||
          r.sku?.toLowerCase() === trimmed.toLowerCase()
        );
        handleSelectCountItem(exact || results[0]);
        return;
      }

      try {
        setLoading(true);
        const res = await api.get('/api/items/search', { 
          params: { q: trimmed, for_count: true } 
        });
        if (res.data && res.data.length > 0) {
          const exact = res.data.find(r => 
            r.item_lookup_code?.toLowerCase() === trimmed.toLowerCase() || 
            r.sku?.toLowerCase() === trimmed.toLowerCase()
          );
          handleSelectCountItem(exact || res.data[0]);
        }
      } catch (err) {
        console.error('Direct barcode lookup failed:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleNumpad = (val) => {
    if (val === 'DEL') {
      setQuantityStr(prev => prev.slice(0, -1));
    } else if (val === 'CLR') {
      setQuantityStr('');
    } else if (val === '.') {
      if (!quantityStr.includes('.')) setQuantityStr(prev => prev + '.');
    } else {
      setQuantityStr(prev => prev + val);
    }
  };

  const handleQuickAdd = (amount) => {
    const current = parseFloat(quantityStr) || 0;
    const nextVal = current + amount;
    setQuantityStr(nextVal > 0 ? String(nextVal) : '');
  };

  const handleSave = async (isSubtract = false) => {
    if (!selectedItem || !quantityStr) return;
    setLoading(true);
    
    let parsedQty = parseFloat(quantityStr);
    if (isNaN(parsedQty) || parsedQty === 0) {
      setLoading(false);
      return;
    }
    if (isSubtract) parsedQty = -Math.abs(parsedQty);

    try {
      await api.post('/api/counts', {
        session_id: currentSessionId,
        item_lookup_code: selectedItem.item_lookup_code || selectedItem.sku,
        quantity: parsedQty,
        condition: condition
      });
      
      const itemTitle = selectedItem.description || selectedItem.item_lookup_code;
      setSuccessMsg(`Saved ${parsedQty > 0 ? `+${parsedQty}` : parsedQty}x ${itemTitle} (${condition})`);
      setSelectedItem(null);
      setQuantityStr('');
      setCondition('GOOD');
      setTimeout(() => setSuccessMsg(''), 3000);
      
      fetchMyCounts();
    } catch (err) {
      console.error('Save failed:', err);
      alert('Error: ' + (err.response?.data?.detail || 'Save failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!window.confirm('Are you sure you want to Complete and Commit your counts? You will not be able to scan more items in this session.')) return;
    
    setLoading(true);
    try {
      await api.post('/api/sessions/current/commit');
      setIsCommitted(true);
      setSuccessMsg('Session Committed Successfully!');
    } catch (err) {
      console.error('Commit failed:', err);
      alert('Error: ' + (err.response?.data?.detail || 'Commit failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out from Mosop Scanner?')) {
      try {
        await api.post('/api/logout');
      } catch (e) {
        console.error('Logout error:', e);
      }
      setAccessToken(null);
      if (setAuth) setAuth(false);
      window.location.href = '/login';
    }
  };

  // Helper for actual stock badge (Main Store)
  const renderActualStockBadge = (stock) => {
    const qty = Number(stock || 0);
    if (qty > 10) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-black bg-green-50 text-green-800 border border-green-200 shrink-0">
          <span className="w-2 h-2 rounded-full bg-green-600"></span>
          Actual Stock: {qty}
        </span>
      );
    } else if (qty > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-black bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          Low Stock: {qty}
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-black bg-red-50 text-red-800 border border-red-200 shrink-0">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          Out of Stock
        </span>
      );
    }
  };

  // Calculations for My Counts summary
  const totalUnitsCounted = myCounts.reduce((acc, curr) => acc + (parseFloat(curr.total_quantity) || 0), 0);
  const goodUnits = myCounts.filter(i => (i.condition || 'GOOD') === 'GOOD').reduce((acc, curr) => acc + (parseFloat(curr.total_quantity) || 0), 0);
  const damagedUnits = myCounts.filter(i => i.condition === 'DAMAGED').reduce((acc, curr) => acc + (parseFloat(curr.total_quantity) || 0), 0);
  const expiredUnits = myCounts.filter(i => i.condition === 'EXPIRED').reduce((acc, curr) => acc + (parseFloat(curr.total_quantity) || 0), 0);

  return (
    <div className="min-h-screen bg-stone-100 font-sans text-stone-800 flex flex-col justify-between select-none text-base">
      
      {/* ========================================================================= */}
      {/* Top Header */}
      {/* ========================================================================= */}
      <header className="material-light border-b px-3.5 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between shadow-xs sticky top-0 z-40">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-black text-sm sm:text-base tracking-tight flex items-center gap-1.5 sm:gap-2 text-stone-900">
              <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-green-700 shrink-0" />
              <span>{!isAssigned ? 'Mosop Price & Stock' : 'Mosop Stocktake'}</span>
            </h1>

            {/* Badge */}
            {!isAssigned ? (
              <span className="text-[11px] font-black uppercase tracking-wider bg-green-50 text-green-800 px-2 py-0.5 rounded-sm border border-green-200 inline-flex items-center gap-1">
                <Tag className="w-3 h-3 text-green-700" />
                Main Store
              </span>
            ) : (
              <span className="text-[11px] font-black uppercase tracking-wider bg-stone-100 text-stone-700 px-2 py-0.5 rounded-sm border border-stone-200 inline-flex items-center gap-1">
                <Barcode className="w-3 h-3 text-stone-600" />
                Stocktake Count
              </span>
            )}
          </div>

          <p className="text-xs text-stone-500 font-medium truncate max-w-[200px] sm:max-w-md mt-0.5">
            {!isAssigned 
              ? 'Live Main Store Inventory & Prices' 
              : (sessionName || 'Active Stocktake Session')}
          </p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono font-bold bg-stone-100 px-2.5 py-1.5 rounded-sm text-stone-800 border border-stone-200 truncate max-w-[85px] sm:max-w-none" title={username}>
            {username}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-red-50 text-red-700 hover:bg-red-100 active:scale-95 border border-red-200 text-xs font-black transition-all shadow-2xs"
            title="Log out of scanner"
          >
            <LogOut className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span>Log Out</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* Main Responsive Body Container */}
      {/* ========================================================================= */}
      <main className={`flex-1 w-full max-w-7xl mx-auto p-3 sm:p-5 md:p-6 flex flex-col ${hasActiveSession && isAssigned && !isCommitted ? 'pb-24 sm:pb-28' : 'pb-6'}`}>
        
        {/* Floating Success Notification */}
        {successMsg && (
          <div className="bg-green-700 text-white text-sm sm:text-base font-black px-4 py-3 rounded-sm mb-4 shadow-md flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 shrink-0 border border-green-800">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="truncate">{successMsg}</span>
          </div>
        )}

        {/* ======================================================================= */}
        {/* MODE 1: PRICE & ACTUAL STOCK LOOKUP (MAIN STORE) */}
        {/* Strictly hidden for users assigned to an ongoing stocktake session */}
        {/* ======================================================================= */}
        {!isAssigned && activeTab === 'lookup' && (
          <div className="flex-1 flex flex-col animate-in fade-in duration-150">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start flex-1">
              
              {/* LEFT COLUMN: Search & Results List */}
              <div className="lg:col-span-6 xl:col-span-7 flex flex-col h-full">
                
                {/* Search Bar Input */}
                <div className="relative mb-3 shrink-0">
                  <Search className="w-5 h-5 sm:w-6 sm:h-6 absolute left-3.5 sm:left-4 top-3.5 sm:top-4 text-stone-400" />
                  <input 
                    ref={lookupInputRef}
                    type="text" 
                    placeholder="Scan barcode or type name / SKU..." 
                    value={lookupQuery}
                    onChange={(e) => setLookupQuery(e.target.value)}
                    onKeyDown={handleLookupKeyDown}
                    className="w-full bg-white border-2 border-stone-300 text-base sm:text-lg p-3.5 sm:p-4 pl-11 sm:pl-12 pr-11 sm:pr-12 rounded-sm focus:outline-none focus:border-green-700 transition-colors shadow-2xs font-sans"
                  />
                  {lookupQuery && (
                    <button 
                      onClick={() => {
                        setLookupQuery('');
                        if (lookupInputRef.current) lookupInputRef.current.focus();
                      }} 
                      className="absolute right-3.5 sm:right-4 top-3.5 sm:top-4 text-stone-400 hover:text-stone-700 p-1"
                      title="Clear search"
                    >
                      <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  )}
                </div>

                {/* Subtitle / Counter */}
                <div className="bg-stone-50 border border-stone-200 px-3.5 py-2 rounded-sm mb-3 flex items-center justify-between text-xs text-stone-600 shrink-0">
                  <span className="font-medium truncate">
                    {lookupResults.length > 0
                      ? `Found ${lookupResults.length} item${lookupResults.length > 1 ? 's' : ''}`
                      : lookupLoading ? 'Searching inventory...' : 'Type or scan barcode'}
                  </span>
                  <span className="font-mono font-bold text-stone-700">Main Store Stock</span>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto max-h-[65vh] lg:max-h-[75vh] bg-white rounded-sm shadow-xs border border-stone-200 divide-y divide-stone-100">
                  {lookupLoading && lookupResults.length === 0 ? (
                    <div className="p-12 text-center text-stone-400">
                      <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-green-700 opacity-80" />
                      <p className="font-bold text-sm text-stone-600">Checking inventory & prices...</p>
                    </div>
                  ) : lookupResults.length === 0 ? (
                    <div className="p-10 sm:p-14 text-center text-stone-400">
                      <Search className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-30 text-stone-400" />
                      <p className="font-black text-stone-700 text-base sm:text-lg">
                        {lookupQuery ? 'No matching products found' : 'Ready to Check Stock & Prices'}
                      </p>
                      <p className="text-xs sm:text-sm mt-1 text-stone-500 max-w-xs mx-auto leading-relaxed">
                        Scan a barcode with your scanner or type a product name / SKU.
                      </p>
                    </div>
                  ) : (
                    lookupResults.map((item, idx) => {
                      const retailPrice = Number(item.retail_price || 0);
                      const isSelected = selectedLookupItem?.sku === item.sku;
                      return (
                        <div
                          key={item.sku || idx}
                          onClick={() => setSelectedLookupItem(item)}
                          className={`p-3.5 sm:p-4 active:bg-stone-100 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                            isSelected ? 'bg-green-50/70 border-l-4 border-green-700' : 'hover:bg-stone-50'
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-sm bg-stone-100 text-stone-800 border border-stone-200">
                                {item.item_lookup_code || item.sku}
                              </span>
                              {item.category && (
                                <span className="text-[11px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-stone-100 text-stone-600 border border-stone-200">
                                  {item.category}
                                </span>
                              )}
                            </div>
                            
                            <p className="font-black text-stone-900 text-sm sm:text-base leading-snug line-clamp-2">
                              {item.description}
                            </p>
                          </div>

                          {/* Price & Stock Display */}
                          <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
                            <div className="text-base sm:text-lg font-mono font-black text-green-800">
                              {formatKES(retailPrice)}
                            </div>
                            {renderActualStockBadge(item.actual_stock ?? item.stock_quantity)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>

              {/* RIGHT COLUMN: Focused Product Detail (Desktop Sticky / Mobile-Tablet focused view) */}
              <div className="lg:col-span-6 xl:col-span-5">
                {selectedLookupItem ? (
                  <div className="bg-white border border-stone-200 rounded-sm p-5 sm:p-6 shadow-xs flex flex-col gap-4 sticky top-20 animate-in fade-in zoom-in-95 duration-150">
                    
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="text-xs font-mono font-bold bg-stone-100 text-stone-800 px-2.5 py-0.5 rounded-sm border border-stone-200">
                            {selectedLookupItem.item_lookup_code || selectedLookupItem.sku}
                          </span>
                          {selectedLookupItem.category && (
                            <span className="text-xs uppercase font-black px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-sm border border-blue-200">
                              {selectedLookupItem.category}
                            </span>
                          )}
                          {selectedLookupItem.supplier && selectedLookupItem.supplier !== 'Unknown' && (
                            <span className="text-xs font-bold px-2.5 py-0.5 bg-amber-50 text-amber-800 rounded-sm border border-amber-200">
                              {selectedLookupItem.supplier}
                            </span>
                          )}
                        </div>
                        <h2 className="text-base sm:text-xl font-black text-stone-900 leading-tight">
                          {selectedLookupItem.description}
                        </h2>
                      </div>

                      <button
                        onClick={() => setSelectedLookupItem(null)}
                        className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded-sm text-stone-500 border border-stone-200 shrink-0"
                        title="Close detail"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* RETAIL PRICE BOX */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50/40 border-2 border-green-600/30 rounded-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-black uppercase tracking-widest text-green-900 block mb-1">
                          Current Retail Price
                        </span>
                        <div className="text-2xl sm:text-4xl font-black font-mono text-green-900 tracking-tight">
                          {formatKES(selectedLookupItem.retail_price)}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-green-700 uppercase tracking-wider bg-white/80 px-2.5 py-1 rounded-sm border border-green-200 self-start sm:self-auto">
                        VAT / Tax Inclusive
                      </span>
                    </div>

                    {/* ACTUAL STOCK BOX (MAIN STORE ONLY) */}
                    <div className="bg-stone-50 border border-stone-200 rounded-sm p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                          <PackageCheck className="w-4 h-4 text-stone-600" />
                          Actual Stock (Main Store)
                        </span>
                        {renderActualStockBadge(selectedLookupItem.actual_stock ?? selectedLookupItem.stock_quantity)}
                      </div>
                      
                      <div className="text-2xl sm:text-3xl font-black font-mono text-stone-900">
                        {selectedLookupItem.actual_stock !== undefined 
                          ? selectedLookupItem.actual_stock 
                          : (selectedLookupItem.stock_quantity || 0)}{' '}
                        <span className="text-sm font-sans font-bold text-stone-500 uppercase tracking-wider">
                          Units on Hand
                        </span>
                      </div>
                    </div>

                    {/* Action Button: Scan Next Item */}
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setSelectedLookupItem(null);
                          setLookupQuery('');
                          if (lookupInputRef.current) lookupInputRef.current.focus();
                        }}
                        className="w-full bg-stone-900 hover:bg-stone-950 active:scale-[0.99] text-white font-black text-sm sm:text-base py-3.5 rounded-sm shadow-sm flex items-center justify-center gap-2 transition-all"
                      >
                        <Barcode className="w-4 h-4 text-green-400" />
                        <span>Scan Next Item</span>
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="hidden lg:flex flex-col items-center justify-center p-12 bg-white rounded-sm border border-dashed border-stone-300 text-center text-stone-400 min-h-[300px]">
                    <PackageCheck className="w-12 h-12 mb-3 opacity-30 text-stone-400" />
                    <p className="font-bold text-base text-stone-600">Product Details Preview</p>
                    <p className="text-xs text-stone-400 max-w-xs mt-1">
                      Click any item from the search list or scan a barcode to view its price and actual stock.
                    </p>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* ======================================================================= */}
        {/* MODE 2: STOCKTAKE COUNT (UNBIASED PHYSICAL COUNTING) */}
        {/* Prices and system stock levels are completely hidden */}
        {/* ======================================================================= */}
        {isAssigned && activeTab === 'scan' && (
          <div className="flex-1 flex flex-col">
            
            {isCommitted ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-sm p-8 sm:p-12 text-center shadow-sm border border-stone-200 my-auto animate-in fade-in duration-150">
                <div className="w-16 h-16 bg-green-50 text-green-700 rounded-sm border border-green-200 flex items-center justify-center mb-5">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-stone-900 mb-2.5">Stocktake Completed!</h2>
                <p className="text-sm sm:text-base text-stone-500 max-w-md mb-6 leading-relaxed">
                  Your physical counts have been committed and submitted directly to the Manager Dashboard.
                </p>
                <button
                  onClick={() => setIsCommitted(false)}
                  className="text-sm font-bold text-stone-700 hover:text-stone-900 underline py-2"
                >
                  Return to Review My Counts
                </button>
              </div>
            ) : !selectedItem ? (
              // SEARCH / SCAN BARCODE TO COUNT
              <div className="flex flex-col h-full flex-1 animate-in fade-in duration-150">
                
                <div className="relative mb-3 shrink-0">
                  <Search className="w-5 h-5 sm:w-6 sm:h-6 absolute left-3.5 sm:left-4 top-3.5 sm:top-4 text-stone-400" />
                  <input 
                    ref={searchInputRef}
                    type="text" 
                    placeholder="Scan barcode or type item name..." 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full bg-white border-2 border-stone-300 text-base sm:text-lg p-3.5 sm:p-4 pl-11 sm:pl-12 pr-11 sm:pr-12 rounded-sm focus:outline-none focus:border-stone-900 transition-colors shadow-2xs font-sans"
                  />
                  {query && (
                    <button 
                      onClick={() => setQuery('')} 
                      className="absolute right-3.5 sm:right-4 top-3.5 sm:top-4 text-stone-400 hover:text-stone-700 p-1"
                      title="Clear search"
                    >
                      <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  )}
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto bg-white rounded-sm shadow-xs border border-stone-200 divide-y divide-stone-100">
                  {results.length === 0 && query.trim().length >= 2 ? (
                    <div className="p-10 text-center text-stone-400">
                      <p className="font-bold text-base text-stone-600">No items found</p>
                      <p className="text-xs mt-1">Check barcode number or product name.</p>
                    </div>
                  ) : results.length === 0 ? (
                    <div className="p-12 text-center text-stone-400">
                      <Barcode className="w-12 h-12 mx-auto mb-3 opacity-30 text-stone-400" />
                      <p className="font-black text-stone-700 text-base">Scan Barcode to Count</p>
                      <p className="text-xs sm:text-sm mt-1 text-stone-400 max-w-xs mx-auto">
                        Point the scanner or enter the item code to log counted shelf quantities.
                      </p>
                    </div>
                  ) : (
                    results.map((item) => (
                      <div
                        key={item.item_lookup_code || item.sku}
                        onClick={() => handleSelectCountItem(item)}
                        className="p-4 hover:bg-stone-50 active:bg-stone-100 cursor-pointer transition-colors border-b border-stone-100 last:border-0"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-black text-stone-900 text-sm sm:text-base leading-snug line-clamp-2">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                            {item.category && (
                              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-stone-100 text-stone-700 border border-stone-200">
                                {item.category}
                              </span>
                            )}
                            {item.supplier && item.supplier !== 'Unknown' && (
                              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-amber-50 text-amber-800 border border-amber-200 truncate max-w-[140px] sm:max-w-[180px]">
                                {item.supplier}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs sm:text-sm text-stone-500 mt-2.5 font-mono">
                          <span className="bg-stone-100 px-2.5 py-1 rounded-sm text-stone-800 font-bold border border-stone-200">
                            {item.item_lookup_code || item.sku}
                          </span>
                          <span className="text-xs text-stone-400 font-sans font-bold">Tap to Count</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              // PHYSICAL COUNTING KEYPAD
              <div className="flex flex-col flex-1 animate-in slide-in-from-right-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-5 md:gap-6 items-start">
                  
                  {/* Left Column: Product Details & Condition */}
                  <div className="md:col-span-5 flex flex-col gap-3.5">
                    <div className="bg-white p-4 sm:p-5 rounded-sm shadow-xs border border-stone-200 relative">
                      <button 
                        onClick={() => setSelectedItem(null)}
                        className="absolute top-3.5 right-3.5 p-2 bg-stone-100 hover:bg-stone-200 active:scale-90 rounded-sm text-stone-600 transition-all border border-stone-200"
                        title="Cancel"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      
                      <div className="flex items-center gap-2 mb-2 flex-wrap pr-10">
                        {selectedItem.category && (
                          <span className="text-xs uppercase font-black px-2.5 py-1 bg-blue-50 text-blue-700 rounded-sm border border-blue-200">
                            {selectedItem.category}
                          </span>
                        )}
                        {selectedItem.supplier && selectedItem.supplier !== 'Unknown' && (
                          <span className="text-xs uppercase font-bold px-2.5 py-1 bg-amber-50 text-amber-800 rounded-sm border border-amber-200">
                            {selectedItem.supplier}
                          </span>
                        )}
                      </div>

                      <h2 className="text-base sm:text-xl font-black text-stone-900 pr-4 leading-tight mb-2.5">
                        {selectedItem.description}
                      </h2>
                      
                      <div className="flex items-center justify-between text-xs sm:text-sm font-mono text-stone-600 pt-2 border-t border-stone-100">
                        <span className="bg-stone-100 px-2.5 py-1 rounded-sm font-bold border border-stone-200 text-stone-800">
                          {selectedItem.item_lookup_code || selectedItem.sku}
                        </span>
                      </div>
                    </div>

                    {/* Condition Selector */}
                    <div className="bg-white p-3.5 sm:p-4 rounded-sm shadow-xs border border-stone-200">
                      <span className="text-xs font-black uppercase tracking-wider text-stone-400 block mb-2.5">
                        Item Condition
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setCondition('GOOD')}
                          className={`py-3 sm:py-3.5 px-2 text-xs sm:text-sm font-black uppercase rounded-sm transition-all flex items-center justify-center gap-1.5 border active:scale-95 ${
                            condition === 'GOOD'
                              ? 'bg-green-700 text-white border-green-800 shadow-xs ring-2 ring-green-600/30'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                          <span className="truncate">Good</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setCondition('DAMAGED')}
                          className={`py-3 sm:py-3.5 px-2 text-xs sm:text-sm font-black uppercase rounded-sm transition-all flex items-center justify-center gap-1.5 border active:scale-95 ${
                            condition === 'DAMAGED'
                              ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-600/30'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                          <span className="truncate">Damaged</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setCondition('EXPIRED')}
                          className={`py-3 sm:py-3.5 px-2 text-xs sm:text-sm font-black uppercase rounded-sm transition-all flex items-center justify-center gap-1.5 border active:scale-95 ${
                            condition === 'EXPIRED'
                              ? 'bg-red-700 text-white border-red-800 shadow-xs ring-2 ring-red-600/30'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          <Clock className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                          <span className="truncate">Expired</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Keypad & Quantity */}
                  <div className="md:col-span-7 flex flex-col gap-3.5">
                    
                    <div className="bg-stone-900 text-white p-4 sm:p-5 rounded-sm shadow-xs flex items-center justify-between border border-stone-800">
                      <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-stone-400">
                        Counted Qty
                      </span>
                      <div className="text-3xl sm:text-5xl font-mono font-black tracking-tight text-right overflow-x-auto select-all">
                        {quantityStr || '0'}
                      </div>
                    </div>

                    {/* Quick Increment Row */}
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 5, 10, 25, 50].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleQuickAdd(amt)}
                          className="bg-white hover:bg-stone-50 active:bg-stone-200 active:scale-95 text-stone-800 border border-stone-300 font-mono font-black text-xs sm:text-sm py-2.5 sm:py-3 rounded-sm shadow-2xs transition-all flex items-center justify-center gap-0.5 select-none"
                        >
                          <span>+{amt}</span>
                        </button>
                      ))}
                    </div>

                    {/* Numpad 4x3 Grid */}
                    <div className="grid grid-cols-3 gap-2 bg-white p-2.5 sm:p-3 rounded-sm border border-stone-200 shadow-xs select-none">
                      {['7','8','9','4','5','6','1','2','3','CLR','0','DEL'].map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => handleNumpad(k)}
                          className={`h-12 sm:h-14 md:h-16 text-xl sm:text-2xl font-mono font-black rounded-sm flex items-center justify-center transition-all active:scale-95 border ${
                            k === 'CLR'
                              ? 'bg-stone-100 text-red-600 border-stone-200 hover:bg-red-50 text-base sm:text-lg'
                              : k === 'DEL'
                                ? 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200 text-base sm:text-lg'
                                : 'bg-stone-50 text-stone-900 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {k === 'DEL' ? <RotateCcw className="w-5 h-5" /> : k}
                        </button>
                      ))}
                    </div>

                    {/* Action Buttons: Subtract / Save */}
                    <div className="flex gap-2.5 pt-1">
                      <button
                        onClick={() => handleSave(true)}
                        disabled={!quantityStr || loading}
                        className="w-1/3 bg-stone-100 border border-stone-300 active:bg-stone-200 hover:bg-stone-200 text-stone-700 font-black text-xs sm:text-sm md:text-base h-14 sm:h-16 rounded-sm shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-30 select-none transition-all"
                        title="Subtract quantity if miscounted"
                      >
                        <Minus className="w-5 h-5 text-stone-500 shrink-0" />
                        <span>SUBTRACT</span>
                      </button>
                      
                      <button
                        onClick={() => handleSave(false)}
                        disabled={!quantityStr || loading}
                        className="w-2/3 bg-green-700 hover:bg-green-800 active:bg-green-900 active:scale-[0.99] text-white font-black text-sm sm:text-base md:text-lg h-14 sm:h-16 rounded-sm shadow-sm flex items-center justify-center gap-2 disabled:opacity-40 select-none transition-all border border-green-800"
                      >
                        <Save className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                        <span>{loading ? 'SAVING...' : `SAVE COUNT (${condition})`}</span>
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ======================================================================= */}
        {/* MODE 3: MY RECORDED COUNTS */}
        {/* ======================================================================= */}
        {isAssigned && activeTab === 'counts' && (
          <div className="flex flex-col h-full flex-1 animate-in fade-in duration-150">
            
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
              <div>
                <h2 className="font-black text-base sm:text-lg text-stone-900">My Recorded Counts</h2>
                <p className="text-xs sm:text-sm text-stone-500">Items submitted during this active session</p>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm bg-white px-3 py-1.5 rounded-sm border border-stone-200 font-bold text-stone-700">
                  Total Units: <strong className="text-stone-900 font-black">{totalUnitsCounted}</strong>
                </span>
                {goodUnits > 0 && (
                  <span className="text-xs sm:text-sm bg-green-50 px-2.5 py-1.5 rounded-sm border border-green-200 font-bold text-green-800">
                    {goodUnits} Good
                  </span>
                )}
                {damagedUnits > 0 && (
                  <span className="text-xs sm:text-sm bg-amber-50 px-2.5 py-1.5 rounded-sm border border-amber-200 font-bold text-amber-800">
                    {damagedUnits} Damaged
                  </span>
                )}
                {expiredUnits > 0 && (
                  <span className="text-xs sm:text-sm bg-red-50 px-2.5 py-1.5 rounded-sm border border-red-200 font-bold text-red-800">
                    {expiredUnits} Expired
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white rounded-sm shadow-xs border border-stone-200 divide-y divide-stone-100">
              {myCounts.length === 0 ? (
                <div className="p-10 sm:p-14 text-center text-stone-400">
                  <List className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-30 text-stone-400" />
                  <p className="font-bold text-sm sm:text-base text-stone-700">No scans recorded yet</p>
                  <p className="text-xs sm:text-sm mt-1 text-stone-400">Your counts for this stocktake session will appear here.</p>
                </div>
              ) : (
                myCounts.map((item, idx) => (
                  <div key={idx} className="p-4 sm:p-5 flex items-center justify-between hover:bg-stone-50/50">
                    <div className="pr-3 min-w-0">
                      <p className="font-black text-stone-900 text-sm sm:text-base leading-snug truncate">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs font-mono text-stone-600 bg-stone-100 px-2 py-0.5 rounded-sm border border-stone-200">
                          {item.item_lookup_code}
                        </span>
                        {item.condition && (
                          <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-sm border ${
                            item.condition === 'DAMAGED' 
                              ? 'bg-amber-100 text-amber-800 border-amber-200' 
                              : item.condition === 'EXPIRED' 
                                ? 'bg-red-100 text-red-800 border-red-200' 
                                : 'bg-green-100 text-green-800 border-green-200'
                          }`}>
                            {item.condition}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-lg sm:text-xl font-mono font-black bg-stone-100 px-3.5 py-2 rounded-sm border border-stone-200 text-stone-900 shrink-0">
                      {item.total_quantity}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="pt-3.5 shrink-0">
              <button
                onClick={handleCommit}
                disabled={loading || myCounts.length === 0}
                className="w-full bg-stone-900 hover:bg-stone-950 active:scale-[0.99] text-white font-black text-sm sm:text-base py-4 sm:py-4.5 rounded-sm shadow-sm flex items-center justify-center gap-2.5 disabled:opacity-40 select-none transition-all border border-stone-950"
              >
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>COMPLETE & COMMIT MY COUNTS</span>
              </button>
            </div>

          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* Bottom Navigation: ONLY shown when an active stocktake session exists */}
      {/* Allows switching between Price & Stock, Scan to Count, and My Counts */}
      {/* ========================================================================= */}
      {/* Bottom Navigation: ONLY shown when user IS ASSIGNED to an active stocktake session */}
      {/* Allows switching between Scan to Count and My Counts (Price & Stock is strictly hidden) */}
      {hasActiveSession && isAssigned && !isCommitted && (
        <nav className="fixed bottom-0 left-0 right-0 material-light border-t flex shadow-lg z-50 h-16">
          
          {/* Tab 1: Scan to Count */}
          <button 
            onClick={() => {
              setActiveTab('scan');
              setSelectedItem(null);
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors relative ${
              activeTab === 'scan' 
                ? 'text-green-800 font-black bg-green-50/40 border-t-2 border-green-700' 
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Barcode className="w-5 h-5" />
            <span className="text-[11px] sm:text-xs font-bold">Scan to Count</span>
          </button>
          
          {/* Tab 2: My Counts */}
          <button 
            onClick={() => setActiveTab('counts')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'counts' 
                ? 'text-green-800 font-black bg-green-50/40 border-t-2 border-green-700' 
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <div className="relative">
              <List className="w-5 h-5" />
              {myCounts.length > 0 && (
                <span className="absolute -top-1.5 -right-3 bg-green-700 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-xs">
                  {myCounts.length}
                </span>
              )}
            </div>
            <span className="text-[11px] sm:text-xs font-bold">My Counts ({myCounts.length})</span>
          </button>

        </nav>
      )}

    </div>
  );
};

export default MobileScanner;
