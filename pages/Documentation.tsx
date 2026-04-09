import React, { useState } from 'react';
import { Terminal, Copy, Check, Shield, Zap, Globe, Lock, Cpu, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

const Documentation: React.FC = () => {
    const [copied, setCopied] = useState(false);

    const luaCode = `-- [ SlenderHub.shop ] - API Integration Example
local LicenseKey = "SLENDER-XXXX-XXXX" -- Replace with the key you generated
local UserID = game:GetService("Players").LocalPlayer.UserId

local function VerifyLicense(key)
    local HttpService = game:GetService("HttpService")
    local success, response = pcall(function()
        return HttpService:GetAsync("https://www.slenderhub.shop/api/keys/verify?key=" .. key .. "&hwid=" .. UserID)
    end)

    if success then
        local data = HttpService:JSONDecode(response)
        if data.success then
            print("Successfully Authenticated! Tier: " .. data.data.tier)
            return true
        else
            warn("Authentication Failed: " .. data.message)
            return false
        end
    else
        warn("Could not connect to SlenderHub servers.")
        return false
    end
end

if not VerifyLicense(LicenseKey) then
    game:GetService("Players").LocalPlayer:Kick("Invalid SlenderKey!")
    return
end

print("Hello World! This script is protected.")`;

    const copyCode = () => {
        navigator.clipboard.writeText(luaCode);
        setCopied(true);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white pt-24 pb-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="mb-12">
                    <Link to="/dashboard" className="text-blue-400 hover:underline mb-4 inline-block">← Back to Dashboard</Link>
                    <h1 className="text-4xl font-black mb-4">INTEGRATION <span className="text-blue-500">GUIDE</span></h1>
                    <p className="text-gray-400">Step-by-step documentation on how to protect your scripts using SlenderKey API.</p>
                </div>

                {/* Requirements */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 mb-8 flex items-start space-x-4">
                    <Info className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
                    <div>
                        <h3 className="font-bold text-blue-100">Prerequisites</h3>
                        <p className="text-sm text-blue-300">Ensure your script execution environment supports <b>HttpService</b> or <b>game:HttpGet</b>. In Roblox Studio, you must enable "Allow HTTP Requests" in Game Settings.</p>
                    </div>
                </div>

                {/* Steps */}
                <div className="space-y-8">
                    <section>
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold">1</div>
                            <h2 className="text-xl font-bold">Generate a Key</h2>
                        </div>
                        <p className="text-gray-400 ml-11 mb-4">Go to your <Link to="/developer-panel" className="text-blue-400 hover:underline">Developer Panel</Link> and click on <b>"Generate Key"</b>. Choose a prefix and a duration for your client's license.</p>
                    </section>

                    <section>
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold">2</div>
                            <h2 className="text-xl font-bold">Copy the Lua Code</h2>
                        </div>
                        <p className="text-gray-400 ml-11 mb-4">Add the following validation block at the <b>very top</b> of your Roblox script.</p>
                        
                        <div className="ml-11 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-800">
                                <span className="text-xs font-mono text-gray-500 uppercase">Luau Script</span>
                                <button 
                                    onClick={copyCode}
                                    className="flex items-center space-x-2 text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-lg transition-colors"
                                >
                                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                    <span>{copied ? 'Copied' : 'Copy Code'}</span>
                                </button>
                            </div>
                            <div className="p-6 overflow-x-auto">
                                <pre className="text-sm font-mono text-blue-300 leading-relaxed">
                                    {luaCode}
                                </pre>
                            </div>
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold">3</div>
                            <h2 className="text-xl font-bold">How HWID Lock works</h2>
                        </div>
                        <div className="ml-11 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                                    <div className="flex items-center space-x-2 mb-2 text-green-400">
                                        <Lock className="w-4 h-4" />
                                        <h4 className="font-bold">Automatic Lock</h4>
                                    </div>
                                    <p className="text-xs text-gray-400">The key will be locked to the first UserID/HWID that successfully authenticates. No one else can use that key.</p>
                                </div>
                                <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                                    <div className="flex items-center space-x-2 mb-2 text-amber-500">
                                        <RefreshCw className="w-4 h-4" />
                                        <h4 className="font-bold">Easy Reset</h4>
                                    </div>
                                    <p className="text-xs text-gray-400">If your client changes PCs, you can reset their HWID with one click in the Developer Panel.</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="mt-16 pt-12 border-t border-slate-800 text-center">
                    <p className="text-gray-500 mb-6 italic">Need more custom endpoints or complex protection?</p>
                    <a 
                        href="https://discord.gg/2B8TQ7A3MV" 
                        target="_blank" 
                        className="inline-flex items-center space-x-2 px-8 py-3 bg-[#5865F2] hover:bg-[#4752C4] rounded-xl font-bold transition-all transform hover:scale-105"
                    >
                        <span>Join Developer Discord</span>
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            </div>
        </div>
    );
};

// Simple placeholder for RefreshCw as it was missed in imports
const RefreshCw = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11V7a5 5 0 0 1 5-5h0a5 5 0 0 1 5 5v4"/><path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-9-9"/><path d="m16 16-4 4 4 4"/></svg>
);

export default Documentation;
