import React, { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Info, Lock, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const Documentation: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const baseUrl = useMemo(() => window.location.origin, []);

  const luaCode = useMemo(
    () => `-- [ SlenderHub ] - Loader integration example
local LicenseKey = "SLENDER-XXXX-XXXX"
local HWID = game:GetService("RbxAnalyticsService"):GetClientId()

loadstring(game:HttpGet("${baseUrl}/api/scripts/loader?key=" .. LicenseKey .. "&hwid=" .. HWID))()`,
    [baseUrl]
  );

  const verifyExample = useMemo(
    () => `local HttpService = game:GetService("HttpService")
local HWID = game:GetService("RbxAnalyticsService"):GetClientId()
local response = HttpService:GetAsync("${baseUrl}/api/keys/verify?key=" .. LicenseKey .. "&hwid=" .. HWID)
local data = HttpService:JSONDecode(response)

if not data.success then
    warn(data.message)
    return
end`,
    [baseUrl]
  );

  const copyCode = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#020617] px-4 pb-12 pt-24 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12">
          <Link to="/developer-panel" className="mb-4 inline-block text-blue-400 hover:underline">
            Back to Dashboard
          </Link>
          <h1 className="mb-4 text-4xl font-black">
            INTEGRATION <span className="text-blue-500">GUIDE</span>
          </h1>
          <p className="text-gray-400">
            This guide now reflects the real routes used by the project so developers can copy a working integration path.
          </p>
        </div>

        <div className="mb-8 flex items-start space-x-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-6">
          <Info className="mt-1 h-6 w-6 shrink-0 text-blue-400" />
          <div>
            <h3 className="font-bold text-blue-100">Prerequisites</h3>
            <p className="text-sm text-blue-300">
              Ensure the executor supports `game:HttpGet` or `HttpService`. In Roblox Studio, enable HTTP requests in
              game settings before testing.
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <section>
            <div className="mb-4 flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 font-bold">1</div>
              <h2 className="text-xl font-bold">Create your script</h2>
            </div>
            <p className="ml-11 mb-4 text-gray-400">
              Open the <Link to="/script-manager" className="text-blue-400 hover:underline">Script Manager</Link> and
              create the protected script that the loader should deliver.
            </p>
          </section>

          <section>
            <div className="mb-4 flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 font-bold">2</div>
              <h2 className="text-xl font-bold">Generate a key</h2>
            </div>
            <p className="ml-11 mb-4 text-gray-400">
              In the <Link to="/developer-panel" className="text-blue-400 hover:underline">Developer Panel</Link>,
              generate a key and optionally link it to a specific script.
            </p>
          </section>

          <section>
            <div className="mb-4 flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 font-bold">3</div>
              <h2 className="text-xl font-bold">Use the loader endpoint</h2>
            </div>
            <p className="ml-11 mb-4 text-gray-400">
              For the most Luarmor-like flow in this project, use the loader endpoint directly instead of manually
              pulling script content.
            </p>

            <div className="ml-11 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-800/50 px-4 py-2">
                <span className="text-xs uppercase text-gray-500">Luau Loader</span>
                <button
                  onClick={() => void copyCode(luaCode)}
                  className="flex items-center space-x-2 rounded-lg bg-slate-700 px-3 py-1 text-xs transition-colors hover:bg-slate-600"
                >
                  {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <div className="overflow-x-auto p-6">
                <pre className="text-sm leading-relaxed text-blue-300">{luaCode}</pre>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 font-bold">4</div>
              <h2 className="text-xl font-bold">Verify a key manually</h2>
            </div>
            <p className="ml-11 mb-4 text-gray-400">
              If you need a pre-check before execution, the verification endpoint is available too.
            </p>

            <div className="ml-11 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <div className="border-b border-slate-800 bg-slate-800/50 px-4 py-2 text-xs uppercase text-gray-500">
                Verification Example
              </div>
              <div className="overflow-x-auto p-6">
                <pre className="text-sm leading-relaxed text-blue-300">{verifyExample}</pre>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 font-bold">5</div>
              <h2 className="text-xl font-bold">Understand HWID lock</h2>
            </div>
            <div className="ml-11 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="mb-2 flex items-center space-x-2 text-green-400">
                  <Lock className="h-4 w-4" />
                  <h4 className="font-bold">Automatic Lock</h4>
                </div>
                <p className="text-xs text-gray-400">
                  The key locks to the first HWID that successfully authenticates, preventing casual sharing.
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="mb-2 flex items-center space-x-2 text-amber-500">
                  <RefreshCw className="h-4 w-4" />
                  <h4 className="font-bold">Manual Reset</h4>
                </div>
                <p className="text-xs text-gray-400">
                  If a customer changes machine, you can reset the HWID from the Developer Panel.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-16 border-t border-slate-800 pt-12 text-center">
          <p className="mb-6 italic text-gray-500">Need a custom flow, webhook or stronger gateway validation?</p>
          <a
            href="https://discord.gg/2B8TQ7A3MV"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 rounded-xl bg-[#5865F2] px-8 py-3 font-bold transition-all hover:bg-[#4752C4]"
          >
            <span>Join Developer Discord</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
