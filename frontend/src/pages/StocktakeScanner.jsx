import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Save, X, CheckCircle, Smartphone, List, Lock, 
  AlertTriangle, Clock, ShieldCheck, Plus, Minus, RotateCcw, 
  Barcode, EyeOff, RefreshCw, Tag, PackageCheck, 
  LogOut, Store, ChevronRight, Info
} from 'lucide-react';
import api, { getAccessToken, setAccessToken } from '../api';

const STORE_NAMES = {
  1: 'Main Store',
  2: 'Shop',
  3: 'Nandi Hills'
};

const formatKES = (amount) => {
  return 'KES ' + Number(amount || 0).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const MobileScanner = ({ sessionId = 1, setAuth }) => {
  // Navigation tabs: 'lookup' (price & stock), 'scan' (stocktake count), 'counts' (my stocktake counts)
  const [activeTab, setActiveTab] = useState('lookup');
  
  // Session & User state
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [username, setUsername] = useState('Staff');
  const [sessionStoreId, setSessionStoreId] = useState(null);

  // Notifications
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // =========================================================================
  // LOOKUP / SALES MODE STATE
  // =========================================================================
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedLookupItem, setSelectedLookupItem] = useState(null);
  const lookupInputRef = useRef(null);

  // =========================================================================
  // STOCKTAKE COUNT MODE STATE
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
  // Check Session Status & User Info
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
      if (statusRes.data.active) {
        setHasActiveSession(true);
        if (statusRes.data.session_id) {
          setCurrentSessionId(statusRes.data.session_id);
        }
        const storeId = statusRes.data.store_id;
        setSessionStoreId(storeId);
        if (storeId) {
          setSelectedStore(String(storeId));
        }
        const storeText = storeId ? ` - ${STORE_NAMES[storeId] || `Store #${storeId}`}` : '';
        const liveSalesTag = statusRes.data.allow_live_sales ? ' ⚡[Live Sales Mode]' : '';
        setSessionName((statusRes.data.name || `Session #${statusRes.data.session_id}`) + storeText + liveSalesTag);
      } else {
        setHasActiveSession(false);
        setSessionStoreId(null);
        setSessionName('');
      }
    } catch (err) {
      console.error('Session status check error:', err);
      setHasActiveSession(false);
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

  // When switching to stocktake counts tab, refresh counts
  useEffect(() => {
    if (activeTab === 'counts') {
      fetchMyCounts();
    }
  }, [activeTab]);

  // -------------------------------------------------------------------------
  // LOOKUP MODE: Debounced Search & Store Filter
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'lookup') return;
    const trimmed = lookupQuery.trim();

    const delay = setTimeout(async () => {
      setLookupLoading(true);
      try {
        const params = { q: trimmed };
        if (selectedStore !== 'all') {
          params.store_id = selectedStore;
        } else {
          params.store_id = 'all';
        }
        const res = await api.get('/api/items/search', { params });
        setLookupResults(res.data || []);
      } catch (err) {
        console.error('Lookup search failed:', err);
      } finally {
        setLookupLoading(false);
      }
    }, 200);

    return () => clearTimeout(delay);
  }, [lookupQuery, selectedStore, activeTab]);

  // Autofocus lookup input when switching to lookup tab or clearing selected item
  useEffect(() => {
    if (activeTab === 'lookup' && !selectedLookupItem && lookupInputRef.current) {
      lookupInputRef.current.focus();
    }
  }, [activeTab, selectedLookupItem]);

  // Hardware barcode scanner handler in Lookup Mode
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

      // If debounce has not resolved, query immediately
      setLookupLoading(true);
      try {
        const params = { q: trimmed };
        if (selectedStore !== 'all') params.store_id = selectedStore;
        else params.store_id = 'all';
        const res = await api.get('/api/items/search', { params });
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
  // STOCKTAKE COUNT MODE: Search & Input
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
        const res = await api.get(`/api/items/search?q=${encodeURIComponent(trimmed)}`);
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

  // Keyboard shortcut listener for hardware barcode scanners or desktop/laptop numpads
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
        const res = await api.get(`/api/items/search?q=${encodeURIComponent(trimmed)}`);
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

  // Helper for stock availability badge
  const renderStockBadge = (item) => {
    const qty = selectedStore === 'all' 
      ? (item.total_stock !== undefined ? Number(item.total_stock) : Number(item.stock_quantity || 0))
      : Number(item.stock_quantity || 0);

    if (qty > 10) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-black bg-green-50 text-green-800 border border-green-200 shrink-0">
          <span className="w-2 h-2 rounded-full bg-green-600"></span>
          {qty} in stock
        </span>
      );
    } else if (qty > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-black bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          Low: {qty} left
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-black bg-red-50 text-red-800 border border-red-200 shrink-0">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          Out of stock
        </span>
      );
    }
  };

  // Calculation for My Counts summary
  const totalUnitsCounted = myCounts.reduce((acc, curr) => acc + (parseFloat(curr.total_quantity) || 0), 0);
  const goodUnits = myCounts.filter(i => (i.condition || 'GOOD') === 'GOOD').reduce((acc, curr) => acc + (parseFloat(curr.total_quantity) || 0), 0);
  const damagedUnits = myCounts.filter(i => i.condition === 'DAMAGED').reduce((acc, curr) => acc + (parseFloat(curr.total_quantity) || 0), 0);
  const expiredUnits = myCounts.filter(i => i.condition === 'EXPIRED').reduce((acc, curr) => acc + (parseFloat(curr.total_quantity) || 0), 0);

  return (
    <div className="min-h-screen bg-stone-100 font-sans text-stone-800 flex flex-col justify-between select-none text-base">
      
      {/* ========================================================================= */}
      {/* Top Header - Enlarged, High-Contrast Mobile Navigation */}
      {/* ========================================================================= */}
      <header className="bg-white border-b border-stone-200 px-3.5 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between shadow-xs sticky top-0 z-40">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-black text-sm sm:text-base tracking-tight flex items-center gap-1.5 sm:gap-2 text-stone-900">
              <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-green-700 shrink-0" />
              <span>Mosop Mobile</span>
            </h1>

            {/* Mode Indicator Badge */}
            {activeTab === 'lookup' ? (
              <span className="text-[11px] font-black uppercase tracking-wider bg-green-50 text-green-800 px-2 py-0.5 rounded-sm border border-green-200 inline-flex items-center gap-1">
                <Tag className="w-3 h-3 text-green-700" />
                Price & Stock Check
              </span>
            ) : activeTab === 'scan' ? (
              <span className="text-[11px] font-black uppercase tracking-wider bg-stone-100 text-stone-700 px-2 py-0.5 rounded-sm border border-stone-200 inline-flex items-center gap-1">
                <EyeOff className="w-3 h-3 text-stone-500" />
                Blind Audit
              </span>
            ) : (
              <span className="text-[11px] font-black uppercase tracking-wider bg-stone-100 text-stone-700 px-2 py-0.5 rounded-sm border border-stone-200 inline-flex items-center gap-1">
                <List className="w-3 h-3 text-stone-500" />
                Audit Log
              </span>
            )}
          </div>

          <p className="text-xs text-stone-500 font-medium truncate max-w-[200px] sm:max-w-md mt-0.5">
            {hasActiveSession 
              ? (sessionName || 'Active Session') 
              : 'Inventory Catalog • Live Store Pricing'}
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
      <main className="flex-1 w-full max-w-lg md:max-w-4xl lg:max-w-5xl mx-auto p-3 sm:p-5 md:p-6 flex flex-col pb-24 sm:pb-28">
        
        {/* Floating Success Notification */}
        {successMsg && (
          <div className="bg-green-700 text-white text-sm sm:text-base font-black px-4 py-3 rounded-sm mb-4 shadow-md flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 shrink-0 border border-green-800">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="truncate">{successMsg}</span>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 1: PRICE & STOCK LOOKUP (SALES MODE) */}
        {/* ======================================================================= */}
        {activeTab === 'lookup' && (
          <div className="flex flex-col h-full flex-1 animate-in fade-in duration-150">
            
            {!selectedLookupItem ? (
              <>
                {/* Search Bar Input (Large, Touch-Friendly) */}
                <div className="relative mb-2.5 shrink-0">
                  <Search className="w-5 h-5 sm:w-6 sm:h-6 absolute left-3.5 sm:left-4 top-3.5 sm:top-4 text-stone-400" />
                  <input 
                    ref={lookupInputRef}
                    type="text" 
                    placeholder="Scan barcode or type item name / SKU..." 
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

                {/* Location Filter Pill Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 shrink-0 no-scrollbar">
                  <span className="text-xs font-black uppercase tracking-wider text-stone-500 mr-1 flex items-center gap-1 shrink-0">
                    <Store className="w-3.5 h-3.5 text-stone-400" />
                    <span>Store:</span>
                  </span>
                  {[
                    { id: 'all', label: 'All Stores' },
                    { id: '1', label: 'Main Store' },
                    { id: '2', label: 'Shop' },
                    { id: '3', label: 'Nandi Hills' },
                  ].map(st => (
                    <button
                      key={st.id}
                      onClick={() => setSelectedStore(st.id)}
                      className={`px-3 py-1.5 rounded-sm text-xs font-bold transition-all shrink-0 border ${
                        selectedStore === st.id
                          ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                {/* Status Header */}
                <div className="bg-stone-50 border border-stone-200 px-3.5 py-2 rounded-sm mb-3 flex items-center justify-between text-xs text-stone-600 shrink-0">
                  <div className="flex items-center gap-2 truncate">
                    <Info className="w-4 h-4 text-stone-400 shrink-0" />
                    <span className="truncate">
                      {lookupResults.length > 0
                        ? `Showing ${lookupResults.length} item${lookupResults.length > 1 ? 's' : ''}`
                        : lookupLoading ? 'Searching inventory...' : 'Type or scan to find items'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-green-700 shrink-0">
                    {selectedStore === 'all' ? 'All Locations' : (STORE_NAMES[selectedStore] || `Store #${selectedStore}`)}
                  </span>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto bg-white rounded-sm shadow-xs border border-stone-200 divide-y divide-stone-100">
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
                        {lookupQuery 
                          ? 'Try searching with a different keyword, barcode, or select "All Stores".' 
                          : 'Scan a physical barcode with your scanner or type a product name or SKU above.'}
                      </p>
                    </div>
                  ) : (
                    lookupResults.map((item, idx) => {
                      const retailPrice = Number(item.retail_price || 0);
                      return (
                        <div
                          key={item.sku || idx}
                          onClick={() => setSelectedLookupItem(item)}
                          className="p-3.5 sm:p-4 hover:bg-stone-50 active:bg-stone-100 cursor-pointer transition-colors flex items-center justify-between gap-3"
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

                            {/* Store Location Breakdown Mini-Pill */}
                            {item.store_breakdown && item.store_breakdown.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap text-[11px] text-stone-500 font-medium">
                                {item.store_breakdown.map((sb, sidx) => (
                                  <span key={sidx} className="inline-flex items-center gap-1 bg-stone-50 px-1.5 py-0.5 rounded-sm border border-stone-200">
                                    <span className="font-bold text-stone-700">{sb.store_name}:</span>
                                    <span className={sb.stock_quantity > 0 ? 'text-green-700 font-bold' : 'text-stone-400'}>
                                      {sb.stock_quantity}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Price & Stock Display on the right */}
                          <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
                            <div className="text-base sm:text-lg font-mono font-black text-green-800">
                              {formatKES(retailPrice)}
                            </div>
                            {renderStockBadge(item)}
                            <ChevronRight className="w-4 h-4 text-stone-300" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              // =====================================================================
              // FOCUSED PRODUCT DETAIL VIEW (FOR SALES STAFF WITH CUSTOMERS)
              // =====================================================================
              <div className="flex flex-col flex-1 animate-in zoom-in-95 duration-150">
                
                {/* Back / Close button */}
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <button
                    onClick={() => setSelectedLookupItem(null)}
                    className="px-3 py-1.5 rounded-sm bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-2xs"
                  >
                    <X className="w-4 h-4" />
                    <span>Back to Search</span>
                  </button>

                  <span className="text-xs text-stone-400 font-mono">
                    SKU: {selectedLookupItem.item_lookup_code || selectedLookupItem.sku}
                  </span>
                </div>

                <div className="bg-white border border-stone-200 rounded-sm p-4 sm:p-6 shadow-xs flex flex-col gap-4">
                  
                  {/* Title & Badges */}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-xs font-mono font-bold bg-stone-100 text-stone-800 px-2.5 py-1 rounded-sm border border-stone-200">
                        {selectedLookupItem.item_lookup_code || selectedLookupItem.sku}
                      </span>
                      {selectedLookupItem.category && (
                        <span className="text-xs uppercase font-black px-2.5 py-1 bg-blue-50 text-blue-700 rounded-sm border border-blue-200">
                          {selectedLookupItem.category}
                        </span>
                      )}
                      {selectedLookupItem.supplier && selectedLookupItem.supplier !== 'Unknown' && (
                        <span className="text-xs font-bold px-2.5 py-1 bg-amber-50 text-amber-800 rounded-sm border border-amber-200">
                          {selectedLookupItem.supplier}
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg sm:text-2xl font-black text-stone-900 leading-tight">
                      {selectedLookupItem.description}
                    </h2>
                  </div>

                  {/* PROMINENT PRICE DISPLAY */}
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

                  {/* TOTAL AVAILABLE STOCK ON HAND */}
                  <div className="bg-stone-50 border border-stone-200 rounded-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                        <PackageCheck className="w-4 h-4 text-stone-600" />
                        Total Available Stock
                      </span>
                      {renderStockBadge(selectedLookupItem)}
                    </div>
                    
                    <div className="text-2xl sm:text-3xl font-black font-mono text-stone-900">
                      {selectedLookupItem.total_stock !== undefined 
                        ? selectedLookupItem.total_stock 
                        : (selectedLookupItem.stock_quantity || 0)}{' '}
                      <span className="text-sm font-sans font-bold text-stone-500 uppercase tracking-wider">
                        Units Across Branches
                      </span>
                    </div>
                  </div>

                  {/* STORE BREAKDOWN */}
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-stone-500 block mb-2.5 flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-stone-500" />
                      Stock Breakdown By Branch
                    </span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {(selectedLookupItem.store_breakdown && selectedLookupItem.store_breakdown.length > 0) ? (
                        selectedLookupItem.store_breakdown.map((sb, idx) => {
                          const isPositive = sb.stock_quantity > 0;
                          return (
                            <div 
                              key={idx} 
                              className={`p-3 rounded-sm border ${
                                isPositive 
                                  ? 'bg-white border-stone-200 shadow-2xs' 
                                  : 'bg-stone-50 border-stone-200 opacity-60'
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-bold text-stone-700">{sb.store_name}</span>
                                <span className={`text-[10px] font-black uppercase px-1.5 py-0.2 rounded-xs ${
                                  isPositive ? 'bg-green-100 text-green-800' : 'bg-stone-200 text-stone-500'
                                }`}>
                                  {isPositive ? 'In Stock' : 'Out'}
                                </span>
                              </div>
                              <div className="text-xl font-mono font-black text-stone-900">
                                {sb.stock_quantity}{' '}
                                <span className="text-xs font-sans font-normal text-stone-400">units</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="col-span-3 p-3 bg-stone-50 rounded-sm text-xs text-stone-500 text-center">
                          Single branch stock: {selectedLookupItem.stock_quantity || 0} units
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-stone-100">
                    <button
                      onClick={() => {
                        setSelectedLookupItem(null);
                        setLookupQuery('');
                        if (lookupInputRef.current) lookupInputRef.current.focus();
                      }}
                      className="flex-1 bg-stone-900 hover:bg-black active:scale-[0.99] text-white font-black text-sm sm:text-base py-3.5 rounded-sm shadow-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <Barcode className="w-4 h-4 text-green-400" />
                      <span>Scan Next Item</span>
                    </button>

                    {hasActiveSession && (
                      <button
                        onClick={() => {
                          handleSelectCountItem(selectedLookupItem);
                          setActiveTab('scan');
                        }}
                        className="px-5 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-black text-xs sm:text-sm py-3 rounded-sm flex items-center justify-center gap-2 transition-all"
                      >
                        <Save className="w-4 h-4 text-stone-500" />
                        <span>Count in Stocktake</span>
                      </button>
                    )}
                  </div>

                </div>

              </div>
            )}

          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 2: STOCKTAKE COUNT MODE (BLIND AUDIT) */}
        {/* ======================================================================= */}
        {activeTab === 'scan' && (
          !hasActiveSession ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-sm p-8 sm:p-12 text-center shadow-sm border border-stone-200 my-auto animate-in fade-in duration-150">
              <div className="w-16 h-16 bg-stone-100 text-stone-600 rounded-sm border border-stone-200 flex items-center justify-center mb-5">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 mb-2">No Active Stocktake Session</h2>
              <p className="text-sm text-stone-600 max-w-sm mb-6 leading-relaxed">
                A manager must open a stocktake session before physical counts can be recorded. You can still use the <strong>Price & Stock</strong> tab to look up inventory.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setActiveTab('lookup')}
                  className="px-6 py-3 bg-stone-900 hover:bg-black text-white font-black rounded-sm shadow-xs text-sm flex items-center justify-center gap-2"
                >
                  <Tag className="w-4 h-4 text-green-400" />
                  <span>Go to Price & Stock Lookup</span>
                </button>
                <button
                  onClick={fetchSessionStatus}
                  className="px-5 py-3 bg-white hover:bg-stone-50 text-stone-700 font-bold border border-stone-300 rounded-sm text-sm flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4 text-stone-500" />
                  <span>Check Session Status</span>
                </button>
              </div>
            </div>
          ) : isCommitted ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-sm p-8 sm:p-12 text-center shadow-sm border border-stone-200 my-auto">
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
            // SEARCH / SCAN MODE (GENEROUS TOUCH TARGETS)
            <div className="flex flex-col h-full flex-1 animate-in fade-in duration-150">
              
              {/* Search Bar Input */}
              <div className="relative mb-3 shrink-0">
                <Search className="w-5 h-5 sm:w-6 sm:h-6 absolute left-3.5 sm:left-4 top-3.5 sm:top-4 text-stone-400" />
                <input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Scan barcode or type name..." 
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

              {/* Blind Count Notice Banner */}
              <div className="bg-stone-200/70 border border-stone-300 px-3.5 py-2 rounded-sm mb-3 flex items-center justify-between text-xs text-stone-700 shrink-0">
                <div className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-stone-500 shrink-0" />
                  <span><strong>Blind Audit:</strong> Expected system quantities and prices are hidden.</span>
                </div>
                <button
                  onClick={() => setActiveTab('lookup')}
                  className="font-bold text-green-800 hover:underline shrink-0 text-xs"
                >
                  Need Price?
                </button>
              </div>

              {/* Search Results List */}
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
                      Point the laser scanner or enter the item code to log counted shelf quantities.
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
                            <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-amber-50 text-amber-800 border border-amber-200 truncate max-w-[140px] sm:max-w-[180px]" title={item.supplier}>
                              {item.supplier}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs sm:text-sm text-stone-500 mt-2.5 font-mono">
                        <span className="bg-stone-100 px-2.5 py-1 rounded-sm text-stone-800 font-bold border border-stone-200">
                          {item.item_lookup_code || item.sku}
                        </span>
                        <span className="text-xs text-stone-400">Tap to Count</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            // =====================================================================
            // COUNTING MODE (ENLARGED KEYPAD, BIG DIGITS, BOLD LABELS)
            // =====================================================================
            <div className="flex flex-col flex-1 animate-in slide-in-from-right-3">
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-5 md:gap-6 items-start">
                
                {/* Left Column: Product Details & Condition */}
                <div className="md:col-span-5 flex flex-col gap-3.5">
                  
                  {/* Selected Item Card */}
                  <div className="bg-white p-4 sm:p-5 rounded-sm shadow-xs border border-stone-200 relative">
                    <button 
                      onClick={() => setSelectedItem(null)}
                      className="absolute top-3.5 right-3.5 p-2 bg-stone-100 hover:bg-stone-200 active:scale-90 rounded-sm text-stone-600 transition-all border border-stone-200"
                      title="Cancel & Choose another item"
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
                      <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2 py-1 rounded-sm border border-stone-200 flex items-center gap-1.5">
                        <EyeOff className="w-3.5 h-3.5 text-stone-400" />
                        Blind Audit
                      </span>
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

                  <div className="hidden md:block bg-stone-50 p-4 rounded-sm border border-stone-200 text-xs sm:text-sm text-stone-600 leading-relaxed">
                    <p className="font-bold text-stone-800 mb-1">Stocktaking Tip:</p>
                    Count the physical items present on the shelf. You can type numbers directly on your keyboard or tap the keypad.
                  </div>

                </div>

                {/* Right Column: Keypad & Quantity */}
                <div className="md:col-span-7 flex flex-col gap-3.5">
                  
                  {/* Quantity Display Box */}
                  <div className="bg-stone-900 text-white p-4 sm:p-5 rounded-sm shadow-xs flex items-center justify-between border border-stone-800">
                    <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-stone-400">
                      Counted Qty
                    </span>
                    <div className="text-3xl sm:text-5xl font-mono font-black tracking-tight text-right overflow-x-auto select-all">
                      {quantityStr || '0'}
                    </div>
                  </div>

                  {/* Quick Increment Pill Row */}
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
          )
        )}

        {/* ======================================================================= */}
        {/* TAB 3: MY COUNTS MODE (AUDIT LOG & COMMIT) */}
        {/* ======================================================================= */}
        {activeTab === 'counts' && (
          <div className="flex flex-col h-full flex-1 animate-in fade-in duration-150">
            
            {/* Header & Quick Stats */}
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
              <div>
                <h2 className="font-black text-base sm:text-lg text-stone-900">My Recorded Counts</h2>
                <p className="text-xs sm:text-sm text-stone-500">Items submitted during this active session</p>
              </div>
              
              {/* Mini Summary Counters */}
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

            {/* List of Counts */}
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
            
            {/* Complete & Commit Action */}
            <div className="pt-3.5 shrink-0">
              <button
                onClick={handleCommit}
                disabled={loading || myCounts.length === 0}
                className="w-full bg-stone-900 hover:bg-black active:scale-[0.99] text-white font-black text-sm sm:text-base py-4 sm:py-4.5 rounded-sm shadow-sm flex items-center justify-center gap-2.5 disabled:opacity-40 select-none transition-all border border-black"
              >
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>COMPLETE & COMMIT MY COUNTS</span>
              </button>
            </div>
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* Fixed Bottom Navigation - 3 TABS: Price & Stock, Stocktake, My Counts */}
      {/* ========================================================================= */}
      {!isCommitted && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex shadow-lg z-50 h-16">
          
          {/* Tab 1: Price & Stock Lookup (Sales Mode) */}
          <button 
            onClick={() => {
              setActiveTab('lookup');
              setSelectedLookupItem(null);
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'lookup' 
                ? 'text-green-800 font-black bg-green-50/40 border-t-2 border-green-700' 
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Tag className="w-5 h-5" />
            <span className="text-[11px] sm:text-xs font-bold">Price & Stock</span>
          </button>
          
          {/* Tab 2: Stocktake Count Mode */}
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
            <div className="relative">
              <Barcode className="w-5 h-5" />
              {hasActiveSession && (
                <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-green-600 animate-pulse"></span>
              )}
            </div>
            <span className="text-[11px] sm:text-xs font-bold">Stocktake Count</span>
          </button>
          
          {/* Tab 3: My Counts */}
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
