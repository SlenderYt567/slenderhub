import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useStore } from '../store';
import {
  AlertCircle,
  BarChart2,
  Check,
  Clock,
  Code,
  Copy,
  ExternalLink,
  Filter,
  Info,
  Key,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type LicenseKeyRecord = {
  id: string;
  key_string: string;
  note?: string | null;
  hwid?: string | null;
  is_active?: boolean | null;
  expires_at?: string | null;
  script_id?: string | null;
  created_at?: string | null;
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
  color: string;
};

type FilterStatus = 'all' | 'active' | 'banned' | 'expired' | 'hwid' | 'no_hwid';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const KEY_PLAN_PRESETS: KeyPlanPreset[] = [
  { id: 'free-1d',  label: 'Free — 1 Day',        durationDays: 1,   note: 'Free 1 Day Key',      color: 'text-gray-400 bg-gray-400/10 border-gray-400/20' },
  { id: 'free-7d',  label: 'Free — 7 Days',        durationDays: 7,   note: 'Free 7 Days Key',     color: 'text-gray-400 bg-gray-400/10 border-gray-400/20' },
  { id: 'weekly',   label: 'Premium — Weekly',      durationDays: 7,   note: 'Weekly Premium Key',  color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  { id: 'monthly',  label: 'Premium — Monthly',     durationDays: 30,  note: 'Monthly Premium Key', color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20' },
  { id: 'yearly',   label: 'Premium — Yearly',      durationDays: 365, note: 'Yearly Premium Key',  color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  { id: 'lifetime', label: 'Premium — Lifetime',    durationDays: 0,   note: 'Lifetime Premium Key', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper utilities
// ─────────────────────────────────────────────────────────────────────────────

function getDaysRemaining(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function isExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

function getExpiryBadge(expiresAt: string | null | undefined) {
  if (!expiresAt) return { label: 'Lifetime', className: 'text-amber-400 bg-amber-400/10 border border-amber-400/20' };
  const days = getDaysRemaining(expiresAt);
  if (days === 0 || (days !== null && days < 0)) return { label: 'Expired', className: 'text-red-400 bg-red-400/10 border border-red-400/20' };
  if (days !== null && days <= 3) return { label: `${days}d left`, className: 'text-orange-400 bg-orange-400/10 border border-orange-400/20' };
  if (days !== null && days <= 14) return { label: `${days}d left`, className: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20' };
  return { label: new Date(expiresAt).toLocaleDateString(), className: 'text-gray-400 bg-gray-400/10 border border-gray-400/20' };
}

function getPlanBadge(note: string | null | undefined) {
  const n = (note || '').toLowerCase();
  if (n.includes('lifetime')) return { label: 'LIFETIME', className: 'text-amber-400 bg-amber-400/10 border border-amber-400/20' };
  if (n.includes('yearly') || n.includes('year')) return { label: 'YEARLY', className: 'text-purple-400 bg-purple-400/10 border border-purple-400/20' };
  if (n.includes('monthly') || n.includes('month')) return { label: 'MONTHLY', className: 'text-indigo-400 bg-indigo-400/10 border border-indigo-400/20' };
  if (n.includes('weekly') || n.includes('week') || n.includes('7')) return { label: 'WEEKLY', className: 'text-blue-400 bg-blue-400/10 border border-blue-400/20' };
  if (n.includes('free')) return { label: 'FREE', className: 'text-gray-400 bg-gray-400/10 border border-gray-400/20' };
  return { label: 'CUSTOM', className: 'text-slate-400 bg-slate-400/10 border border-slate-400/20' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirm Modal (replaces window.confirm)
// ─────────────────────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  isDanger?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ message, onConfirm, onCancel, confirmLabel = 'Confirm', isDanger = false }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
    <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-[#0f172a] p-6 shadow-2xl">
      <p className="mb-6 text-center text-sm leading-relaxed text-gray-300">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl bg-slate-800 py-2 text-sm font-medium transition-colors hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`flex-1 rounded-xl py-2 text-sm font-bold transition-colors ${isDanger ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const DeveloperPanel: React.FC = () => {
  const { user, showToast } = useStore();
  const [keys, setKeys] = useState<LicenseKeyRecord[]>([]);
  const [scripts, setScripts] = useState<ScriptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // ── Key generation modal ──
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

  // ── Gateway modal ──
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [gatewayConfig, setGatewayConfig] = useState<GatewayConfig>({
    shortener_url: '',
    discord_url: '',
    youtube_url: '',
    monetag_url: '',
  });

  // ── Claim link modal ──
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

  // ── Lua Snippet modal ──
  const [isLuaModalOpen, setIsLuaModalOpen] = useState(false);
  const [luaSelectedScript, setLuaSelectedScript] = useState('');
  const [copiedLua, setCopiedLua] = useState(false);

  // ── Confirm modal ──
  const [confirmState, setConfirmState] = useState<{
    message: string;
    onConfirm: () => void;
    confirmLabel?: string;
    isDanger?: boolean;
  } | null>(null);

  // ── Table filters ──
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterScriptId, setFilterScriptId] = useState('');

  // ─────────────────────────────────────────────────────────────────────────
  // Data fetching
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (user) {
      void fetchPanelData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchPanelData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      const [
        { data: keysData, error: keysError },
        { data: scriptsData, error: scriptsError },
        { data: profileData, error: profileError },
      ] = await Promise.all([
        supabase.from('license_keys').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
        supabase.from('protected_scripts').select('id, name').eq('owner_id', user.id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('shortener_url, discord_url, youtube_url, monetag_url, dev_tier').eq('id', user.id).maybeSingle(),
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

  // ─────────────────────────────────────────────────────────────────────────
  // Confirm helper (replaces window.confirm)
  // ─────────────────────────────────────────────────────────────────────────

  const confirm = (message: string, confirmLabel = 'Confirm', isDanger = false): Promise<boolean> =>
    new Promise((resolve) => {
      setConfirmState({
        message,
        onConfirm: () => { setConfirmState(null); resolve(true); },
        confirmLabel,
        isDanger,
      });
      // If user doesn't interact (ESC), we close and resolve false via cancel
      // Cancel is handled inside ConfirmModal via onCancel
    });

  // ─────────────────────────────────────────────────────────────────────────
  // Stats (derived)
  // ─────────────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = keys.length;
    const active = keys.filter((k) => k.is_active !== false && !isExpired(k.expires_at)).length;
    const banned = keys.filter((k) => k.is_active === false).length;
    const expired = keys.filter((k) => isExpired(k.expires_at)).length;
    const withHwid = keys.filter((k) => Boolean(k.hwid)).length;
    return { total, active, banned, expired, withHwid };
  }, [keys]);

  // ─────────────────────────────────────────────────────────────────────────
  // Filtered keys
  // ─────────────────────────────────────────────────────────────────────────

  const filteredKeys = useMemo(() => {
    return keys.filter((key) => {
      // Search
      const q = searchQuery.toLowerCase();
      if (q && !key.key_string.toLowerCase().includes(q) && !(key.note || '').toLowerCase().includes(q)) {
        return false;
      }

      // Status filter
      if (filterStatus === 'active' && (key.is_active === false || isExpired(key.expires_at))) return false;
      if (filterStatus === 'banned' && key.is_active !== false) return false;
      if (filterStatus === 'expired' && !isExpired(key.expires_at)) return false;
      if (filterStatus === 'hwid' && !key.hwid) return false;
      if (filterStatus === 'no_hwid' && key.hwid) return false;

      // Script filter
      if (filterScriptId === '__global' && key.script_id) return false;
      if (filterScriptId && filterScriptId !== '__global' && key.script_id !== filterScriptId) return false;

      return true;
    });
  }, [keys, searchQuery, filterStatus, filterScriptId]);

  // ─────────────────────────────────────────────────────────────────────────
  // Script name lookup
  // ─────────────────────────────────────────────────────────────────────────

  const scriptMap = useMemo(() => {
    const m: Record<string, string> = {};
    scripts.forEach((s) => { m[s.id] = s.name; });
    return m;
  }, [scripts]);

  // ─────────────────────────────────────────────────────────────────────────
  // Lua loader snippet
  // ─────────────────────────────────────────────────────────────────────────

  const baseUrl = useMemo(() => window.location.origin, []);
  const luaSnippet = useMemo(() => {
    const scriptParam = luaSelectedScript ? `&script_id=${luaSelectedScript}` : '';
    return `-- ┌─────────────────────────────────────────────────────┐
-- │  SLENDER HUB — Auto-generated Loader                │
-- │  Copy and paste at the TOP of your script           │
-- └─────────────────────────────────────────────────────┘
local HttpService  = game:GetService("HttpService")
local Analytics    = game:GetService("RbxAnalyticsService")

local VERIFY_URL   = "${baseUrl}/api/keys/verify"
local KEY_FILE     = "SlenderHubKey.json"
local LICENSE_KEY  = "PASTE_YOUR_KEY_HERE"  -- Replace with user's key

local function getHWID()
    local ok, id = pcall(function() return Analytics:GetClientId() end)
    return ok and id or "UNKNOWN"
end

local function verifyKey(licenseKey)
    local url = VERIFY_URL
        .. "?key="       .. HttpService:UrlEncode(licenseKey)
        .. "&hwid="      .. HttpService:UrlEncode(getHWID())
        .. "${scriptParam}"
    local ok, raw = pcall(HttpService.GetAsync, HttpService, url)
    if not ok then warn("[SlenderHub] HTTP request failed:", raw) return false end
    local ok2, data = pcall(HttpService.JSONDecode, HttpService, raw)
    if not ok2 or not data then warn("[SlenderHub] JSON parse error") return false end
    if not data.valid then
        warn("[SlenderHub] Invalid key:", data.message or "unknown reason")
        return false
    end
    print("[SlenderHub] ✔ Authenticated | Tier:", data.tier, "| Expires:", data.expires_at or "Never")
    return true
end

if not verifyKey(LICENSE_KEY) then
    error("[SlenderHub] Access denied. Get a valid key at: ${baseUrl}/#/claim")
end

-- ✅ Key is valid — your script starts here`;
  }, [baseUrl, luaSelectedScript]);

  // ─────────────────────────────────────────────────────────────────────────
  // Claim link
  // ─────────────────────────────────────────────────────────────────────────

  const claimLink = user
    ? `${window.location.origin}/#/claim?${new URLSearchParams({
        owner: user.id,
        duration: String(claimLinkConfig.durationDays),
        prefix: claimLinkConfig.prefix || 'SLENDER',
        note: claimLinkConfig.note || 'Gateway claim',
        label: KEY_PLAN_PRESETS.find((p) => p.id === claimLinkConfig.planPreset)?.label || 'Custom Key',
        ...(claimLinkConfig.script_id ? { script: claimLinkConfig.script_id } : {}),
      }).toString()}`
    : '';

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────

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
        if (!response.ok) throw new Error(payload.error || 'Failed to generate key.');
        if (payload?.success && payload?.key?.key_string) {
          generatedList.push(payload.key.key_string);
        }
      }

      setGeneratedKeys(generatedList);
      await fetchPanelData();
      if (amount === 1) {
        showToast(`Key generated: ${generatedList[0]}`, 'success');
        setIsModalOpen(false);
      } else {
        showToast(`${generatedList.length} keys generated successfully!`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to generate key.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleResetHWID = async (keyId: string) => {
    if (!user) return;
    const ok = await confirm('Reset the HWID for this key? The user will need to re-authenticate on their device.', 'Reset HWID', false);
    if (!ok) return;

    try {
      const response = await fetch('/api/keys/reset-hwid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId, userId: user.id }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || payload.message || 'Failed to reset HWID.');
      showToast('HWID reset successfully.', 'success');
      await fetchPanelData();
    } catch (err: any) {
      showToast(err.message || 'Failed to reset HWID.', 'error');
    }
  };

  const handleBanKey = async (keyId: string, currentState: boolean | null | undefined) => {
    const action = currentState !== false ? 'ban/deactivate' : 'unban/activate';
    const ok = await confirm(`Are you sure you want to ${action} this key?`, currentState !== false ? 'Ban Key' : 'Unban Key', currentState !== false);
    if (!ok) return;

    try {
      const { error: updateError } = await supabase
        .from('license_keys')
        .update({ is_active: currentState === false })
        .eq('id', keyId)
        .eq('owner_id', user?.id);
      if (updateError) throw updateError;
      showToast(`Key ${currentState !== false ? 'banned' : 'unbanned'} successfully.`, currentState !== false ? 'error' : 'success');
      await fetchPanelData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update key status.', 'error');
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    const ok = await confirm('Permanently delete this key? This cannot be undone.', 'Delete Key', true);
    if (!ok) return;

    try {
      const { error: deleteError } = await supabase
        .from('license_keys')
        .delete()
        .eq('id', keyId)
        .eq('owner_id', user?.id);
      if (deleteError) throw deleteError;
      showToast('Key deleted.', 'info');
      await fetchPanelData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete key.', 'error');
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
      showToast('Gateway settings saved.', 'success');
      await fetchPanelData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save gateway settings.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyClaimLink = async () => {
    if (!claimLink) return;
    await navigator.clipboard.writeText(claimLink);
    setCopiedClaimLink(true);
    setTimeout(() => setCopiedClaimLink(false), 2000);
  };

  const handleCopyLua = async () => {
    await navigator.clipboard.writeText(luaSnippet);
    setCopiedLua(true);
    showToast('Lua snippet copied! Paste it at the top of your script.', 'success');
    setTimeout(() => setCopiedLua(false), 2000);
  };

  const applyKeyPlanPreset = (presetId: string, target: 'manual' | 'claim') => {
    const preset = KEY_PLAN_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    if (target === 'manual') {
      setNewKeyConfig((c) => ({
        ...c,
        planPreset: preset.id,
        durationDays: preset.durationDays,
        note: preset.note,
        prefix: preset.prefix || c.prefix || 'SLENDER',
      }));
    } else {
      setClaimLinkConfig((c) => ({
        ...c,
        planPreset: preset.id,
        durationDays: preset.durationDays,
        note: preset.note,
        prefix: preset.prefix || c.prefix || 'SLENDER',
      }));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#020617] px-4 pb-12 pt-24 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center space-x-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Shield className="h-6 w-6 text-blue-500" />
              </div>
              <h1 className="text-3xl font-black tracking-tight">
                <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">DEVELOPER PANEL</span>
              </h1>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-gray-400">
              Manage keys, gateway, scripts and analytics in one place. Fully compatible with Roblox executors.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/script-manager"
              className="flex items-center space-x-2 rounded-lg border border-indigo-500/30 bg-indigo-600/20 px-4 py-2 font-semibold text-indigo-400 transition-all hover:bg-indigo-600 hover:text-white"
            >
              <Code className="h-4 w-4" />
              <span>Scripts</span>
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
            <button
              onClick={() => setIsLuaModalOpen(true)}
              className="flex items-center space-x-2 rounded-lg border border-amber-500/30 bg-amber-600/15 px-4 py-2 font-semibold text-amber-400 transition-all hover:bg-amber-600 hover:text-white"
            >
              <Zap className="h-4 w-4" />
              <span>Lua Loader</span>
            </button>
            <Link
              to="/documentation"
              className="flex items-center space-x-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 transition-colors hover:bg-slate-700"
            >
              <Info className="h-4 w-4" />
              <span>Docs</span>
            </Link>
            <button
              onClick={() => { setGeneratedKeys([]); setIsModalOpen(true); }}
              className="flex items-center space-x-2 rounded-lg bg-blue-600 px-6 py-2 shadow-lg shadow-blue-500/20 transition-colors hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              <span>Generate Key</span>
            </button>
          </div>
        </div>

        {/* ── Error banner ───────────────────────────────────────────────── */}
        {error && (
          <div className="mb-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">{error}</div>
        )}

        {/* ── Plan warning ───────────────────────────────────────────────── */}
        {devTier === 'none' && !loading && (
          <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-6 w-6 text-amber-400" />
              <div>
                <h3 className="mb-1 font-bold text-amber-300">Developer plan not active</h3>
                <p className="text-sm text-gray-400">Activate a plan before generating production keys.</p>
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

        {/* ── Stats cards ────────────────────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            { icon: <Key className="h-5 w-5 text-blue-400" />, label: 'Total Keys', value: stats.total, color: 'text-white' },
            { icon: <Shield className="h-5 w-5 text-green-400" />, label: 'Active', value: stats.active, color: 'text-green-400' },
            { icon: <XCircle className="h-5 w-5 text-red-400" />, label: 'Banned', value: stats.banned, color: 'text-red-400' },
            { icon: <Clock className="h-5 w-5 text-orange-400" />, label: 'Expired', value: stats.expired, color: 'text-orange-400' },
            { icon: <BarChart2 className="h-5 w-5 text-indigo-400" />, label: 'HWID Locked', value: stats.withHwid, color: 'text-indigo-400' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-sm">
              <div className="mb-3 flex items-center space-x-2">
                {stat.icon}
                <span className="text-xs font-medium text-gray-500">{stat.label}</span>
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* ── Search + Filter bar ────────────────────────────────────────── */}
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search key or note…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
              <option value="expired">Expired</option>
              <option value="hwid">HWID Locked</option>
              <option value="no_hwid">Unused (no HWID)</option>
            </select>
            <select
              value={filterScriptId}
              onChange={(e) => setFilterScriptId(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Scripts</option>
              <option value="__global">Global Keys</option>
              {scripts.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <span className="flex items-center text-xs text-gray-500">
            {filteredKeys.length} / {keys.length} keys
          </span>
        </div>

        {/* ── Keys table ─────────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">License Key</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Plan / Note</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Script</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">HWID</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Expires</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="h-4 w-full rounded bg-slate-800" />
                      </td>
                    </tr>
                  ))
                ) : filteredKeys.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center">
                      <Key className="mx-auto mb-3 h-8 w-8 text-slate-700" />
                      <p className="text-gray-500">
                        {keys.length === 0
                          ? 'No keys yet. Click "Generate Key" to start.'
                          : 'No keys match your search / filter.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredKeys.map((key) => {
                    const isActive = key.is_active !== false;
                    const expired = isExpired(key.expires_at);
                    const expiryBadge = getExpiryBadge(key.expires_at);
                    const planBadge = getPlanBadge(key.note);
                    const scriptName = key.script_id ? (scriptMap[key.script_id] || 'Script') : null;
                    const gatewayLink = `${window.location.origin}/#/unlock/${key.key_string}`;

                    return (
                      <tr
                        key={key.id}
                        className={`transition-colors hover:bg-slate-800/20 ${!isActive || expired ? 'opacity-60' : ''}`}
                      >
                        {/* Key string */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <code className="rounded bg-blue-500/10 px-2 py-1 font-mono text-xs text-blue-400">
                              {key.key_string}
                            </code>
                            <button
                              onClick={() => copyToClipboard(key.key_string, `key-${key.id}`)}
                              title="Copy key"
                              className="text-gray-500 transition-colors hover:text-white"
                            >
                              {copiedKey === `key-${key.id}` ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(gatewayLink, `url-${key.id}`)}
                              title="Copy gateway link"
                              className="text-blue-500 transition-colors hover:text-blue-400"
                            >
                              {copiedKey === `url-${key.id}` ? <Check className="h-3.5 w-3.5 text-green-400" /> : <ExternalLink className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          {/* Status badges row */}
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold border ${planBadge.className}`}>
                              {planBadge.label}
                            </span>
                            {!isActive && (
                              <span className="inline-flex items-center rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
                                BANNED
                              </span>
                            )}
                            {isActive && expired && (
                              <span className="inline-flex items-center rounded border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-bold text-orange-400">
                                EXPIRED
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Note */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-300">{key.note || '—'}</span>
                        </td>

                        {/* Script */}
                        <td className="px-6 py-4">
                          {scriptName ? (
                            <span className="inline-flex items-center gap-1 rounded border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-300">
                              <Code className="h-3 w-3" />
                              {scriptName}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-600">Global</span>
                          )}
                        </td>

                        {/* HWID */}
                        <td className="px-6 py-4">
                          {key.hwid ? (
                            <div className="flex items-center gap-1 text-xs text-green-400">
                              <Shield className="h-3 w-3" />
                              <span>Locked</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Clock className="h-3 w-3" />
                              <span>Unused</span>
                            </div>
                          )}
                        </td>

                        {/* Expiry */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded px-1.5 py-0.5 text-xs ${expiryBadge.className}`}>
                            {expiryBadge.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {key.hwid && (
                              <button
                                onClick={() => void handleResetHWID(key.id)}
                                title="Reset HWID"
                                className="rounded-lg p-1.5 text-amber-500 transition-colors hover:bg-amber-500/10"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => void handleBanKey(key.id, key.is_active)}
                              title={isActive ? 'Ban key' : 'Unban key'}
                              className={`rounded-lg p-1.5 transition-colors ${isActive ? 'text-orange-500 hover:bg-orange-500/10' : 'text-green-500 hover:bg-green-500/10'}`}
                            >
                              {isActive ? <XCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => void handleDeleteKey(key.id)}
                              title="Delete key permanently"
                              className="rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-500/10"
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

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: Generate Key
      ════════════════════════════════════════════════════════════════════ */}
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
                  {KEY_PLAN_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
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
                  placeholder="SLENDER"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">Duration (Days, 0 = Lifetime)</label>
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
                  <option value="">Global Key (all compatible scripts)</option>
                  {scripts.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">Quantity (max 100)</label>
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
                <div className="mt-4">
                  <label className="mb-1 block text-sm font-bold text-green-400">Generated Keys ({generatedKeys.length})</label>
                  <textarea
                    readOnly
                    value={generatedKeys.join('\n')}
                    className="h-32 w-full rounded-xl border border-green-500/30 bg-slate-950 px-4 py-2 font-mono text-sm text-green-400 focus:outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(generatedKeys.join('\n'), 'batch')}
                    className="mt-2 flex items-center gap-2 text-xs text-gray-400 hover:text-white"
                  >
                    {copiedKey === 'batch' ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                    Copy all keys
                  </button>
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
                  {generating ? 'Generating…' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: Lua Loader Snippet
      ════════════════════════════════════════════════════════════════════ */}
      {isLuaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-amber-500/20 bg-[#0f172a] p-8 shadow-2xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Lua Loader Snippet</h2>
                <p className="text-sm text-gray-400">Auto-generated. Paste at the top of your script.</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm text-gray-400">Restrict to specific script (optional)</label>
              <select
                value={luaSelectedScript}
                onChange={(e) => setLuaSelectedScript(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Global key (any script)</option>
                {scripts.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2">
                <span className="text-xs font-medium uppercase tracking-wider text-amber-400">Luau — Executor compatible</span>
                <button
                  onClick={() => void handleCopyLua()}
                  className="flex items-center gap-2 rounded-lg bg-amber-600/20 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-600 hover:text-white"
                >
                  {copiedLua ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedLua ? 'Copied!' : 'Copy Snippet'}
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto p-5">
                <pre className="text-xs leading-relaxed text-amber-200 whitespace-pre-wrap">{luaSnippet}</pre>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-300">
              <strong>How it works:</strong> The loader calls <code className="text-blue-400">/api/keys/verify</code> with the key + HWID. On first use, the key locks to that HWID. Invalid keys throw an error before any script code runs.
            </div>

            <button
              onClick={() => setIsLuaModalOpen(false)}
              className="mt-6 w-full rounded-xl bg-slate-800 py-2 transition-colors hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: Claim Link
      ════════════════════════════════════════════════════════════════════ */}
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
                  Public claim page — generates a fresh key after the gateway is completed.
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
                  {KEY_PLAN_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
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
                  {scripts.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
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
              <code className="block select-all break-all rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-emerald-400">
                {claimLink}
              </code>
              <p className="mt-2 text-xs text-emerald-400">
                Plan: {KEY_PLAN_PRESETS.find((p) => p.id === claimLinkConfig.planPreset)?.label}
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
                {copiedClaimLink ? 'Copied!' : 'Copy Claim Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: Gateway Config
      ════════════════════════════════════════════════════════════════════ */}
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
                <input
                  type="url"
                  value={gatewayConfig.monetag_url || ''}
                  onChange={(e) => setGatewayConfig({ ...gatewayConfig, monetag_url: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-blue-500"
                  placeholder="https://go.monetag.com/..."
                />
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
                  {generating ? 'Saving…' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Confirm Modal (native replacement)
      ════════════════════════════════════════════════════════════════════ */}
      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
          confirmLabel={confirmState.confirmLabel}
          isDanger={confirmState.isDanger}
        />
      )}
    </div>
  );
};

export default DeveloperPanel;
