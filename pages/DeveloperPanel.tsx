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

  // States for gateway modal
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [gatewayConfig, setGatewayConfig] = useState<any>({
    shortener_url: '',
    discord_url: '',
    youtube_url: ''
  });
  const [devTier, setDevTier] = useState<string>('none');

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

      const { data: profile } = await supabase
        .from('profiles')
        .select('shortener_url, discord_url, youtube_url, dev_tier')
        .eq('id', user?.id)
        .single();
      
      if (profile) {
        setGatewayConfig(profile);
        setDevTier(profile.dev_tier || 'none');
      }
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
      const { data, error } = await supabase.rpc('generate_license_key', {
        target_prefix: newKeyConfig.prefix || 'SLENDER',
        target_duration_days: newKeyConfig.durationDays,
        target_note: newKeyConfig.note
      });

      if (error) throw error;
      
      if (data && data.success) {
        setIsModalOpen(false);
        fetchKeys();
      } else {
        alert(data?.error || 'Failed to generate key');
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
      const { data, error } = await supabase.rpc('reset_license_hwid', {
        target_key_id: keyId
      });

      if (error) throw error;

      if (data && data.success) {
        fetchKeys();
      } else {
        alert(data?.error || 'Failed to reset HWID');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveGateway = async () => {
    try {
      setGenerating(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          shortener_url: gatewayConfig.shortener_url,
          discord_url: gatewayConfig.discord_url,
          youtube_url: gatewayConfig.youtube_url
        })
        .eq('id', user?.id);

      if (error) throw error;
      setIsGatewayModalOpen(false);
      alert('Gateway Settings Saved Successfully!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string, isKey: boolean = true) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(isKey ? text : 'URL-' + text);
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
            <button
              onClick={() => setIsGatewayModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Gateway Settings</span>
            </button>
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

        {/* Upgrade Banner — shown when user has no dev plan */}
        {devTier === 'none' && !loading && (
          <div className="mb-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-bold text-amber-300 mb-1">Plano Não Ativado</h3>
                <p className="text-sm text-gray-400">Você ainda não possui um plano SlenderKey ativo. Adquira um plano para gerar chaves de licença.</p>
              </div>
            </div>
            <Link
              to="/pricing"
              className="shrink-0 flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/20"
            >
              Ver Planos
            </Link>
          </div>
        )}

        {/* Stats Grid */}
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
                            onClick={() => copyToClipboard(key.key_string, true)}
                            title="Copy Key"
                            className="text-gray-500 hover:text-white transition-colors"
                          >
                            {copiedKey === key.key_string ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => {
                              const baseUrl = window.location.origin + window.location.pathname;
                              copyToClipboard(`${baseUrl}#/unlock/${key.key_string}`, false);
                            }}
                            title="Copy Gateway Link"
                            className="text-blue-500 hover:text-blue-400 transition-colors"
                          >
                            {copiedKey === 'URL-' + key.key_string ? <Check className="w-4 h-4 text-green-500" /> : <ExternalLink className="w-4 h-4" />}
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

      {/* Gateway Settings Modal */}
      {isGatewayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-800 w-full max-w-lg rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center space-x-3 mb-6">
              <ExternalLink className="w-6 h-6 text-blue-500" />
              <h2 className="text-2xl font-bold">Gateway Config</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Linkvertise User ID (Optional)</label>
                <div className="flex items-center space-x-2">
                  <input 
                    type="text" 
                    value={gatewayConfig?.shortener_url || ''}
                    onChange={(e) => setGatewayConfig({...gatewayConfig, shortener_url: e.target.value.replace(/[^0-9]/g, '')})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm placeholder-gray-600"
                    placeholder="ex: 982465"
                  />
                  <a href="https://publisher.linkvertise.com/ac/links" target="_blank" className="text-blue-500 hover:text-blue-400 text-sm whitespace-nowrap">Find ID</a>
                </div>
                <p className="text-xs text-gray-500 mt-1">If provided, the site will automatically generate dynamic Linkvertise ads for every key.</p>
              </div>

              <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-300 mb-1">Custom Shortener / Manual Mode</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      If you use Monetag, LootLabs or other shorteners, set your "Destination URL" to:
                      <code className="block mt-2 p-2 bg-slate-950 rounded border border-slate-800 text-blue-400 break-all select-all">
                        {window.location.origin}/#/verify-gateway
                      </code>
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">YouTube Required Channel URL</label>
                <input 
                  type="url" 
                  value={gatewayConfig?.youtube_url || ''}
                  onChange={(e) => setGatewayConfig({...gatewayConfig, youtube_url: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none text-sm placeholder-gray-600"
                  placeholder="https://youtube.com/@..."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Discord Invite URL</label>
                <input 
                  type="url" 
                  value={gatewayConfig?.discord_url || ''}
                  onChange={(e) => setGatewayConfig({...gatewayConfig, discord_url: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-sm placeholder-gray-600"
                  placeholder="https://discord.gg/..."
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  onClick={() => setIsGatewayModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveGateway}
                  disabled={generating}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors font-bold disabled:opacity-50"
                >
                  {generating ? 'Saving...' : 'Save Settings'}
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
