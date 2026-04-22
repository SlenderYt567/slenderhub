import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useStore } from '../store';
import {
  AlertCircle,
  Check,
  Clock,
  Code,
  Copy,
  ExternalLink,
  Info,
  Key,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

type LicenseKeyRecord = {
  id: string;
  key_string: string;
  note?: string | null;
  hwid?: string | null;
  is_active?: boolean | null;
  expires_at?: string | null;
  script_id?: string | null;
};

type ScriptSummary = {
  id: string;
  name: string;
};

type GatewayConfig = {
  shortener_url?: string | null;
  discord_url?: string | null;
  youtube_url?: string | null;
  monetag_url?: string | null;
};

type KeyPlanPreset = {
  id: string;
  label: string;
  durationDays: number;
  note: string;
  prefix?: string;
};

const KEY_PLAN_PRESETS: KeyPlanPreset[] = [
  { id: 'free-1d', label: 'Free - 1 Day', durationDays: 1, note: 'Free 1 Day Key' },
  { id: 'free-7d', label: 'Free - 7 Days', durationDays: 7, note: 'Free 7 Days Key' },
  { id: 'weekly', label: 'Premium - Weekly', durationDays: 7, note: 'Weekly Premium Key' },
  { id: 'monthly', label: 'Premium - Monthly', durationDays: 30, note: 'Monthly Premium Key' },
  { id: 'yearly', label: 'Premium - Yearly', durationDays: 365, note: 'Yearly Premium Key' },
  { id: 'lifetime', label: 'Premium - Lifetime', durationDays: 0, note: 'Lifetime Premium Key' },
];

const DeveloperPanel: React.FC = () => {
  const { user } = useStore();
  const [keys, setKeys] = useState<LicenseKeyRecord[]>([]);
  const [scripts, setScripts] = useState<ScriptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKeyConfig, setNewKeyConfig] = useState({
    planPreset: 'monthly',
    prefix: 'SLENDER',
    durationDays: 30,
    note: '',
    quantity: 1,
    script_id: '',
  });
  const [generating, setGenerating] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);

  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [gatewayConfig, setGatewayConfig] = useState<GatewayConfig>({
    shortener_url: '',
    discord_url: '',
    youtube_url: '',
    monetag_url: '',
  });
  const [devTier, setDevTier] = useState<string>('none');
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimLinkConfig, setClaimLinkConfig] = useState({
    planPreset: 'free-1d',
    prefix: 'SLENDER',
    durationDays: 1,
    note: 'Gateway claim',
    script_id: '',
  });
  const [copiedClaimLink, setCopiedClaimLink] = useState(false);

  useEffect(() => {
    if (user) {
      void fetchPanelData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const activeKeys = useMemo(
    () => keys.filter((key) => key.is_active !== false).length,
    [keys]
  );

  const lockedHwids = useMemo(
    () => keys.filter((key) => Boolean(key.hwid)).length,
    [keys]
  );

  const fetchPanelData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const [{ data: keysData, error: keysError }, { data: scriptsData, error: scriptsError }, { data: profileData, error: profileError }] =
        await Promise.all([
          supabase
            .from('license_keys')
            .select('*')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('protected_scripts')
            .select('id, name')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('profiles')
            .select('shortener_url, discord_url, youtube_url, monetag_url, dev_tier')
            .eq('id', user.id)
            .maybeSingle(),
        ]);

      if (keysError) throw keysError;
      if (scriptsError) throw scriptsError;
      if (profileError) throw profileError;

      setKeys((keysData as LicenseKeyRecord[]) || []);
      setScripts((scriptsData as ScriptSummary[]) || []);
      if (profileData) {
        setGatewayConfig(profileData);
        setDevTier(profileData.dev_tier || 'none');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load developer data.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!user) return;

    const amount = Math.min(Math.max(1, newKeyConfig.quantity), 100);
    setGenerating(true);
    setGeneratedKeys([]);

    try {
      const generatedList: string[] = [];

      for (let i = 0; i < amount; i += 1) {
        const response = await fetch('/api/keys/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            prefix: newKeyConfig.prefix || 'SLENDER',
            durationDays: newKeyConfig.durationDays,
            note: newKeyConfig.note,
            scriptId: newKeyConfig.script_id || null,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || 'Failed to generate key.');
        }

        if (payload?.success && payload?.key?.key_string) {
          generatedList.push(payload.key.key_string);
        }
      }

      setGeneratedKeys(generatedList);
      await fetchPanelData();

      if (amount === 1) {
        setIsModalOpen(false);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate key.');
    } finally {
      setGenerating(false);
    }
  };

  const handleResetHWID = async (keyId: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to reset the HWID for this key?')) return;

    try {
      const response = await fetch('/api/keys/reset-hwid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyId,
          userId: user.id,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || payload.message || 'Failed to reset HWID.');
      }

      await fetchPanelData();
    } catch (err: any) {
      alert(err.message || 'Failed to reset HWID.');
    }
  };

  const handleBanKey = async (keyId: string, currentState: boolean | null | undefined) => {
    if (!confirm(`Are you sure you want to ${currentState !== false ? 'ban/deactivate' : 'unban/activate'} this key?`)) {
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('license_keys')
        .update({ is_active: currentState === false })
        .eq('id', keyId)
        .eq('owner_id', user?.id);

      if (updateError) throw updateError;
      await fetchPanelData();
    } catch (err: any) {
      alert(err.message || 'Failed to update key status.');
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to permanently delete this key? This cannot be undone.')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('license_keys')
        .delete()
        .eq('id', keyId)
        .eq('owner_id', user?.id);

      if (deleteError) throw deleteError;
      await fetchPanelData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete key.');
    }
  };

  const handleSaveGateway = async () => {
    try {
      setGenerating(true);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          shortener_url: gatewayConfig.shortener_url || null,
          discord_url: gatewayConfig.discord_url || null,
          youtube_url: gatewayConfig.youtube_url || null,
          monetag_url: gatewayConfig.monetag_url || null,
        })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      setIsGatewayModalOpen(false);
      alert('Gateway settings saved successfully.');
      await fetchPanelData();
    } catch (err: any) {
      alert(err.message || 'Failed to save gateway settings.');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const appBaseUrl = `${window.location.origin}${window.location.pathname}`;
  const claimLink = user
    ? `${window.location.origin}/#/claim?${new URLSearchParams({
        owner: user.id,
        duration: String(claimLinkConfig.durationDays),
        prefix: claimLinkConfig.prefix || 'SLENDER',
        note: claimLinkConfig.note || 'Gateway claim',
        label: KEY_PLAN_PRESETS.find((preset) => preset.id === claimLinkConfig.planPreset)?.label || 'Custom Key',
        ...(claimLinkConfig.script_id ? { script: claimLinkConfig.script_id } : {}),
      }).toString()}`
    : '';

  const applyKeyPlanPreset = (presetId: string, target: 'manual' | 'claim') => {
    const preset = KEY_PLAN_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;

    if (target === 'manual') {
      setNewKeyConfig((current) => ({
        ...current,
        planPreset: preset.id,
        durationDays: preset.durationDays,
        note: preset.note,
        prefix: preset.prefix || current.prefix || 'SLENDER',
      }));
      return;
    }

    setClaimLinkConfig((current) => ({
      ...current,
      planPreset: preset.id,
      durationDays: preset.durationDays,
      note: preset.note,
      prefix: preset.prefix || current.prefix || 'SLENDER',
    }));
  };

  const handleCopyClaimLink = async () => {
    if (!claimLink) return;
    await navigator.clipboard.writeText(claimLink);
    setCopiedClaimLink(true);
    setTimeout(() => setCopiedClaimLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#020617] px-4 pb-12 pt-24 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center space-x-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Shield className="h-6 w-6 text-blue-500" />
              </div>
              <h1 className="text-3xl font-black tracking-tight">
                <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">DASHBOARD</span>
              </h1>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-gray-400">
              Centralize key generation, gateway configuration and protected scripts in one place. This is the core area
              that most needs to feel reliable and consistent for your developers.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/script-manager"
              className="flex items-center space-x-2 rounded-lg border border-indigo-500/30 bg-indigo-600/20 px-4 py-2 font-semibold text-indigo-400 transition-all hover:bg-indigo-600 hover:text-white"
            >
              <Code className="h-4 w-4" />
              <span>Manage Scripts</span>
            </Link>
            <button
              onClick={() => setIsGatewayModalOpen(true)}
              className="flex items-center space-x-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 transition-colors hover:bg-slate-700"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Gateway</span>
            </button>
            <button
              onClick={() => setIsClaimModalOpen(true)}
              className="flex items-center space-x-2 rounded-lg border border-emerald-500/30 bg-emerald-600/15 px-4 py-2 font-semibold text-emerald-400 transition-all hover:bg-emerald-600 hover:text-white"
            >
              <Key className="h-4 w-4" />
              <span>Claim Link</span>
            </button>
            <Link
              to="/documentation"
              className="flex items-center space-x-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 transition-colors hover:bg-slate-700"
            >
              <Info className="h-4 w-4" />
              <span>Integration</span>
            </Link>
            <button
              onClick={() => {
                setGeneratedKeys([]);
                setIsModalOpen(true);
              }}
              className="flex items-center space-x-2 rounded-lg bg-blue-600 px-6 py-2 shadow-lg shadow-blue-500/20 transition-colors hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              <span>Generate Key</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {devTier === 'none' && !loading && (
          <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-6 w-6 text-amber-400" />
              <div>
                <h3 className="mb-1 font-bold text-amber-300">Developer plan not active</h3>
                <p className="text-sm text-gray-400">
                  Activate a plan before generating production keys. This also helps keep the gateway and script system
                  consistent with the product you want to offer.
                </p>
              </div>
            </div>
            <Link
              to="/pricing"
              className="shrink-0 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-orange-400"
            >
              View Plans
            </Link>
          </div>
        )}

        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center space-x-3">
              <Key className="h-5 w-5 text-blue-400" />
              <h3 className="font-medium text-gray-400">Total Keys</h3>
            </div>
            <p className="text-3xl font-bold">{keys.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center space-x-3">
              <Shield className="h-5 w-5 text-green-400" />
              <h3 className="font-medium text-gray-400">Active Licenses</h3>
            </div>
            <p className="text-3xl font-bold">{activeKeys}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              <h3 className="font-medium text-gray-400">Locked HWIDs</h3>
            </div>
            <p className="text-3xl font-bold">{lockedHwids}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">License Key</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Customer Note</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">HWID Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Expires</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td colSpan={5} className="h-4 bg-slate-800/10 px-6 py-8" />
                    </tr>
                  ))
                ) : keys.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No keys generated yet. Click &quot;Generate Key&quot; to start.
                    </td>
                  </tr>
                ) : (
                  keys.map((key) => {
                    const gatewayLink = `${appBaseUrl}#/unlock/${key.key_string}`;
                    const isActive = key.is_active !== false;

                    return (
                      <tr key={key.id} className="transition-colors hover:bg-slate-800/20">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <code className="rounded bg-blue-500/10 px-2 py-1 font-mono text-blue-400">
                              {key.key_string}
                            </code>
                            <button
                              onClick={() => copyToClipboard(key.key_string, `key-${key.id}`)}
                              title="Copy key"
                              className="text-gray-500 transition-colors hover:text-white"
                            >
                              {copiedKey === `key-${key.id}` ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => copyToClipboard(gatewayLink, `url-${key.id}`)}
                              title="Copy gateway link"
                              className="text-blue-500 transition-colors hover:text-blue-400"
                            >
                              {copiedKey === `url-${key.id}` ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <ExternalLink className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <div className={`mt-2 flex items-center space-x-1 text-xs ${key.script_id ? 'text-indigo-400' : 'text-amber-400'}`}>
                            <Code className="h-3 w-3" />
                            <span>{key.script_id ? 'Linked to a script' : 'Global key (no script linked)'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-300">{key.note || 'No note'}</span>
                        </td>
                        <td className="px-6 py-4">
                          {key.hwid ? (
                            <div className="flex items-center space-x-2 text-xs text-green-400">
                              <Shield className="h-3 w-3" />
                              <span>Locked</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
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
                                className="rounded-lg p-2 text-amber-500 transition-colors hover:bg-amber-500/10"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleBanKey(key.id, key.is_active)}
                              title={isActive ? 'Ban / revoke access' : 'Unban'}
                              className={`rounded-lg p-2 transition-colors ${isActive ? 'text-red-500 hover:bg-red-500/10' : 'text-green-500 hover:bg-green-500/10'}`}
                            >
                              {isActive ? <Trash2 className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => void handleDeleteKey(key.id)}
                              title="Delete key permanently"
                              className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#0f172a] p-8 shadow-2xl">
            <h2 className="mb-6 text-2xl font-bold">Generate New Key</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Plan Preset</label>
                <select
                  value={newKeyConfig.planPreset}
                  onChange={(e) => applyKeyPlanPreset(e.target.value, 'manual')}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {KEY_PLAN_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">Key Prefix</label>
                <input
                  type="text"
                  value={newKeyConfig.prefix}
                  onChange={(e) => setNewKeyConfig({ ...newKeyConfig, prefix: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="EX: SLENDER"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">Duration (Days)</label>
                <select
                  value={newKeyConfig.durationDays}
                  onChange={(e) => setNewKeyConfig({ ...newKeyConfig, durationDays: parseInt(e.target.value, 10) })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1 Day</option>
                  <option value={7}>7 Days</option>
                  <option value={30}>30 Days (1 Month)</option>
                  <option value={365}>365 Days (1 Year)</option>
                  <option value={0}>Lifetime</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">Internal Note (Customer Name)</label>
                <input
                  type="text"
                  value={newKeyConfig.note}
                  onChange={(e) => setNewKeyConfig({ ...newKeyConfig, note: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: John Doe"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">Link to Script</label>
                <select
                  value={newKeyConfig.script_id}
                  onChange={(e) => setNewKeyConfig({ ...newKeyConfig, script_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Global Key (access to every compatible script)</option>
                  {scripts.map((script) => (
                    <option key={script.id} value={script.id}>
                      {script.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">Quantity</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newKeyConfig.quantity}
                  onChange={(e) => setNewKeyConfig({ ...newKeyConfig, quantity: parseInt(e.target.value, 10) || 1 })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {generatedKeys.length > 1 && (
                <div className="mt-4 animate-in fade-in">
                  <label className="mb-1 block text-sm font-bold text-green-400">Generated Keys ({generatedKeys.length})</label>
                  <textarea
                    readOnly
                    value={generatedKeys.join('\n')}
                    className="h-32 w-full rounded-xl border border-green-500/30 bg-slate-950 px-4 py-2 font-mono text-sm text-green-400 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-xl bg-slate-800 px-4 py-2 transition-colors hover:bg-slate-700"
                >
                  {generatedKeys.length > 1 ? 'Close' : 'Cancel'}
                </button>
                <button
                  onClick={handleGenerateKey}
                  disabled={generating}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-2 font-bold transition-colors hover:bg-blue-500 disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-[#0f172a] p-8 shadow-2xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                <Key className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Get Key Page</h2>
                <p className="text-sm text-gray-400">
                  Create a public claim page that generates a fresh key only after the user completes the gateway.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-gray-400">Plan Preset</label>
                <select
                  value={claimLinkConfig.planPreset}
                  onChange={(e) => applyKeyPlanPreset(e.target.value, 'claim')}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {KEY_PLAN_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">Prefix</label>
                <input
                  type="text"
                  value={claimLinkConfig.prefix}
                  onChange={(e) => setClaimLinkConfig({ ...claimLinkConfig, prefix: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="SLENDER"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">Duration (Days)</label>
                <select
                  value={claimLinkConfig.durationDays}
                  onChange={(e) => setClaimLinkConfig({ ...claimLinkConfig, durationDays: parseInt(e.target.value, 10) })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={1}>1 Day</option>
                  <option value={7}>7 Days</option>
                  <option value={30}>30 Days</option>
                  <option value={365}>365 Days</option>
                  <option value={0}>Lifetime</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-gray-400">Claim Type</label>
                <select
                  value={claimLinkConfig.script_id}
                  onChange={(e) => setClaimLinkConfig({ ...claimLinkConfig, script_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Global Key Claim</option>
                  {scripts.map((script) => (
                    <option key={script.id} value={script.id}>
                      {script.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-gray-400">Internal Note</label>
                <input
                  type="text"
                  value={claimLinkConfig.note}
                  onChange={(e) => setClaimLinkConfig({ ...claimLinkConfig, note: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Gateway claim"
                />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <h3 className="mb-2 font-bold text-emerald-300">Public Get Key URL</h3>
              <code className="block break-all rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-emerald-400 select-all">
                {claimLink}
              </code>
              <p className="mt-2 text-xs leading-relaxed text-gray-400">
                Share this page with users. After the gateway, the site creates a new key automatically with the selected
                duration and script scope. This replaces the old manual flow where you had to pre-generate large batches.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-emerald-300">
                Current plan: {KEY_PLAN_PRESETS.find((preset) => preset.id === claimLinkConfig.planPreset)?.label || 'Custom Key'}
              </p>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => setIsClaimModalOpen(false)}
                className="flex-1 rounded-xl bg-slate-800 px-4 py-2 transition-colors hover:bg-slate-700"
              >
                Close
              </button>
              <button
                onClick={() => void handleCopyClaimLink()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-bold transition-colors hover:bg-emerald-500"
              >
                {copiedClaimLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedClaimLink ? 'Copied' : 'Copy Claim Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isGatewayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-[#0f172a] p-8 shadow-2xl">
            <div className="mb-6 flex items-center space-x-3">
              <ExternalLink className="h-6 w-6 text-blue-500" />
              <h2 className="text-2xl font-bold">Gateway Config</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Linkvertise User ID (Optional)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={gatewayConfig.shortener_url || ''}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, shortener_url: e.target.value.replace(/[^0-9]/g, '') })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: 982465"
                  />
                  <a
                    href="https://publisher.linkvertise.com/ac/links"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whitespace-nowrap text-sm text-blue-500 hover:text-blue-400"
                  >
                    Find ID
                  </a>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  If provided, the site will generate Linkvertise dynamic ads for each unlock flow.
                </p>
              </div>

              <div className="rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 text-blue-400" />
                  <div>
                    <h4 className="mb-1 text-sm font-bold text-blue-300">Custom Shortener / Manual Mode</h4>
                    <p className="text-xs leading-relaxed text-gray-400">
                      If you use Monetag, LootLabs or another shortener, set the destination URL to:
                      <code className="mt-2 block break-all rounded border border-slate-800 bg-slate-950 p-2 text-blue-400 select-all">
                        {window.location.origin}/#/verify-gateway
                      </code>
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">YouTube Required Channel URL</label>
                <input
                  type="url"
                  value={gatewayConfig.youtube_url || ''}
                  onChange={(e) => setGatewayConfig({ ...gatewayConfig, youtube_url: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-red-500"
                  placeholder="https://youtube.com/@..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">Discord Invite URL</label>
                <input
                  type="url"
                  value={gatewayConfig.discord_url || ''}
                  onChange={(e) => setGatewayConfig({ ...gatewayConfig, discord_url: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://discord.gg/..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">Monetag Direct Link (Optional)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="url"
                    value={gatewayConfig.monetag_url || ''}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, monetag_url: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-blue-500"
                    placeholder="https://go.monetag.com/..."
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Paste your Monetag Direct Link here to monetize your key system.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setIsGatewayModalOpen(false)}
                  className="flex-1 rounded-xl bg-slate-800 px-4 py-2 transition-colors hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGateway}
                  disabled={generating}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-2 font-bold transition-colors hover:bg-blue-500 disabled:opacity-50"
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
