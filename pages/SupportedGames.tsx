import React, { useState } from 'react';
import { Copy, Check, Server, Activity, ShoppingCart, Star } from 'lucide-react';

const SupportedGames: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const scriptCode = `loadstring(game:HttpGet("https://www.slenderhub.shop/api/exec"))()`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0A0A0A] flex flex-col items-center justify-center py-20 px-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-4xl w-full text-center z-10">
        <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
          Premium <span className="text-orange-500">Roblox</span> Experience
        </h1>
        
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Dominate your favorite games with our high-performance tools. Clean interface, fast execution, and continuous support for top titles. Join +10K users today.
        </p>

        <div className="flex flex-col items-center gap-6 mb-20">
          <button 
            onClick={handleCopy}
            className="group relative flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-[#222222] text-orange-500 border border-orange-500/30 px-6 py-3 rounded-lg font-mono text-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(249,115,22,0.2)]"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : '</> Copy Script'}
          </button>

          <div className="w-full max-w-2xl bg-[#111111] border border-[#222222] rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#222222] bg-[#0A0A0A]">
              <div className="flex items-center gap-2">
                <span className="text-yellow-500 font-mono text-xs">📄 slenderhub.lua</span>
              </div>
              <button 
                onClick={handleCopy}
                className="text-gray-500 hover:text-white transition-colors"
                title="Copy script"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="p-4 text-left overflow-x-auto">
              <pre className="font-mono text-sm text-gray-300">
                <span className="text-blue-400">loadstring</span>(<span className="text-blue-300">game</span>:HttpGet(<span className="text-green-400">"https://www.slenderhub.shop/api/exec"</span>))()
              </pre>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-12">
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
            <Server className="h-8 w-8 text-orange-500 mb-3" />
            <h3 className="text-2xl font-bold text-white mb-1">99.99%</h3>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Uptime</p>
          </div>
          
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
            <Activity className="h-8 w-8 text-blue-500 mb-3" />
            <h3 className="text-2xl font-bold text-white mb-1">+23M</h3>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Executions</p>
          </div>
          
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
            <ShoppingCart className="h-8 w-8 text-orange-500 mb-3" />
            <h3 className="text-2xl font-bold text-white mb-1">+10K</h3>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Active Users</p>
          </div>
          
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
            <Star className="h-8 w-8 text-yellow-500 mb-3" />
            <h3 className="text-2xl font-bold text-white mb-1">4.8</h3>
            <div className="flex gap-0.5 mt-1 mb-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-yellow-500 text-yellow-500" />
              ))}
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Average Rating</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportedGames;
