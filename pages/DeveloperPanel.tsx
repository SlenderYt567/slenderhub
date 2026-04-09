import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { supabase } from '../lib/supabaseClient';
import { 
  Key, Plus, RefreshCw, Trash2, Shield, 
  Search, Terminal, Copy, Check, Clock, 
  ExternalLink, Code, AlertCircle, Info 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const DeveloperPanel: React.FC = () => {
  const { user, isAdminProfile } = useStore();
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // States for new key modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKeyConfig, setNewKeyConfig] = useState({
    prefix: 'SLENDER',
    durationDays: 30,
    note: ''
  });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchKeys();
    }
  }, [user]);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('license_keys')
        .select('*')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setKeys(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/keys/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          userId: user.id,
          ...newKeyConfig
        })
      });

      const data = await response.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchKeys();
      } else {
        alert(data.error || 'Failed to generate key');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleResetHWID = async (keyId: string) => {
    if (!confirm('Are you sure you want to reset the HWID for this key?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/keys/reset-hwid', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ keyId, userId: user?.id })
      });

      if (response.ok) {
        fetchKeys();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2">
              DEVELOPER <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">PANEL</span>
            </h1>
            <p className="text-gray-400">Manage your script licenses, keys and HWID resets.</p>
          </div>
          
          <div className="flex gap-4">
            <Link 
              to="/documentation"
              className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
            >
              <Code className="w-4 h-4" />
              <span>Integration Guide</span>
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Key</span>
            </button>
          </div>
        </div>

        {/* Stats Grid Placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-4">
              <Key className="w-5 h-5 text-blue-400" />
              <h3 className="text-gray-400 font-medium">Total Keys</h3>
            </div>
            <p className="text-3xl font-bold">{keys.length}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-4">
              <Shield className="w-5 h-5 text-green-400" />
              <h3 className="text-gray-400 font-medium">Active Licenses</h3>
            </div>
            <p className="text-3xl font-bold">{keys.filter(k => k.is_active).length}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <h3 className="text-gray-400 font-medium">Locked HWIDs</h3>
            </div>
            <p className="text-3xl font-bold">{keys.filter(k => k.hwid).length}</p>
          </div>
        </div>

        {/* Keys Table */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">License Key</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Customer Note</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">HWID Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Expires</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-8 h-4 bg-slate-800/10"></td>
                    </tr>
                  ))
                ) : keys.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No keys generated yet. Click "Generate Key" to start.
                    </td>
                  </tr>
                ) : (
                  keys.map((key) => (
                    <tr key={key.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <code className="text-blue-400 font-mono bg-blue-500/10 px-2 py-1 rounded">
                            {key.key_string}
                          </code>
                          <button 
                            onClick={() => copyToClipboard(key.key_string)}
                            className="text-gray-500 hover:text-white transition-colors"
                          >
                            {copiedKey === key.key_string ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-300">{key.note}</span>
                      </td>
                      <td className="px-6 py-4">
                        {key.hwid ? (
                          <div className="flex items-center space-x-2 text-green-400 text-xs">
                            <Shield className="w-3 h-3" />
                            <span>Locked</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-gray-500 text-xs">
                            <Clock className="w-3 h-3" />
                            <span>Unused</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-400">
                          {key.expires_at ? new Date(key.expires_at).toLocaleDateString() : 'Lifetime'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {key.hwid && (
                            <button
                              onClick={() => handleResetHWID(key.id)}
                              title="Reset HWID"
                              className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            title="Deactivate"
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Generate Key Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">Generate New Key</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Key Prefix</label>
                <input 
                  type="text" 
                  value={newKeyConfig.prefix}
                  onChange={(e) => setNewKeyConfig({...newKeyConfig, prefix: e.target.value.toUpperCase()})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="EX: SLENDER"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Duration (Days)</label>
                <select 
                  value={newKeyConfig.durationDays}
                  onChange={(e) => setNewKeyConfig({...newKeyConfig, durationDays: parseInt(e.target.value)})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value={1}>1 Day</option>
                  <option value={7}>7 Days</option>
                  <option value={30}>30 Days (1 Month)</option>
                  <option value={365}>365 Days (1 Year)</option>
                  <option value={0}>Lifetime</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Internal Note (Customer Name)</label>
                <input 
                  type="text" 
                  value={newKeyConfig.note}
                  onChange={(e) => setNewKeyConfig({...newKeyConfig, note: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: John Doe"
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleGenerateKey}
                  disabled={generating}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors font-bold disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeveloperPanel;
