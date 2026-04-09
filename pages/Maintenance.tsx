import React from 'react';
import { Hammer, Globe, MessageSquare, Clock } from 'lucide-react';

const Maintenance: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center px-4 text-center">
      {/* Animated Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-8 p-4 rounded-3xl bg-blue-500/10 ring-1 ring-blue-500/20 animate-pulse">
          <Hammer className="w-16 h-16 text-blue-500" />
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6">
          UNDER <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">MAINTENANCE</span>
        </h1>
        
        <p className="text-xl text-gray-400 max-w-2xl mb-12 leading-relaxed">
          Estamos aprimorando o SlenderHub para trazer o melhor sistema de licenciamento do mercado. 
          O site voltará em breve com todas as funcionalidades restauradas.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm">
            <Globe className="w-6 h-6 text-blue-400 mb-4 mx-auto" />
            <h3 className="font-bold mb-2">Novo Sistema</h3>
            <p className="text-xs text-gray-500">SlenderKey API v2 em desenvolvimento.</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm">
            <Clock className="w-6 h-6 text-indigo-400 mb-4 mx-auto" />
            <h3 className="font-bold mb-2">Tempo Estimado</h3>
            <p className="text-xs text-gray-500">Previsão de retorno em 24-48 horas.</p>
          </div>
          <a 
            href="https://discord.gg/2B8TQ7A3MV" 
            target="_blank" 
            className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm hover:bg-slate-800 transition-colors group"
          >
            <MessageSquare className="w-6 h-6 text-[#5865F2] mb-4 mx-auto group-hover:scale-110 transition-transform" />
            <h3 className="font-bold mb-2">Suporte</h3>
            <p className="text-xs text-gray-500">Dúvidas? Entre em nosso Discord.</p>
          </a>
        </div>

        <div className="mt-16 text-xs text-gray-600 uppercase tracking-[0.2em]">
          &copy; {new Date().getFullYear()} Slender Hub System
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
