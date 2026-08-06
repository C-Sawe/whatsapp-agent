import React, { useState, useEffect } from 'react';
import { ShoppingBag, MessageCircle, X } from 'lucide-react';
import axios from 'axios';

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
      const res = await axios.get('/api/orders', {
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
      await axios.post('/api/orders/reply', 
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
        {loading ? (
          <div className="p-8 text-center text-stone-500 font-bold uppercase tracking-widest text-xs animate-pulse">Scanning Data Grid...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-stone-500 font-bold uppercase tracking-widest text-xs">No entries found.</div>
        ) : (
          <div className="overflow-x-auto">
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
                {orders.map((order, i) => (
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
                        className="flex items-center gap-2 px-3 py-1.5 bg-stone-900 text-white rounded-sm hover:bg-stone-800 transition-colors text-xs font-bold uppercase tracking-widest"
                      >
                        <MessageCircle size={14} /> Reply
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
