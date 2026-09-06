import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import api, { getUserRole } from '../api';

const StaffManagement = () => {
  const currentUserRole = getUserRole();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'EMPLOYEE' });
  const [msg, setMsg] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const cleanData = {
        ...formData,
        username: formData.username.trim(),
        password: formData.password.trim()
      };
      await api.post('/api/users', cleanData);
      setMsg({ type: 'success', text: 'User created successfully' });
      setFormData({ username: '', password: '', role: 'EMPLOYEE' });
      fetchUsers();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to create user' });
    }
    setTimeout(() => setMsg(null), 3000);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await api.delete(`/api/users/${id}`);
      fetchUsers();
    } catch (err) {
      alert("Failed to delete user");
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-800 p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold uppercase tracking-widest">Staff Account Management</h1>
      </div>

      {msg && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${msg.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-bold">{msg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Create User Form */}
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm md:col-span-1 h-fit">
          <h2 className="font-bold mb-4 flex items-center gap-2 border-b pb-2">
            <UserPlus className="w-5 h-5" />
            Create New Account
          </h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-stone-500 mb-1">Username</label>
              <input 
                type="text" 
                required 
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
                className="w-full border border-stone-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-500 mb-1">Password</label>
              <input 
                type="password" 
                required 
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full border border-stone-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-500 mb-1">Role</label>
              <select 
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
                className="w-full border border-stone-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="EMPLOYEE">EMPLOYEE (Scanner Only)</option>
                {currentUserRole === 'ADMIN' && (
                  <>
                    <option value="MANAGER">MANAGER (Ops & HR)</option>
                    <option value="ADMIN">ADMIN (Full Access)</option>
                  </>
                )}
              </select>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors mt-2">
              Create Account
            </button>
          </form>
        </div>

        {/* User List */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm md:col-span-2 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-xs border-b border-stone-200">
              <tr>
                <th className="px-6 py-4 font-bold">ID</th>
                <th className="px-6 py-4 font-bold">Username</th>
                <th className="px-6 py-4 font-bold">Role</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr><td colSpan="4" className="text-center py-8">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-8 text-stone-400">No staff accounts found.</td></tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-stone-50">
                    <td className="px-6 py-4 font-mono text-stone-500">{u.id}</td>
                    <td className="px-6 py-4 font-bold">{u.username}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : u.role === 'MANAGER' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default StaffManagement;
