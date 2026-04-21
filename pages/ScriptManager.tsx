import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useStore } from '../store';
import { ArrowLeft, Code, Plus, Power, Save, Shield, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

type ProtectedScript = {
  id: string;
  name: string;
  script_content: string;
  is_active?: boolean | null;
  created_at: string;
};

const ScriptManager: React.FC = () => {
  const { user } = useStore();
  const [scripts, setScripts] = useState<ProtectedScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingScript, setEditingScript] = useState<ProtectedScript | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newScript, setNewScript] = useState({ name: '', content: '' });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      void fetchScripts();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loaderHost = useMemo(() => window.location.origin, []);

  const fetchScripts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('protected_scripts')
        .select('*')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScripts((data as ProtectedScript[]) || []);
    } catch (err: any) {
      alert(err.message || 'Failed to load scripts.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScript = async () => {
    if (!newScript.name.trim() || !newScript.content.trim()) return;

    try {
      setSaving(true);
      const { error } = await supabase.from('protected_scripts').insert({
        owner_id: user?.id,
        name: newScript.name.trim(),
        script_content: newScript.content,
      });

      if (error) throw error;

      setIsModalOpen(false);
      setNewScript({ name: '', content: '' });
      await fetchScripts();
    } catch (err: any) {
      alert(err.message || 'Failed to create script.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateScript = async () => {
    if (!editingScript) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('protected_scripts')
        .update({
          script_content: editingScript.script_content,
          name: editingScript.name.trim(),
        })
        .eq('id', editingScript.id)
        .eq('owner_id', user?.id);

      if (error) throw error;

      setEditingScript(null);
      await fetchScripts();
      alert('Script updated successfully and already live for the loader.');
    } catch (err: any) {
      alert(err.message || 'Failed to update script.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleScript = async (scriptId: string, currentState: boolean) => {
    try {
      if (!confirm(`Are you sure you want to ${currentState ? 'disable' : 'enable'} this script globally?`)) return;

      const { error } = await supabase
        .from('protected_scripts')
        .update({ is_active: !currentState })
        .eq('id', scriptId)
        .eq('owner_id', user?.id);

      if (error) throw error;
      await fetchScripts();
    } catch (err: any) {
      alert(err.message || 'Failed to update script status.');
    }
  };

  const handleDeleteScript = async (scriptId: string) => {
    try {
      if (!confirm('Are you sure you want to permanently delete this script?')) return;

      const { error } = await supabase
        .from('protected_scripts')
        .delete()
        .eq('id', scriptId)
        .eq('owner_id', user?.id);

      if (error) throw error;

      if (editingScript?.id === scriptId) {
        setEditingScript(null);
      }

      await fetchScripts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete script.');
    }
  };

  const copyLoaderSnippet = async (scriptId: string) => {
    const snippet = [
      '_G.SlenderKey = "YOUR_KEY_HERE"',
      `_G.SlenderScriptId = "${scriptId}"`,
      `loadstring(game:HttpGet("${loaderHost}/api/scripts/loader?key=" .. _G.SlenderKey .. "&hwid=" .. game:GetService("RbxAnalyticsService"):GetClientId()))()`,
    ].join('\n');

    await navigator.clipboard.writeText(snippet);
    setCopiedId(scriptId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#020617] px-4 pb-12 pt-24 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <Link to="/developer-panel" className="mb-2 flex items-center text-sm text-blue-500 transition-colors hover:text-blue-400">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to Panel
            </Link>
            <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight">
              <Shield className="h-8 w-8 text-indigo-500" />
              SCRIPT <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">MANAGER</span>
            </h1>
            <p className="mt-1 text-gray-400">Manage the Lua scripts that are delivered by your protected loader.</p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 rounded-lg bg-indigo-600 px-6 py-2 shadow-lg transition-colors hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            <span>New Script</span>
          </button>
        </div>

        {editingScript && (
          <div className="animate-in fade-in slide-in-from-top-4 mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <input
                type="text"
                value={editingScript.name}
                onChange={(e) => setEditingScript({ ...editingScript, name: e.target.value })}
                className="border-b border-transparent bg-transparent text-xl font-bold text-white outline-none transition-colors focus:border-indigo-500 focus:text-indigo-400"
              />
              <div className="flex gap-2">
                <button onClick={() => setEditingScript(null)} className="rounded-lg bg-slate-800 px-4 py-2 text-sm">
                  Cancel
                </button>
                <button
                  onClick={handleUpdateScript}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold shadow-lg shadow-green-500/20 transition-colors hover:bg-green-500 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> Save changes
                </button>
              </div>
            </div>
            <textarea
              value={editingScript.script_content}
              onChange={(e) => setEditingScript({ ...editingScript, script_content: e.target.value })}
              className="h-[400px] w-full rounded-xl border border-slate-800 bg-[#0f172a] p-4 font-mono text-sm outline-none focus:border-indigo-500"
              placeholder="Paste your Lua code here..."
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {scripts.map((script) => {
            const isActive = script.is_active !== false;

            return (
              <div
                key={script.id}
                className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900 p-6 transition-colors hover:border-indigo-500/50"
                onClick={() => setEditingScript(script)}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className={`rounded-xl p-3 ${isActive ? 'bg-indigo-500/10 text-indigo-400' : 'bg-red-500/10 text-red-500'}`}>
                    <Code className="h-6 w-6" />
                  </div>
                  <div className="flex gap-3">
                    <button
                      className={`rounded-lg p-2 transition-colors ${isActive ? 'text-green-500 hover:bg-green-500/10' : 'text-red-500 hover:bg-red-500/10'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleToggleScript(script.id, isActive);
                      }}
                      title={isActive ? 'Kill switch: ON' : 'Kill switch: OFF'}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-red-500/10 hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteScript(script.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="mb-1 text-lg font-bold">
                  {script.name}
                  {!isActive && (
                    <span className="ml-2 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-500">DISABLED</span>
                  )}
                </h3>
                <p className="font-mono text-xs text-slate-500" title={script.id}>
                  ID: <span className="text-slate-400">{script.id.split('-')[0]}...</span>
                </p>

                <div className="mb-2 mt-4 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-2">
                  <span className="w-2/3 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs text-slate-400 select-all">
                    loadstring(...)()
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void copyLoaderSnippet(script.id);
                    }}
                    className="rounded bg-indigo-600 px-3 py-1 text-xs font-bold transition-colors hover:bg-indigo-500"
                  >
                    {copiedId === script.id ? 'Copied' : 'Copy Loader'}
                  </button>
                </div>

                <div className="mt-4 flex justify-between border-t border-slate-800 pt-4 text-xs text-gray-400">
                  <span>Created</span>
                  <span>{new Date(script.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}

          {!loading && scripts.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500">
              No protected scripts yet. Create one to start issuing script-linked keys.
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-[#0f172a] p-8 shadow-2xl">
            <h2 className="mb-6 text-2xl font-bold">Create Protected Script</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Public Script Name</label>
                <input
                  type="text"
                  value={newScript.name}
                  onChange={(e) => setNewScript({ ...newScript, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: SlenderHub Universal V12"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Lua Code (`script_content`)</label>
                <textarea
                  value={newScript.content}
                  onChange={(e) => setNewScript({ ...newScript, content: e.target.value })}
                  className="h-64 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="-- Paste your protected script here"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-xl bg-slate-800 px-4 py-3 font-semibold transition-colors hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateScript}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 font-bold transition-colors hover:bg-indigo-500 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScriptManager;
