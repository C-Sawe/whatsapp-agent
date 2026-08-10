import React, { useState, useEffect } from 'react';
import { ShoppingBag, MessageCircle, X } from 'lucide-react';
import api from '../api';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Reply Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const auth = localStorage.getItem('mosop_auth');
      
      const res = await api.get('/api/orders', {
        headers: { Authorization: auth }
      });
      setOrders(res.data.orders.reverse()); // Newest first
    } catch (err) {
      console.error("Error fetching orders", err);
    } finally {
      setLoading(false);
    }
  };

  const openReplyModal = (order) => {
    setSelectedOrder(order);
    setReplyText(`Hello! Regarding your order for ${order.Quantity}x ${order.Product}, `);
    setReplySuccess(false);
  };

  const closeReplyModal = () => {
    setSelectedOrder(null);
    setReplyText('');
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedOrder) return;
    setSending(true);
    try {
      const auth = localStorage.getItem('mosop_auth');
      await api.post('/api/orders/reply', 
        { phone: selectedOrder['Phone Number'], message: replyText },
        { headers: { Authorization: auth } }
      );
      setReplySuccess(true);
      setTimeout(closeReplyModal, 2000);
    } catch (err) {
      alert("Failed to send message. Ensure Evolution API is running.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-stone-900 p-3 rounded-sm">
          <ShoppingBag size={24} className="text-green-500" />
        </div>
        <div>
          <h1 className="text-xl font-black uppercase tracking-widest text-stone-900 m-0">Orders Management</h1>
          <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mt-1 m-0">Live view of all Google Sheets orders</p>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-sm shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto table-scroll-mask">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-stone-500">Order ID</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-stone-500">Customer Name</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-stone-500">Phone</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-stone-500">Product</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-stone-500">Total Cost</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-stone-500">Status</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-stone-500">Timestamp</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-stone-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {loading && orders.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4"><div className="h-4 bg-stone-200 rounded w-16"></div></td>
                    <td className="p-4"><div className="h-4 bg-stone-200 rounded w-24"></div></td>
                    <td className="p-4"><div className="h-4 bg-stone-200 rounded w-24"></div></td>
                    <td className="p-4"><div className="h-4 bg-stone-200 rounded w-32"></div></td>
                    <td className="p-4"><div className="h-4 bg-stone-200 rounded w-16"></div></td>
                    <td className="p-4"><div className="h-6 bg-stone-200 rounded-sm w-16"></div></td>
                    <td className="p-4"><div className="h-4 bg-stone-200 rounded w-20"></div></td>
                    <td className="p-4"><div className="h-8 bg-stone-200 rounded-sm w-24"></div></td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center">
                      <ShoppingBag className="w-12 h-12 text-stone-300 mb-3" />
                      <h3 className="text-lg font-medium text-stone-900 mb-1">No orders found</h3>
                      <p className="text-sm">New orders will appear here automatically.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order, i) => (
                  <tr key={i} className="hover:bg-stone-50 transition-colors">
                    <td className="p-4 text-xs font-bold text-stone-900">{order['Order ID']}</td>
                    <td className="p-4 text-xs font-bold text-stone-900">{order['Customer Name'] || 'Unknown'}</td>
                    <td className="p-4 text-xs text-stone-600">{order['Phone Number']}</td>
                    <td className="p-4 text-xs text-stone-900">{order.Quantity}x {order.Product}</td>
                    <td className="p-4 text-xs font-bold text-stone-900">KSh {order['Total Cost']}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-sm text-[9px] font-black uppercase tracking-widest ${
                        order['Payment Status'] === 'PAID' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {order['Payment Status']}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-stone-400">{order.Timestamp}</td>
                    <td className="p-4">
                      <button 
                        onClick={() => openReplyModal(order)}
                        className="flex items-center gap-2 px-3 py-1.5 min-h-[44px] bg-stone-900 text-white rounded-sm hover:bg-stone-800 active:scale-95 transition-all text-xs font-bold uppercase tracking-widest"
                      >
                        <MessageCircle size={14} /> Reply
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          {loading && orders.length === 0 ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-stone-50 p-4 rounded-xl border border-stone-100">
                  <div className="flex justify-between items-start mb-3">
                    <div className="h-4 bg-stone-200 rounded w-20"></div>
                    <div className="h-5 bg-stone-200 rounded-sm w-16"></div>
                  </div>
                  <div className="h-4 bg-stone-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-stone-200 rounded w-1/3 mb-4"></div>
                  <div className="flex justify-between items-end mb-4">
                    <div className="h-5 bg-stone-200 rounded w-24"></div>
                    <div className="h-4 bg-stone-200 rounded w-20"></div>
                  </div>
                  <div className="h-[44px] bg-stone-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-stone-500">
              <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-stone-900 mb-1">No orders found</h3>
              <p className="text-sm">Awaiting incoming orders.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4">
              {orders.map((order, i) => (
                <div key={i} className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Order ID: {order['Order ID']}</p>
                      <h4 className="font-bold text-stone-900 text-base">{order['Customer Name'] || 'Unknown'}</h4>
                    </div>
                    <span className={`px-2 py-1 rounded-sm text-[9px] font-black uppercase tracking-widest ${
                      order['Payment Status'] === 'PAID' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {order['Payment Status']}
                    </span>
                  </div>
                  <p className="text-sm text-stone-600 font-medium mb-1">{order['Phone Number']}</p>
                  <p className="text-sm text-stone-900 font-medium mb-3">{order.Quantity}x {order.Product}</p>
                  
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-0.5">Total Cost</p>
                      <p className="font-black text-stone-900 text-sm">KSh {order['Total Cost']}</p>
                    </div>
                    <p className="text-xs text-stone-400">{order.Timestamp}</p>
                  </div>
                  <button 
                    onClick={() => openReplyModal(order)}
                    className="flex items-center justify-center gap-2 w-full min-h-[44px] bg-stone-900 text-white rounded-md hover:bg-stone-800 active:scale-95 transition-all text-xs font-bold uppercase tracking-widest mt-auto"
                  >
                    <MessageCircle size={14} /> Reply via WhatsApp
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reply Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center z-modal p-4">
          <div className="bg-white border border-stone-200 rounded-sm w-full max-w-lg relative shadow-xl">
            <div className="p-6 border-b border-stone-200 flex justify-between items-center bg-stone-50">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-stone-900 m-0">Secure Transmission</h2>
                <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mt-1 m-0">Target: {selectedOrder['Phone Number']}</p>
              </div>
              <button 
                onClick={closeReplyModal}
                className="text-stone-400 hover:text-stone-900 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 p-3 bg-stone-50 border border-stone-200 rounded-sm">
                <p className="text-xs font-bold text-stone-900 m-0">Reference Order: {selectedOrder['Order ID']}</p>
                <p className="text-xs text-stone-500 m-0">{selectedOrder.Quantity}x {selectedOrder.Product}</p>
              </div>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full h-32 p-3 bg-white border border-stone-300 rounded-sm text-sm text-stone-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all resize-none mb-4"
                placeholder="Enter transmission payload..."
              />
              <div className="flex justify-end">
                <button 
                  onClick={handleSendReply} 
                  disabled={sending || replySuccess}
                  className={`px-4 py-2 rounded-sm text-xs font-black uppercase tracking-widest transition-colors ${
                    replySuccess 
                      ? 'bg-green-600 text-white' 
                      : 'bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50'
                  }`}
                >
                  {sending ? 'Transmitting...' : replySuccess ? 'Payload Delivered' : 'Execute Transmission'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
