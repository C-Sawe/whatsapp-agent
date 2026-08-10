import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Search, RefreshCw, AlertCircle, Database, Download } from 'lucide-react';
import ProductMovementModal from '../components/ProductMovementModal';
import { downloadCsv } from '../utils/exportCsv';

export default function Inventory() {
  const navigate = useNavigate();
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ totalItems: 0, lastSynced: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [storeId, setStoreId] = useState('all');
  const [stores, setStores] = useState([]);
  const [categoryId, setCategoryId] = useState('all');
  const [categories, setCategories] = useState([]);
  const [supplierId, setSupplierId] = useState('all');
  const [suppliers, setSuppliers] = useState([]);
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);


  const storeNames = {
    1: 'Main',
    2: 'Shop',
    3: 'Nandi Hills'
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { page, page_size: pageSize };
      if (storeId !== 'all') params.store_id = storeId;
      if (categoryId !== 'all') params.category = categoryId;
      if (supplierId !== 'all') params.supplier = supplierId;
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      
      const res = await api.get('/api/inventory', {
        params
      });
      
      if (res.data.status === 'success') {
        setInventoryData(res.data.inventory);
        setStats({
          totalItems: res.data.total_items,
          lastSynced: res.data.last_synced
        });
        setTotalPages(res.data.total_pages);
        if (res.data.stores) setStores(res.data.stores);
        if (res.data.categories) setCategories(res.data.categories);
        if (res.data.suppliers) setSuppliers(res.data.suppliers);
      } else {
        setError(res.data.message || 'Failed to fetch inventory');
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      if (searchTerm !== debouncedSearchTerm) {
        setPage(1); // only reset page if term actually changed
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    fetchInventory();
    const interval = setInterval(fetchInventory, 30000);
    return () => clearInterval(interval);
  }, [page, pageSize, storeId, categoryId, supplierId, debouncedSearchTerm]);

  const handleExport = () => {
    downloadCsv(inventoryData, `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const getStatusBadge = (item) => {
    if (item.stock_quantity <= 0) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">Out of Stock</span>;
    }
    if (item.stock_quantity <= item.reorder_point) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">Low Stock</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">In Stock</span>;
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-4 md:px-8 shadow-sm shrink-0">
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => navigate('/')} 
            className="p-1 md:p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="truncate min-w-0">
            <h1 className="text-sm md:text-lg font-bold text-stone-900 leading-tight truncate">Live Inventory</h1>
            <p className="hidden md:block text-[10px] font-black uppercase tracking-widest text-stone-500 leading-tight">Dynamics RMS Sync</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-stone-50 px-4 py-1.5 rounded-full border border-stone-200">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
          <div className="text-xs">
            <span className="text-stone-500">Last Synced: </span>
            <span className="font-semibold text-stone-900">
              {stats.lastSynced ? new Date(stats.lastSynced).toLocaleString() : 'Never (Pending)'}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
          
          <aside className="w-full lg:w-64 shrink-0 space-y-6 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto hide-scrollbar">
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
              <h3 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4">Categories</h3>
              <div className="flex flex-col gap-1 max-h-64 lg:max-h-none overflow-y-auto pr-2">
                <button
                  onClick={() => { setCategoryId('all'); setSupplierId('all'); setPage(1); }}
                  className={`text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${categoryId === 'all' ? 'bg-blue-50 text-blue-700' : 'text-stone-600 hover:bg-stone-50'}`}
                >
                  All Categories
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setCategoryId(cat); setSupplierId('all'); setPage(1); }}
                    className={`text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${categoryId === cat ? 'bg-blue-50 text-blue-700' : 'text-stone-600 hover:bg-stone-50'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="flex-1 space-y-6 min-w-0">
            
            <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
              <h2 className="text-2xl font-black text-stone-900 tracking-tight shrink-0">Stock Levels ({stats.totalItems})</h2>
              
              <div className="flex flex-wrap gap-2 w-full xl:w-auto sticky top-0 z-filters bg-stone-50/95 backdrop-blur py-2 -mx-4 px-4 md:mx-0 md:px-0">
                
                <div className="flex gap-2 w-full sm:w-auto flex-1">
                  <select 
                    value={storeId} 
                    onChange={(e) => { setStoreId(e.target.value === 'all' ? 'all' : Number(e.target.value)); setPage(1); }}
                    className="flex-1 px-3 py-2 text-base md:text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all bg-white text-stone-700 font-medium min-h-[44px]"
                  >
                    <option value="all">All Stores</option>
                    {stores.map(id => (
                      <option key={id} value={id}>
                        {storeNames[id] || `Store ${id}`}
                      </option>
                    ))}
                  </select>

                  <select 
                    value={supplierId} 
                    onChange={(e) => { setSupplierId(e.target.value); setPage(1); }}
                    className="flex-1 px-3 py-2 text-base md:text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white text-stone-700 font-medium truncate min-h-[44px]"
                  >
                    <option value="all">All Suppliers</option>
                    {suppliers.map(sup => <option key={sup} value={sup}>{sup}</option>)}
                  </select>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto sm:flex-1">
                  <div className="relative flex-1 sm:min-w-[200px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input 
                      type="text" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search SKU or description..." 
                      className="w-full pl-9 pr-4 py-2 text-base md:text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[44px]"
                    />
                  </div>
                  <button 
                    onClick={fetchInventory} 
                    disabled={loading}
                    className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors disabled:opacity-50 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
                  >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-green-500' : ''}`} />
                  </button>
                  <button 
                    onClick={handleExport} 
                    disabled={loading || inventoryData.length === 0}
                    className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors disabled:opacity-50 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
                    title="Export CSV"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
                
              </div>
            </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-red-800">Sync Pipeline Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Dual Layout: Table (Desktop) & Virtualized Cards (Mobile) */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto table-scroll-mask">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold border-b border-stone-200 w-28">SKU</th>
                    <th className="p-4 font-semibold border-b border-stone-200">Description</th>
                    <th className="p-4 font-semibold border-b border-stone-200 w-32">Category</th>
                    <th className="p-4 font-semibold border-b border-stone-200 w-28">Price</th>
                    <th className="p-4 font-semibold border-b border-stone-200 w-32">Supplier</th>
                    <th className="p-4 font-semibold border-b border-stone-200 text-right w-20">Stock</th>
                    <th className="p-4 font-semibold border-b border-stone-200 text-right w-24">Runway</th>
                    <th className="p-4 font-semibold border-b border-stone-200 text-center w-28">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {loading && inventoryData.length === 0 ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="p-4"><div className="h-4 bg-stone-200 rounded w-16"></div></td>
                        <td className="p-4"><div className="h-4 bg-stone-200 rounded w-3/4"></div></td>
                        <td className="p-4"><div className="h-4 bg-stone-200 rounded w-20"></div></td>
                        <td className="p-4"><div className="h-4 bg-stone-200 rounded w-16"></div></td>
                        <td className="p-4"><div className="h-4 bg-stone-200 rounded w-24"></div></td>
                        <td className="p-4"><div className="h-4 bg-stone-200 rounded w-8 ml-auto"></div></td>
                        <td className="p-4"><div className="h-4 bg-stone-200 rounded w-8 ml-auto"></div></td>
                        <td className="p-4"><div className="h-4 bg-stone-200 rounded w-16 mx-auto"></div></td>
                      </tr>
                    ))
                  ) : inventoryData.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center text-stone-500">
                        <div className="flex flex-col items-center justify-center">
                          <Database className="w-12 h-12 text-stone-300 mb-3" />
                          <h3 className="text-lg font-medium text-stone-900 mb-1">No products found</h3>
                          <p>{searchTerm ? 'Try adjusting your search or filters.' : 'Awaiting first successful sync from RMS.'}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    inventoryData.map((item, idx) => (
                      <tr 
                        key={`${item.sku}-${item.store_id || 0}-${idx}`} 
                        className="hover:bg-stone-50/50 transition-colors cursor-pointer"
                        onClick={() => { setSelectedProduct(item); setIsModalOpen(true); }}
                      >
                        <td className="p-4 font-medium text-stone-900">{item.sku}</td>
                        <td className="p-4 text-stone-600 font-medium">{item.description}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700 uppercase tracking-wider">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-stone-900 text-xs">
                          KSh {item.retail_price?.toLocaleString() || '0'}
                        </td>
                        <td className="p-4 text-stone-500 text-xs truncate max-w-[120px]" title={item.supplier}>
                          {item.supplier}
                        </td>
                        <td className={`p-4 text-right font-bold ${item.stock_quantity <= 0 ? 'text-red-600' : 'text-stone-900'}`}>
                          {item.stock_quantity}
                        </td>
                        <td className="p-4 text-right">
                          {item.runway_days === 9999 ? (
                            <span className="text-stone-400 font-medium">∞</span>
                          ) : (
                            <span className={`font-bold ${item.runway_days <= 7 && item.runway_days > 0 ? 'text-orange-600' : item.runway_days === 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {item.runway_days}d
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">{getStatusBadge(item)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (Virtualized) */}
            <div className="md:hidden">
              {loading && inventoryData.length === 0 ? (
                <div className="p-4 space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="animate-pulse bg-stone-50 p-4 rounded-xl border border-stone-100">
                      <div className="flex justify-between items-start mb-3">
                        <div className="h-4 bg-stone-200 rounded w-16"></div>
                        <div className="h-5 bg-stone-200 rounded-full w-20"></div>
                      </div>
                      <div className="h-4 bg-stone-200 rounded w-3/4 mb-4"></div>
                      <div className="flex justify-between items-end">
                        <div className="h-5 bg-stone-200 rounded w-24"></div>
                        <div className="h-6 bg-stone-200 rounded w-12"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : inventoryData.length === 0 ? (
                <div className="p-12 text-center text-stone-500">
                  <Database className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-stone-900 mb-1">No products found</h3>
                  <p className="text-sm">{searchTerm ? 'Try adjusting your search or filters.' : 'Awaiting sync.'}</p>
                </div>
              ) : (
                <div className="p-2 space-y-3">
                  {inventoryData.map((item, idx) => (
                    <div 
                      key={`${item.sku}-${item.store_id || 0}-${idx}`}
                      className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm cursor-pointer hover:border-stone-300 transition-colors"
                      onClick={() => { setSelectedProduct(item); setIsModalOpen(true); }}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-stone-500 tracking-wider uppercase">{item.sku}</span>
                        {getStatusBadge(item)}
                      </div>
                      <h4 className="font-bold text-stone-900 text-sm mb-3">{item.description}</h4>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-0.5">Price</p>
                          <p className="font-black text-stone-900 text-sm">KSh {item.retail_price?.toLocaleString() || '0'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-0.5">Runway</p>
                          <p className="font-black text-lg leading-none">
                            {item.runway_days === 9999 ? (
                              <span className="text-stone-300">∞</span>
                            ) : (
                              <span className={`${item.runway_days <= 7 && item.runway_days > 0 ? 'text-orange-600' : item.runway_days === 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {item.runway_days}d
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-0.5">Stock</p>
                          <p className={`font-black text-lg leading-none ${item.stock_quantity <= 0 ? 'text-red-600' : 'text-stone-900'}`}>
                            {item.stock_quantity}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-stone-200 flex items-center justify-between bg-stone-50/80">
              <div className="text-sm text-stone-500">
                Showing page <span className="font-semibold text-stone-900">{page}</span> of <span className="font-semibold text-stone-900">{totalPages}</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="px-3 py-1.5 min-h-[44px] min-w-[44px] bg-white border border-stone-200 rounded-lg text-sm text-stone-600 disabled:opacity-50 hover:bg-stone-50 active:scale-95 transition-all shadow-sm font-medium"
                >
                  Previous
                </button>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                  className="px-3 py-1.5 min-h-[44px] min-w-[44px] bg-white border border-stone-200 rounded-lg text-sm text-stone-600 disabled:opacity-50 hover:bg-stone-50 active:scale-95 transition-all shadow-sm font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          
          </div>
          
        </div>
      </main>

      <ProductMovementModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
        storeId={storeId}
      />
    </div>
  );
}
