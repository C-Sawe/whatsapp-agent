import React, { useState, useEffect, useMemo } from 'react';
import { 
  Download, RefreshCcw, FileText, Database, PlusCircle, X, BarChart2, 
  Search, Filter, ArrowUpDown, ChevronDown, ChevronRight, AlertTriangle, 
  Clock, ShieldCheck, Zap, DollarSign, UserCheck, AlertCircle,
  Maximize2, Minimize2, FileSpreadsheet
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../api';

const ManagerDashboard = ({ sessionId = 1 }) => {
  const [counts, setCounts] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  
  const [activeSessionInfo, setActiveSessionInfo] = useState({ 
    name: '', 
    description: '', 
    session_id: null,
    allow_live_sales: false,
    store_id: null
  });
  
  const [showModal, setShowModal] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionDesc, setNewSessionDesc] = useState('');
  const [newSessionLiveSales, setNewSessionLiveSales] = useState(false);
  
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
  const [historicalSessions, setHistoricalSessions] = useState([]);
  const [selectedHistorySession, setSelectedHistorySession] = useState(null);
  const [isModalMaximized, setIsModalMaximized] = useState(false);
  const [historyCounts, setHistoryCounts] = useState([]);
  const [historyModalTab, setHistoryModalTab] = useState('counts'); // 'counts', 'valuation', 'analysis'
  const [historyAnalysisData, setHistoryAnalysisData] = useState(null);
  const [valuationData, setValuationData] = useState(null);
  
  // History table filters & sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [sortBy, setSortBy] = useState('alpha_asc'); // 'alpha_asc', 'alpha_desc', 'discrepancy_desc', 'qty_desc', 'damaged_desc', 'expired_desc'
  const [expandedSku, setExpandedSku] = useState(null);
  const [valuationSubTab, setValuationSubTab] = useState('combined'); // 'combined', 'damaged', 'expired', 'discrepancy'

  const [availableStores, setAvailableStores] = useState([]);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [newParticipantId, setNewParticipantId] = useState('');

  // Pagination states
  const [historySessionPage, setHistorySessionPage] = useState(1);
  const historySessionsPerPage = 6;
  const [auditCurrentPage, setAuditCurrentPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(25);
  const [activeCurrentPage, setActiveCurrentPage] = useState(1);
  const [activePageSize, setActivePageSize] = useState(25);

  const fetchSessionCounts = async () => {
    setLoading(true);
    try {
      const [countsRes, statusRes, historyRes] = await Promise.all([
        api.get('/api/sessions/current/counts'),
        api.get('/api/sessions/current/status'),
        api.get('/api/sessions')
      ]);
      
      const countsData = Array.isArray(countsRes.data) ? countsRes.data : (countsRes.data?.counts || []);
      setCounts(countsData);

      if (statusRes.data.active) {
        setParticipants(statusRes.data.participants || []);
        setActiveSessionInfo({ 
          name: statusRes.data.name || '', 
          description: statusRes.data.description || '',
          session_id: statusRes.data.session_id,
          allow_live_sales: !!statusRes.data.allow_live_sales,
          store_id: statusRes.data.store_id
        });
      } else {
        setActiveSessionInfo({ name: '', description: '', session_id: null, allow_live_sales: false, store_id: null });
        setParticipants([]);
      }

      if (Array.isArray(historyRes.data)) setHistoricalSessions(historyRes.data);
      
      const eatTime = new Date().toLocaleTimeString('en-US', { timeZone: 'Africa/Nairobi', hour12: false });
      setLastSync(`${eatTime} EAT`);
    } catch (err) {
      console.error("Failed to fetch counts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionCounts();
    const interval = setInterval(() => {
      fetchSessionCounts();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleExportRMS = async (sessionIdToExport = null) => {
    try {
      const urlPath = sessionIdToExport 
        ? `/api/sessions/history/${sessionIdToExport}/export-rms` 
        : '/api/sessions/current/export-rms';
      const res = await api.get(urlPath, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rms_import_session_${sessionIdToExport || 'current'}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error("Failed to download RMS import CSV", err);
      alert("No data available to export.");
    }
  };

  const handleExportAuditReport = async (sessionIdToExport = null) => {
    try {
      const urlPath = sessionIdToExport 
        ? `/api/sessions/history/${sessionIdToExport}/export-audit-report` 
        : '/api/sessions/current/export-audit-report';
      const res = await api.get(urlPath, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_report_session_${sessionIdToExport || 'current'}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error("Failed to download Audit Report CSV", err);
      alert("No data available to export.");
    }
  };

  const handleExport = handleExportAuditReport;

  const handleToggleLiveSales = async (session_id) => {
    if (!session_id) return;
    try {
      const res = await api.post(`/api/sessions/${session_id}/toggle-live-sales`);
      const newStatus = res.data.allow_live_sales;
      
      // Update active session info if current
      if (activeSessionInfo.session_id === session_id) {
        setActiveSessionInfo(prev => ({ ...prev, allow_live_sales: newStatus }));
      }
      // Update history session if in modal
      if (selectedHistorySession && selectedHistorySession.session_id === session_id) {
        setSelectedHistorySession(prev => ({ ...prev, allow_live_sales: newStatus }));
      }
      
      fetchSessionCounts();
      if (selectedHistorySession) {
        viewHistoryDetails({ ...selectedHistorySession, allow_live_sales: newStatus });
      }
    } catch (err) {
      console.error("Failed to toggle live sales mode", err);
      alert("Error toggling live sales mode.");
    }
  };

  const viewHistoryDetails = async (session) => {
    try {
      setSelectedHistorySession(session);
      setHistoryModalTab('counts');
      setSearchQuery('');
      setSelectedDepartment('ALL');
      setExpandedSku(null);
      setAuditCurrentPage(1);
      
      const [countsRes, valRes] = await Promise.all([
        api.get(`/api/sessions/history/${session.session_id}/counts`),
        api.get(`/api/sessions/history/${session.session_id}/valuation-report`)
      ]);
      
      const items = Array.isArray(countsRes.data) ? countsRes.data : (countsRes.data?.counts || []);
      setHistoryCounts(items);
      setValuationData(valRes.data);
    } catch (err) {
      console.error("Failed to load history details", err);
      alert("Failed to load session details.");
    }
  };

  const fetchHistoryAnalysis = async (sid) => {
    try {
      const res = await api.get(`/api/sessions/history/${sid}/analysis`);
      setHistoryAnalysisData(res.data);
    } catch (err) {
      console.error("Failed to load analysis", err);
    }
  };

  const handleStartSession = async () => {
    const today = new Date().toISOString().split('T')[0];
    setNewSessionName(`Stocktake ${today}`);
    setNewSessionDesc('');
    setSelectedStore('');
    setSelectedEmployees([]);
    setNewSessionLiveSales(false);
    setShowModal(true);
    
    try {
      const [storesRes, usersRes] = await Promise.all([
        api.get('/api/stores'),
        api.get('/api/users')
      ]);
      setAvailableStores(storesRes.data);
      setAvailableEmployees(usersRes.data.filter(u => u.role === 'EMPLOYEE'));
    } catch (err) {
      console.error("Failed to load stores/employees", err);
    }
  };

  const confirmStartSession = async (e) => {
    e.preventDefault();
    if (!selectedStore) return alert("Please select a store");
    try {
      await api.post('/api/sessions', { 
        name: newSessionName, 
        description: newSessionDesc,
        store_id: parseInt(selectedStore),
        employee_ids: selectedEmployees,
        allow_live_sales: newSessionLiveSales
      });
      setShowModal(false);
      alert("New session started!");
      fetchSessionCounts();
    } catch (err) {
      console.error("Failed to start session", err);
      alert("Failed to start session");
    }
  };

  const handleOpenAddParticipant = async () => {
    setShowAddParticipantModal(true);
    try {
      const usersRes = await api.get('/api/users');
      const allEmployees = usersRes.data.filter(u => u.role === 'EMPLOYEE');
      const currentParticipantIds = participants.map(p => p.user_id);
      setAvailableEmployees(allEmployees.filter(emp => !currentParticipantIds.includes(emp.id)));
      setNewParticipantId('');
    } catch (err) {
      console.error("Failed to load employees", err);
    }
  };

  const confirmAddParticipant = async (e) => {
    e.preventDefault();
    if (!newParticipantId) return alert("Please select an employee");
    try {
      await api.post(`/api/sessions/${activeSessionInfo.session_id}/participants`, { user_id: parseInt(newParticipantId) });
      setShowAddParticipantModal(false);
      fetchSessionCounts();
    } catch (err) {
      console.error("Failed to add participant", err);
      alert("Error adding participant.");
    }
  };

  const handleCloseSession = async () => {
    if (!activeSessionInfo.session_id) return alert("No active session to close.");
    if (!window.confirm("Are you sure you want to close this session? All count submissions will be finalized.")) return;
    try {
      await api.post(`/api/sessions/${activeSessionInfo.session_id}/close`);
      alert("Session closed successfully!");
      fetchSessionCounts();
      setActiveSessionInfo({ name: '', description: '', session_id: null, allow_live_sales: false, store_id: null });
      setCounts([]);
      setParticipants([]);
    } catch (err) {
      console.error("Failed to close session", err);
      alert("Failed to close session");
    }
  };

  // Distinct departments in the current history view
  const departments = useMemo(() => {
    const set = new Set();
    historyCounts.forEach(item => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set).sort();
  }, [historyCounts]);

  // Filter and sort history items
  const filteredHistoryItems = useMemo(() => {
    return historyCounts.filter(item => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || 
        (item.item_lookup_code && item.item_lookup_code.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q));
      
      const matchesDept = selectedDepartment === 'ALL' || item.category === selectedDepartment;
      return matchesSearch && matchesDept;
    }).sort((a, b) => {
      if (sortBy === 'alpha_asc') return (a.description || '').localeCompare(b.description || '');
      if (sortBy === 'alpha_desc') return (b.description || '').localeCompare(a.description || '');
      if (sortBy === 'discrepancy_desc') return Math.abs(b.discrepancy || 0) - Math.abs(a.discrepancy || 0);
      if (sortBy === 'qty_desc') return (b.cumulative_quantity || 0) - (a.cumulative_quantity || 0);
      if (sortBy === 'damaged_desc') return (b.damaged_quantity || 0) - (a.damaged_quantity || 0);
      if (sortBy === 'expired_desc') return (b.expired_quantity || 0) - (a.expired_quantity || 0);
      return 0;
    });
  }, [historyCounts, searchQuery, selectedDepartment, sortBy]);

  // Reset audit page when filters change
  useEffect(() => {
    setAuditCurrentPage(1);
  }, [searchQuery, selectedDepartment, sortBy]);

  // Paginated Audit Modal Items
  const totalAuditPages = auditPageSize === 'all' ? 1 : Math.max(1, Math.ceil(filteredHistoryItems.length / Number(auditPageSize)));
  const paginatedAuditItems = useMemo(() => {
    if (auditPageSize === 'all') return filteredHistoryItems;
    const size = Number(auditPageSize);
    const start = (auditCurrentPage - 1) * size;
    return filteredHistoryItems.slice(start, start + size);
  }, [filteredHistoryItems, auditCurrentPage, auditPageSize]);

  // Paginated Historical Sessions
  const totalHistorySessionPages = Math.max(1, Math.ceil(historicalSessions.length / historySessionsPerPage));
  const paginatedHistoricalSessions = useMemo(() => {
    const start = (historySessionPage - 1) * historySessionsPerPage;
    return historicalSessions.slice(start, start + historySessionsPerPage);
  }, [historicalSessions, historySessionPage, historySessionsPerPage]);

  // Paginated Active Session Counts
  const activeCountsList = useMemo(() => Array.isArray(counts) ? counts : [], [counts]);
  const totalActivePages = activePageSize === 'all' ? 1 : Math.max(1, Math.ceil(activeCountsList.length / Number(activePageSize)));
  const paginatedActiveCounts = useMemo(() => {
    if (activePageSize === 'all') return activeCountsList;
    const size = Number(activePageSize);
    const start = (activeCurrentPage - 1) * size;
    return activeCountsList.slice(start, start + size);
  }, [activeCountsList, activeCurrentPage, activePageSize]);

  const totalScans = (Array.isArray(counts) ? counts : []).reduce((sum, item) => sum + parseFloat(item.cumulative_quantity || item.total_quantity || 0), 0);

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-800">
      {/* Top Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-sm border border-blue-100">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight text-stone-900">Stocktake Manager</h1>
              <p className="text-xs text-stone-500">Live reconciliation & audit control</p>
            </div>
          </div>
          <div className="flex bg-stone-100 p-0.5 rounded-sm border border-stone-200">
            <button 
              onClick={() => setActiveTab('active')} 
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-sm transition-all ${activeTab === 'active' ? 'bg-white shadow-sm text-stone-900 border border-stone-200' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Active Session
            </button>
            <button 
              onClick={() => setActiveTab('history')} 
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-sm transition-all ${activeTab === 'history' ? 'bg-white shadow-sm text-stone-900 border border-stone-200' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Session History ({historicalSessions.length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block mr-2">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Auto Sync</p>
            <p className="text-xs font-mono font-medium text-stone-600">{lastSync || 'Connecting...'}</p>
          </div>
          <button 
            onClick={fetchSessionCounts}
            className="p-2 bg-stone-100 hover:bg-stone-200 rounded-sm text-stone-600 transition-colors border border-stone-200"
            title="Refresh Data"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => handleExportAuditReport()} 
            disabled={counts.length === 0}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 rounded-sm font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
            title="Download Full Audit Report CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Audit CSV</span>
          </button>
          <button 
            onClick={() => handleExportRMS()} 
            disabled={counts.length === 0}
            className="flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white px-3 py-2 rounded-sm font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
            title="Download RMS Import Format (ItemLookupCode, Quantity)"
          >
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">RMS CSV</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {activeTab === 'active' ? (
          <>
            {/* Active Session Status Card */}
            <div className="bg-white border border-stone-200 rounded-sm p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-xs font-black uppercase tracking-widest text-green-700 bg-green-50 px-2 py-0.5 rounded-sm border border-green-200">
                      {activeSessionInfo.session_id ? 'Active Session' : 'No Open Session'}
                    </span>
                    {activeSessionInfo.store_id && (
                      <span className="text-xs font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-sm border border-stone-200">
                        Store #{activeSessionInfo.store_id}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-black text-stone-900">
                    {activeSessionInfo.name || 'No Active Stocktake Session'}
                  </h2>
                  {activeSessionInfo.description && (
                    <p className="text-sm text-stone-500 mt-1">{activeSessionInfo.description}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Live Sales Toggle Button */}
                  {activeSessionInfo.session_id && (
                    <button
                      onClick={() => handleToggleLiveSales(activeSessionInfo.session_id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-sm text-xs font-bold transition-all border ${
                        activeSessionInfo.allow_live_sales
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 shadow-sm'
                          : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200'
                      }`}
                      title="Toggle automatic POS cashier sales reconciliation during stocktake"
                    >
                      <Zap className={`w-4 h-4 ${activeSessionInfo.allow_live_sales ? 'text-amber-600 fill-amber-600' : 'text-stone-400'}`} />
                      <span>Live Sales Mode: <strong>{activeSessionInfo.allow_live_sales ? 'ON (Reconciling)' : 'OFF'}</strong></span>
                    </button>
                  )}

                  {!activeSessionInfo.session_id ? (
                    <button 
                      onClick={handleStartSession}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-sm font-black text-xs uppercase tracking-wider transition-colors shadow-sm"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Start New Stocktake
                    </button>
                  ) : (
                    <button 
                      onClick={handleCloseSession}
                      className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-2.5 rounded-sm font-black text-xs uppercase tracking-wider transition-colors"
                    >
                      Close Session
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Active Session Participants */}
            {activeSessionInfo.session_id && (
              <div className="bg-white border border-stone-200 rounded-sm p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-blue-600" />
                      <span>Assigned Staff ({participants.length})</span>
                    </h3>
                    <p className="text-xs text-stone-500">Real-time status of employees authorized to count</p>
                  </div>
                  <button 
                    onClick={handleOpenAddParticipant}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-sm border border-blue-200 transition-colors"
                  >
                    + Assign Employee
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {participants.map(p => (
                    <div key={p.username} className="bg-stone-50 p-3 rounded-sm border border-stone-200 flex items-center justify-between">
                      <span className="font-bold text-stone-800 text-sm">{p.username}</span>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                        p.status === 'COMMITTED' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                  {participants.length === 0 && (
                    <p className="text-sm text-stone-400 italic">No participants assigned yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* Active Counts Table */}
            <div className="bg-white border border-stone-200 rounded-sm overflow-hidden shadow-sm">
              <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
                <div>
                  <h3 className="font-bold text-base text-stone-900">Live Physical Counts</h3>
                  <p className="text-xs text-stone-500">Consolidated product scans in current session</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-stone-600">
                  <span>Total Scans:</span>
                  <span className="bg-stone-200 text-stone-800 px-2.5 py-1 rounded-sm font-mono border border-stone-300">{totalScans}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-xs border-b border-stone-200 font-bold">
                    <tr>
                      <th className="px-6 py-3.5">SKU</th>
                      <th className="px-6 py-3.5">Description</th>
                      <th className="px-6 py-3.5">Department</th>
                      <th className="px-6 py-3.5 text-right">Physical Count</th>
                      <th className="px-6 py-3.5 text-right">Condition Breakdown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {paginatedActiveCounts.map((item, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-3.5 font-mono text-stone-600 font-semibold">{item.item_lookup_code || item.sku}</td>
                        <td className="px-6 py-3.5 font-bold text-stone-900">{item.description}</td>
                        <td className="px-6 py-3.5 text-xs text-stone-500">{item.category || 'General'}</td>
                        <td className="px-6 py-3.5 text-right font-black text-stone-900 text-base">
                          {item.cumulative_quantity !== undefined ? item.cumulative_quantity : item.total_quantity}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5 text-xs">
                            {item.good_quantity > 0 && (
                              <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-sm border border-green-200 font-medium">
                                {item.good_quantity} Good
                              </span>
                            )}
                            {item.damaged_quantity > 0 && (
                              <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-sm border border-amber-200 font-medium">
                                {item.damaged_quantity} Damaged
                              </span>
                            )}
                            {item.expired_quantity > 0 && (
                              <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-sm border border-red-200 font-medium">
                                {item.expired_quantity} Expired
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {activeCountsList.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-stone-400">
                          No items counted yet in this session.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Active Counts Pagination Bar */}
              {activeCountsList.length > 0 && (
                <div className="bg-white px-4 py-3 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 text-stone-500">
                    <span>
                      Showing {activeCountsList.length === 0 ? 0 : (activePageSize === 'all' ? 1 : (activeCurrentPage - 1) * Number(activePageSize) + 1)}–{activePageSize === 'all' ? activeCountsList.length : Math.min(activeCurrentPage * Number(activePageSize), activeCountsList.length)} of {activeCountsList.length} items
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span>Rows per page:</span>
                      <select
                        value={activePageSize}
                        onChange={e => {
                          setActivePageSize(e.target.value);
                          setActiveCurrentPage(1);
                        }}
                        className="bg-stone-50 border border-stone-200 rounded-sm px-2 py-1 text-xs font-medium focus:outline-none"
                      >
                        <option value="15">15</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="all">All</option>
                      </select>
                    </div>
                  </div>

                  {totalActivePages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setActiveCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={activeCurrentPage === 1}
                        className="px-2.5 py-1 border border-stone-200 rounded-sm text-xs font-bold text-stone-600 disabled:opacity-40 hover:bg-stone-50 transition-colors"
                      >
                        ‹ Prev
                      </button>
                      <span className="px-2 font-mono font-bold text-stone-700">
                        Page {activeCurrentPage} of {totalActivePages}
                      </span>
                      <button
                        onClick={() => setActiveCurrentPage(prev => Math.min(prev + 1, totalActivePages))}
                        disabled={activeCurrentPage === totalActivePages}
                        className="px-2.5 py-1 border border-stone-200 rounded-sm text-xs font-bold text-stone-600 disabled:opacity-40 hover:bg-stone-50 transition-colors"
                      >
                        Next ›
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* HISTORICAL SESSIONS LIST */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-stone-900">Stocktake History</h2>
                <p className="text-xs text-stone-500">Review past counts, audit trails, and financial loss evaluations</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedHistoricalSessions.map(session => {
                const isLive = session.status === 'OPEN';
                return (
                  <div 
                    key={session.session_id} 
                    className="bg-white border border-stone-200 rounded-sm p-5 shadow-sm hover:border-stone-400 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                          isLive ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-stone-100 text-stone-700 border border-stone-200'
                        }`}>
                          {session.status}
                        </span>
                        {session.allow_live_sales && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-600" />
                            Live Sales
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-lg text-stone-900 mb-1">{session.name}</h3>
                      {session.description && (
                        <p className="text-xs text-stone-500 mb-3 line-clamp-2">{session.description}</p>
                      )}
                      <div className="space-y-1 text-xs text-stone-600 font-mono border-t border-stone-100 pt-3">
                        <p>Store: <strong>Store #{session.store_id}</strong></p>
                        <p>Started: {new Date(session.created_at).toLocaleDateString()}</p>
                        <p>Closed: {session.closed_at ? new Date(session.closed_at).toLocaleDateString() : 'In Progress'}</p>
                      </div>
                    </div>

                    <div className="pt-4 mt-3 border-t border-stone-100 flex items-center justify-between">
                      <button
                        onClick={() => viewHistoryDetails(session)}
                        className="w-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-sm transition-colors text-center border border-stone-900 shadow-sm"
                      >
                        Inspect Audit & Report →
                      </button>
                    </div>
                  </div>
                );
              })}
              {historicalSessions.length === 0 && (
                <div className="col-span-full bg-white p-12 text-center rounded-sm border border-stone-200 text-stone-400">
                  No stocktake history found.
                </div>
              )}
            </div>

            {/* Historical Sessions Pagination Bar */}
            {totalHistorySessionPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 border border-stone-200 rounded-sm shadow-sm">
                <span className="text-xs text-stone-500 font-medium">
                  Showing {(historySessionPage - 1) * historySessionsPerPage + 1}–{Math.min(historySessionPage * historySessionsPerPage, historicalSessions.length)} of {historicalSessions.length} sessions
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setHistorySessionPage(prev => Math.max(prev - 1, 1))}
                    disabled={historySessionPage === 1}
                    className="px-3 py-1.5 border border-stone-200 text-xs font-bold text-stone-700 rounded-sm disabled:opacity-40 hover:bg-stone-50 transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalHistorySessionPages }, (_, i) => i + 1).map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => setHistorySessionPage(pageNum)}
                      className={`w-8 h-8 text-xs font-black rounded-sm transition-colors ${
                        historySessionPage === pageNum 
                          ? 'bg-stone-900 text-white' 
                          : 'border border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    onClick={() => setHistorySessionPage(prev => Math.min(prev + 1, totalHistorySessionPages))}
                    disabled={historySessionPage === totalHistorySessionPages}
                    className="px-3 py-1.5 border border-stone-200 text-xs font-bold text-stone-700 rounded-sm disabled:opacity-40 hover:bg-stone-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Start Session Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-stone-200 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-4 text-stone-900">Start New Stocktake Session</h2>
            <form onSubmit={confirmStartSession} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-500 mb-1">Session Name</label>
                <input 
                  type="text" 
                  value={newSessionName} 
                  onChange={e => setNewSessionName(e.target.value)} 
                  className="w-full border border-stone-300 rounded-sm p-2.5 text-sm focus:border-green-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-500 mb-1">Description</label>
                <textarea 
                  value={newSessionDesc} 
                  onChange={e => setNewSessionDesc(e.target.value)} 
                  className="w-full border border-stone-300 rounded-sm p-2.5 text-sm h-20 focus:border-green-500 focus:outline-none"
                  placeholder="e.g. Q3 End of Month Stocktake"
                />
              </div>
              
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-500 mb-1">Target Store</label>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full border border-stone-300 rounded-sm p-2.5 text-sm focus:border-green-500 focus:outline-none bg-white"
                  required
                >
                  <option value="" disabled>Select target store</option>
                  {availableStores.map(s => (
                    <option key={s.store_id} value={s.store_id}>
                      { {1: "Main Warehouse", 2: "Town Shop", 3: "Nandi Hills Branch"}[s.store_id] || `Store #${s.store_id}` }
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Sales Mode Toggle */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-sm p-3.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newSessionLiveSales}
                    onChange={(e) => setNewSessionLiveSales(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-amber-600 rounded-[4px] focus:ring-amber-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                      Live Sales Reconciliation Mode
                    </span>
                    <p className="text-[11px] text-amber-700/90 mt-0.5">
                      Check this if cashier sales will continue during the stocktake. Sold units will be automatically added to physical counts for discrepancy auditing.
                    </p>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-500 mb-1">Assign Employees</label>
                <div className="border border-stone-200 rounded-sm p-3 max-h-36 overflow-y-auto space-y-2 bg-stone-50">
                  {availableEmployees.map(emp => (
                    <label key={emp.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(emp.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedEmployees([...selectedEmployees, emp.id]);
                          else setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                        }}
                        className="w-4 h-4 text-green-600 rounded-[4px] focus:ring-green-500"
                      />
                      <span className="text-xs font-medium text-stone-800">{emp.username}</span>
                    </label>
                  ))}
                  {availableEmployees.length === 0 && <p className="text-xs text-stone-400 italic">No employees found.</p>}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-stone-300 rounded-sm text-xs font-bold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-green-600 text-white rounded-sm text-xs font-bold hover:bg-green-700 shadow-sm"
                >
                  Initialize Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Participant Modal */}
      {showAddParticipantModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border border-stone-200 animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold mb-3 text-stone-900">Assign Staff to Stocktake</h2>
            <form onSubmit={confirmAddParticipant} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-500 mb-1">Select Employee</label>
                <select
                  value={newParticipantId}
                  onChange={(e) => setNewParticipantId(e.target.value)}
                  className="w-full border border-stone-300 rounded-sm p-2.5 text-sm focus:border-blue-500 focus:outline-none bg-white"
                  required
                >
                  <option value="" disabled>Choose employee</option>
                  {availableEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.username}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddParticipantModal(false)}
                  className="px-4 py-2 border border-stone-300 rounded-sm text-xs font-bold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-blue-600 text-white rounded-sm text-xs font-bold hover:bg-blue-700 shadow-sm"
                >
                  Add Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Details & Valuation Report Modal */}
      {selectedHistorySession && (
        <div className={`fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm transition-all duration-200 ${
          isModalMaximized ? 'p-0' : 'p-2 sm:p-5'
        }`}>
          <div className={`bg-white shadow-2xl flex flex-col transition-all duration-200 overflow-hidden ${
            isModalMaximized 
              ? 'w-full h-full rounded-none' 
              : 'w-full max-w-6xl h-[92vh] rounded-2xl border border-stone-200 shadow-2xl animate-in zoom-in-95'
          }`}>
            
            {/* Modal Header */}
            <div className="px-6 py-3.5 border-b border-stone-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-stone-50/80 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="text-xl font-black text-stone-900">{selectedHistorySession.name}</h2>
                  <span className="text-xs font-bold text-stone-600 bg-stone-200 px-2 py-0.5 rounded-sm border border-stone-300">
                    Store #{selectedHistorySession.store_id}
                  </span>
                  {selectedHistorySession.allow_live_sales && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-600" />
                      Live Sales Reconciled
                    </span>
                  )}
                </div>
                <div className="text-xs text-stone-500 flex gap-4 font-mono">
                  <span>Started: {new Date(selectedHistorySession.created_at).toLocaleString()}</span>
                  <span>Closed: {selectedHistorySession.closed_at ? new Date(selectedHistorySession.closed_at).toLocaleString() : 'In Progress'}</span>
                </div>
              </div>

              {/* Navigation Tabs and Actions inside Modal */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex bg-stone-200/80 p-0.5 rounded-sm border border-stone-300/70">
                  <button 
                    onClick={() => setHistoryModalTab('counts')}
                    className={`px-3 py-1.5 rounded-sm text-xs font-black uppercase tracking-wider transition-all ${
                      historyModalTab === 'counts' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Counts & Audit
                  </button>
                  <button 
                    onClick={() => setHistoryModalTab('valuation')}
                    className={`px-3 py-1.5 rounded-sm text-xs font-black uppercase tracking-wider transition-all ${
                      historyModalTab === 'valuation' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Valuation & Loss Report
                  </button>
                  <button 
                    onClick={() => {
                      setHistoryModalTab('analysis');
                      if (!historyAnalysisData) fetchHistoryAnalysis(selectedHistorySession.session_id);
                    }}
                    className={`px-3 py-1.5 rounded-sm text-xs font-black uppercase tracking-wider transition-all ${
                      historyModalTab === 'analysis' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Scan Analytics
                  </button>
                </div>

                <div className="h-6 w-px bg-stone-300 mx-0.5 hidden sm:block"></div>

                {/* Two Download Buttons */}
                <button 
                  onClick={() => handleExportAuditReport(selectedHistorySession.session_id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-sm text-xs font-black transition-all shadow-sm active:scale-95"
                  title="Download Comprehensive Audit & Valuation CSV Report"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Report CSV</span>
                  <span className="sm:hidden">Report</span>
                </button>

                <button 
                  onClick={() => handleExportRMS(selectedHistorySession.session_id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-sm text-xs font-black transition-all shadow-sm active:scale-95"
                  title="Download RMS Import CSV (ItemLookupCode, Quantity)"
                >
                  <Database className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">RMS Import CSV</span>
                  <span className="sm:hidden">RMS</span>
                </button>

                <div className="h-6 w-px bg-stone-300 mx-0.5 hidden sm:block"></div>

                {/* Maximize / Restore Toggle */}
                <button 
                  onClick={() => setIsModalMaximized(prev => !prev)}
                  className="p-2 bg-stone-100 hover:bg-stone-200 rounded-sm text-stone-700 transition-colors border border-stone-200"
                  title={isModalMaximized ? "Restore Window" : "Maximize Modal"}
                >
                  {isModalMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                {/* Close Button */}
                <button 
                  onClick={() => {
                    setSelectedHistorySession(null);
                    setIsModalMaximized(false);
                  }}
                  className="p-2 bg-stone-100 hover:bg-stone-200 rounded-sm text-stone-700 transition-colors border border-stone-200"
                  title="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto bg-stone-50 p-6">
              
              {/* TAB 1: COUNTS & AUDIT */}
              {historyModalTab === 'counts' && (
                <div className="space-y-4">
                  
                  {/* Search, Filter & Sort Toolbar */}
                  <div className="bg-white p-4 rounded-sm border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
                      {/* Search Bar */}
                      <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                        <input 
                          type="text" 
                          placeholder="Search SKU or description..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-200 text-xs py-2.5 pl-9 pr-8 rounded-sm focus:outline-none focus:border-green-500 font-mono"
                        />
                        {searchQuery && (
                          <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-stone-400">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Department Filter */}
                      <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <Filter className="w-4 h-4 text-stone-400 shrink-0" />
                        <select 
                          value={selectedDepartment}
                          onChange={(e) => setSelectedDepartment(e.target.value)}
                          className="w-full sm:w-48 bg-stone-50 border border-stone-200 text-xs py-2.5 px-3 rounded-sm focus:outline-none focus:border-green-500 font-medium"
                        >
                          <option value="ALL">All Departments ({historyCounts.length})</option>
                          {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Sorting Dropdown */}
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-4 h-4 text-stone-400" />
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-stone-50 border border-stone-200 text-xs py-2.5 px-3 rounded-sm focus:outline-none focus:border-green-500 font-medium"
                      >
                        <option value="alpha_asc">Alphabetical (A → Z)</option>
                        <option value="alpha_desc">Alphabetical (Z → A)</option>
                        <option value="discrepancy_desc">Highest Discrepancy</option>
                        <option value="qty_desc">Highest Physical Count</option>
                        <option value="damaged_desc">Most Damaged Goods</option>
                        <option value="expired_desc">Most Expired Goods</option>
                      </select>
                    </div>
                  </div>

                  {/* Cumulative Table */}
                  <div className="bg-white rounded-sm border border-stone-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-xs border-b border-stone-200 font-bold sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3.5">SKU / Item</th>
                          <th className="px-4 py-3.5">Department</th>
                          <th className="px-4 py-3.5 text-right">Expected Stock</th>
                          <th className="px-4 py-3.5 text-right">Physical Count</th>
                          <th className="px-4 py-3.5 text-right">Damaged / Expired</th>
                          {selectedHistorySession.allow_live_sales && (
                            <>
                              <th className="px-4 py-3.5 text-right">POS Sales</th>
                              <th className="px-4 py-3.5 text-right">Reconciled Total</th>
                            </>
                          )}
                          <th className="px-4 py-3.5 text-right">Discrepancy</th>
                          <th className="px-4 py-3.5 text-center">Audit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {paginatedAuditItems.map((item) => {
                          const isExpanded = expandedSku === item.sku;
                          const disc = item.discrepancy || 0;
                          return (
                            <React.Fragment key={item.sku}>
                              <tr 
                                onClick={() => setExpandedSku(isExpanded ? null : item.sku)}
                                className={`cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/50' : 'hover:bg-stone-50/50'}`}
                              >
                                <td className="px-4 py-3.5">
                                  <div className="font-bold text-stone-900 text-sm leading-snug">{item.description}</div>
                                  <div className="text-xs font-mono text-stone-500">{item.item_lookup_code || item.sku}</div>
                                </td>
                                <td className="px-4 py-3.5">
                                  <div className="flex flex-col gap-1 items-start">
                                    <span className="text-xs font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-sm border border-stone-200">
                                      {item.category || 'General'}
                                    </span>
                                    {item.supplier && item.supplier !== 'Unknown' && (
                                      <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-sm border border-amber-200 truncate max-w-[140px]" title={item.supplier}>
                                        {item.supplier}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-right font-mono text-stone-600 font-bold">
                                  {item.expected_stock}
                                </td>
                                <td className="px-4 py-3.5 text-right font-mono font-black text-stone-900 text-base">
                                  {item.cumulative_quantity}
                                </td>
                                <td className="px-4 py-3.5 text-right">
                                  <div className="flex items-center justify-end gap-1 text-xs">
                                    {item.damaged_quantity > 0 && (
                                      <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-sm text-[11px] font-bold border border-amber-200">
                                        {item.damaged_quantity} Dmg
                                      </span>
                                    )}
                                    {item.expired_quantity > 0 && (
                                      <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded-sm text-[11px] font-bold border border-red-200">
                                        {item.expired_quantity} Exp
                                      </span>
                                    )}
                                    {!item.damaged_quantity && !item.expired_quantity && (
                                      <span className="text-stone-400 text-xs">—</span>
                                    )}
                                  </div>
                                </td>
                                {selectedHistorySession.allow_live_sales && (
                                  <>
                                    <td className="px-4 py-3.5 text-right font-mono text-amber-700 font-bold">
                                      +{item.sales_during_session || 0}
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-mono font-black text-stone-900">
                                      {item.reconciled_quantity}
                                    </td>
                                  </>
                                )}
                                <td className="px-4 py-3.5 text-right font-mono font-black text-sm">
                                  <span className={`px-2 py-1 rounded-sm border ${
                                    disc === 0 
                                      ? 'bg-stone-100 text-stone-700 border-stone-200' 
                                      : disc > 0 
                                        ? 'bg-green-100 text-green-800 border-green-200' 
                                        : 'bg-red-100 text-red-800 border-red-200'
                                  }`}>
                                    {disc > 0 ? `+${disc}` : disc}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 text-center">
                                  <button className="p-1 text-stone-400 hover:text-stone-700">
                                    {isExpanded ? <ChevronDown className="w-4 h-4 text-blue-600" /> : <ChevronRight className="w-4 h-4" />}
                                  </button>
                                </td>
                              </tr>

                              {/* EXPANDABLE WHO COUNTED WHAT ACCORDION */}
                              {isExpanded && (
                                <tr className="bg-blue-50/30">
                                  <td colSpan={selectedHistorySession.allow_live_sales ? 9 : 7} className="p-4 pl-8 border-t border-b border-blue-100">
                                    <div className="bg-white rounded-sm p-4 border border-blue-200 shadow-sm">
                                      <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 mb-3 flex items-center gap-2">
                                        <UserCheck className="w-4 h-4 text-blue-600" />
                                        <span>Who Counted What • Audit Log for {item.sku}</span>
                                      </h4>

                                      {(!item.contributors || item.contributors.length === 0) ? (
                                        <p className="text-xs text-stone-400 italic">No individual scan entries logged.</p>
                                      ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                          {item.contributors.map((contrib, cidx) => (
                                            <div key={cidx} className="bg-stone-50 border border-stone-200 rounded-sm p-3 flex items-center justify-between">
                                              <div>
                                                <p className="font-bold text-xs text-stone-800">{contrib.username}</p>
                                                <p className="text-[10px] text-stone-400 font-mono mt-0.5">{contrib.counted_at}</p>
                                              </div>
                                              <div className="text-right">
                                                <p className="font-black text-sm text-stone-900">{contrib.quantity}</p>
                                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-sm border ${
                                                  contrib.condition === 'DAMAGED' 
                                                    ? 'bg-amber-100 text-amber-800 border-amber-200' 
                                                    : contrib.condition === 'EXPIRED' 
                                                      ? 'bg-red-100 text-red-800 border-red-200' 
                                                      : 'bg-green-100 text-green-800 border-green-200'
                                                }`}>
                                                  {contrib.condition}
                                                </span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}

                        {filteredHistoryItems.length === 0 && (
                          <tr>
                            <td colSpan={selectedHistorySession.allow_live_sales ? 9 : 7} className="px-6 py-12 text-center text-stone-400">
                              No products matching the selected filter criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Modal Audit Table Pagination Bar */}
                    {filteredHistoryItems.length > 0 && (
                      <div className="bg-white px-4 py-3 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 text-stone-500">
                          <span>
                            Showing {filteredHistoryItems.length === 0 ? 0 : (auditPageSize === 'all' ? 1 : (auditCurrentPage - 1) * Number(auditPageSize) + 1)}–{auditPageSize === 'all' ? filteredHistoryItems.length : Math.min(auditCurrentPage * Number(auditPageSize), filteredHistoryItems.length)} of {filteredHistoryItems.length} products
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span>Rows per page:</span>
                            <select
                              value={auditPageSize}
                              onChange={e => {
                                setAuditPageSize(e.target.value);
                                setAuditCurrentPage(1);
                              }}
                              className="bg-stone-50 border border-stone-200 rounded-sm px-2 py-1 text-xs font-medium focus:outline-none"
                            >
                              <option value="15">15</option>
                              <option value="25">25</option>
                              <option value="50">50</option>
                              <option value="100">100</option>
                              <option value="all">All</option>
                            </select>
                          </div>
                        </div>

                        {totalAuditPages > 1 && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setAuditCurrentPage(1)}
                              disabled={auditCurrentPage === 1}
                              className="px-2 py-1 border border-stone-200 rounded-sm text-xs font-bold text-stone-600 disabled:opacity-40 hover:bg-stone-50 transition-colors"
                              title="First Page"
                            >
                              «
                            </button>
                            <button
                              onClick={() => setAuditCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={auditCurrentPage === 1}
                              className="px-2.5 py-1 border border-stone-200 rounded-sm text-xs font-bold text-stone-600 disabled:opacity-40 hover:bg-stone-50 transition-colors"
                            >
                              ‹ Prev
                            </button>
                            <span className="px-2 font-mono font-bold text-stone-700">
                              Page {auditCurrentPage} of {totalAuditPages}
                            </span>
                            <button
                              onClick={() => setAuditCurrentPage(prev => Math.min(prev + 1, totalAuditPages))}
                              disabled={auditCurrentPage === totalAuditPages}
                              className="px-2.5 py-1 border border-stone-200 rounded-sm text-xs font-bold text-stone-600 disabled:opacity-40 hover:bg-stone-50 transition-colors"
                            >
                              Next ›
                            </button>
                            <button
                              onClick={() => setAuditCurrentPage(totalAuditPages)}
                              disabled={auditCurrentPage === totalAuditPages}
                              className="px-2 py-1 border border-stone-200 rounded-sm text-xs font-bold text-stone-600 disabled:opacity-40 hover:bg-stone-50 transition-colors"
                              title="Last Page"
                            >
                              »
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: VALUATION & LOSS REPORT */}
              {historyModalTab === 'valuation' && (
                <div className="space-y-6">
                  {!valuationData ? (
                    <div className="flex justify-center items-center h-40 text-stone-400">Loading Valuation Data...</div>
                  ) : (
                    <>
                      {/* KPI Summary Cards */}
                      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        <div className="bg-white p-4 rounded-sm border border-stone-200 shadow-sm">
                          <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">Total Physical Stock</span>
                          <span className="text-xl font-black text-stone-900">
                            KES {valuationData.summary.total_counted_value.toLocaleString()}
                          </span>
                          <span className="text-xs text-stone-500 block mt-1">{valuationData.summary.total_physical_units} units</span>
                        </div>

                        <div className="bg-white p-4 rounded-sm border border-amber-200 shadow-sm bg-amber-50/30">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block mb-1">Damaged Goods Loss</span>
                          <span className="text-xl font-black text-amber-800">
                            KES {valuationData.summary.total_damaged_value.toLocaleString()}
                          </span>
                          <span className="text-xs text-amber-600 block mt-1">{valuationData.summary.total_damaged_units} units damaged</span>
                        </div>

                        <div className="bg-white p-4 rounded-sm border border-red-200 shadow-sm bg-red-50/30">
                          <span className="text-[10px] font-black uppercase tracking-wider text-red-700 block mb-1">Expired Goods Loss</span>
                          <span className="text-xl font-black text-red-800">
                            KES {valuationData.summary.total_expired_value.toLocaleString()}
                          </span>
                          <span className="text-xs text-red-600 block mt-1">{valuationData.summary.total_expired_units} units expired</span>
                        </div>

                        {/* Combined Loss Card */}
                        <div className="bg-gradient-to-br from-red-600 to-amber-700 text-white p-4 rounded-sm shadow-md col-span-2 lg:col-span-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-red-100 block mb-1">Combined Waste Loss</span>
                          <span className="text-xl font-black">
                            KES {valuationData.summary.total_waste_value.toLocaleString()}
                          </span>
                          <span className="text-xs text-red-100 block mt-1">
                            {valuationData.summary.waste_percentage}% of total stock value
                          </span>
                        </div>

                        <div className="bg-white p-4 rounded-sm border border-stone-200 shadow-sm col-span-2 lg:col-span-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">Stock Discrepancy Value</span>
                          <span className={`text-xl font-black ${valuationData.summary.total_discrepancy_value >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            KES {valuationData.summary.total_discrepancy_value.toLocaleString()}
                          </span>
                          <span className="text-xs text-stone-500 block mt-1">
                            {valuationData.summary.total_discrepancy_value >= 0 ? 'Net Surplus' : 'Net Shortage'}
                          </span>
                        </div>
                      </div>

                      {/* Sub-tabs for Detailed Breakdown */}
                      <div className="bg-white rounded-sm border border-stone-200 shadow-sm overflow-hidden">
                        <div className="border-b border-stone-200 px-6 py-3 bg-stone-50 flex items-center justify-between">
                          <div className="flex bg-stone-200/80 p-0.5 rounded-sm border border-stone-300">
                            <button
                              onClick={() => setValuationSubTab('combined')}
                              className={`px-3 py-1 text-xs font-bold rounded-sm transition-all ${
                                valuationSubTab === 'combined' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
                              }`}
                            >
                              Combined Waste ({valuationData.damaged_items.length + valuationData.expired_items.length})
                            </button>
                            <button
                              onClick={() => setValuationSubTab('damaged')}
                              className={`px-3 py-1 text-xs font-bold rounded-sm transition-all ${
                                valuationSubTab === 'damaged' ? 'bg-white text-amber-800 shadow-sm' : 'text-stone-600'
                              }`}
                            >
                              Damaged Only ({valuationData.damaged_items.length})
                            </button>
                            <button
                              onClick={() => setValuationSubTab('expired')}
                              className={`px-3 py-1 text-xs font-bold rounded-sm transition-all ${
                                valuationSubTab === 'expired' ? 'bg-white text-red-800 shadow-sm' : 'text-stone-600'
                              }`}
                            >
                              Expired Only ({valuationData.expired_items.length})
                            </button>
                            <button
                              onClick={() => setValuationSubTab('discrepancy')}
                              className={`px-3 py-1 text-xs font-bold rounded-sm transition-all ${
                                valuationSubTab === 'discrepancy' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
                              }`}
                            >
                              Discrepancy Matrix ({valuationData.discrepancy_items.length})
                            </button>
                          </div>
                        </div>

                        {/* Sub-tab content */}
                        <div className="overflow-x-auto">
                          {(valuationSubTab === 'combined' || valuationSubTab === 'damaged' || valuationSubTab === 'expired') && (
                            <table className="w-full text-left text-sm">
                              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-xs border-b border-stone-200 font-bold">
                                <tr>
                                  <th className="px-6 py-3.5">SKU / Item</th>
                                  <th className="px-6 py-3.5">Department</th>
                                  <th className="px-6 py-3.5">Condition</th>
                                  <th className="px-6 py-3.5 text-right">Affected Qty</th>
                                  <th className="px-6 py-3.5 text-right">Unit Cost</th>
                                  <th className="px-6 py-3.5 text-right">Total Loss (KES)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-100">
                                {(valuationSubTab === 'combined' || valuationSubTab === 'damaged') && 
                                  valuationData.damaged_items.map((item, idx) => (
                                    <tr key={`dmg-${idx}`} className="hover:bg-amber-50/30">
                                      <td className="px-6 py-3.5">
                                        <p className="font-bold text-stone-900">{item.description}</p>
                                        <p className="text-xs font-mono text-stone-500">{item.sku}</p>
                                      </td>
                                      <td className="px-6 py-3.5 text-xs text-stone-600">{item.category}</td>
                                      <td className="px-6 py-3.5">
                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-sm bg-amber-100 text-amber-800 border border-amber-200">
                                          DAMAGED
                                        </span>
                                      </td>
                                      <td className="px-6 py-3.5 text-right font-black text-amber-900 font-mono">
                                        {item.damaged_quantity}
                                      </td>
                                      <td className="px-6 py-3.5 text-right font-mono text-stone-600">
                                        KES {item.unit_cost.toLocaleString()}
                                      </td>
                                      <td className="px-6 py-3.5 text-right font-mono font-black text-red-700">
                                        KES {item.loss_value.toLocaleString()}
                                      </td>
                                    </tr>
                                  ))
                                }

                                {(valuationSubTab === 'combined' || valuationSubTab === 'expired') && 
                                  valuationData.expired_items.map((item, idx) => (
                                    <tr key={`exp-${idx}`} className="hover:bg-red-50/30">
                                      <td className="px-6 py-3.5">
                                        <p className="font-bold text-stone-900">{item.description}</p>
                                        <p className="text-xs font-mono text-stone-500">{item.sku}</p>
                                      </td>
                                      <td className="px-6 py-3.5 text-xs text-stone-600">{item.category}</td>
                                      <td className="px-6 py-3.5">
                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-sm bg-red-100 text-red-800 border border-red-200">
                                          EXPIRED
                                        </span>
                                      </td>
                                      <td className="px-6 py-3.5 text-right font-black text-red-900 font-mono">
                                        {item.expired_quantity}
                                      </td>
                                      <td className="px-6 py-3.5 text-right font-mono text-stone-600">
                                        KES {item.unit_cost.toLocaleString()}
                                      </td>
                                      <td className="px-6 py-3.5 text-right font-mono font-black text-red-700">
                                        KES {item.loss_value.toLocaleString()}
                                      </td>
                                    </tr>
                                  ))
                                }

                                {valuationData.damaged_items.length === 0 && valuationData.expired_items.length === 0 && (
                                  <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-stone-400">
                                      Zero damaged or expired goods recorded in this session!
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          )}

                          {valuationSubTab === 'discrepancy' && (
                            <table className="w-full text-left text-sm">
                              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-xs border-b border-stone-200 font-bold">
                                <tr>
                                  <th className="px-6 py-3.5">SKU / Item</th>
                                  <th className="px-6 py-3.5">Department</th>
                                  <th className="px-6 py-3.5 text-right">Expected Stock</th>
                                  <th className="px-6 py-3.5 text-right">Reconciled Count</th>
                                  <th className="px-6 py-3.5 text-right">Variance Units</th>
                                  <th className="px-6 py-3.5 text-right">Variance Value (KES)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-100">
                                {valuationData.discrepancy_items.map((item, idx) => (
                                  <tr key={`disc-${idx}`} className="hover:bg-stone-50/50">
                                    <td className="px-6 py-3.5">
                                      <p className="font-bold text-stone-900">{item.description}</p>
                                      <p className="text-xs font-mono text-stone-500">{item.sku}</p>
                                    </td>
                                    <td className="px-6 py-3.5 text-xs text-stone-600">{item.category}</td>
                                    <td className="px-6 py-3.5 text-right font-mono text-stone-700 font-bold">{item.expected_stock}</td>
                                    <td className="px-6 py-3.5 text-right font-mono text-stone-900 font-black">{item.reconciled_quantity}</td>
                                    <td className="px-6 py-3.5 text-right font-mono font-black">
                                      <span className={`px-2 py-0.5 rounded-sm border text-xs ${item.discrepancy > 0 ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                        {item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy}
                                      </span>
                                    </td>
                                    <td className="px-6 py-3.5 text-right font-mono font-black">
                                      <span className={item.discrepancy_value >= 0 ? 'text-green-700' : 'text-red-700'}>
                                        KES {item.discrepancy_value.toLocaleString()}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                {valuationData.discrepancy_items.length === 0 && (
                                  <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-stone-400">
                                      Perfect stock reconciliation! Zero discrepancies found.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 3: SCAN ANALYTICS */}
              {historyModalTab === 'analysis' && (
                <div className="space-y-6">
                  {!historyAnalysisData ? (
                    <div className="flex justify-center items-center h-40 text-stone-400 font-medium">Loading Analysis...</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Condition Breakdown */}
                      <div className="bg-white p-5 rounded-sm shadow-sm border border-stone-200">
                        <h3 className="font-bold text-stone-700 mb-4 text-xs uppercase tracking-wider">Condition Breakdown</h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie 
                                data={historyAnalysisData.condition_breakdown} 
                                dataKey="quantity" 
                                nameKey="condition" 
                                cx="50%" 
                                cy="50%" 
                                innerRadius={60} 
                                outerRadius={80} 
                                label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                              >
                                {historyAnalysisData.condition_breakdown.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.condition === 'GOOD' ? '#16a34a' : entry.condition === 'DAMAGED' ? '#f59e0b' : '#dc2626'} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(val) => val.toLocaleString()} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Hourly Timeline */}
                      <div className="bg-white p-5 rounded-sm shadow-sm border border-stone-200">
                        <h3 className="font-bold text-stone-700 mb-4 text-xs uppercase tracking-wider">Hourly Activity</h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={historyAnalysisData.timeline}>
                              <XAxis dataKey="hour" tick={{fontSize: 12, fill: '#78716c'}} axisLine={false} tickLine={false} />
                              <YAxis tick={{fontSize: 12, fill: '#78716c'}} axisLine={false} tickLine={false} width={40} />
                              <Tooltip cursor={{fill: '#f5f5f4'}} contentStyle={{borderRadius: '2px', border: '1px solid #e7e5e4', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                              <Bar dataKey="quantity" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Top Items */}
                      <div className="bg-white p-5 rounded-sm shadow-sm border border-stone-200">
                        <h3 className="font-bold text-stone-700 mb-4 text-xs uppercase tracking-wider">Top 10 Counted SKUs</h3>
                        <div className="space-y-2">
                          {historyAnalysisData.top_items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                              <span className="font-mono text-stone-600 truncate">{item.sku}</span>
                              <span className="font-bold bg-stone-100 px-2 py-1 rounded-sm text-stone-800 border border-stone-200">{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Top Employees */}
                      <div className="bg-white p-5 rounded-sm shadow-sm border border-stone-200">
                        <h3 className="font-bold text-stone-700 mb-4 text-xs uppercase tracking-wider">Top Staff Contributors</h3>
                        <div className="space-y-2">
                          {historyAnalysisData.top_employees.map((emp, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                              <span className="font-medium text-stone-800">{emp.username}</span>
                              <span className="font-bold text-green-700 bg-green-50 px-2 py-1 rounded-sm border border-green-200">{emp.quantity} units</span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
