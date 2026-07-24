import React from 'react';
import { Clock, ShieldAlert, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';

const Scripts: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0A0A0A] flex items-center justify-center px-4 py-20 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-orange-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-orange-500/20 bg-slate-950/80 p-8 text-center shadow-2xl shadow-orange-500/10 backdrop-blur-xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-400">
          <Wrench className="h-8 w-8" />
        </div>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-orange-300">
          <ShieldAlert className="h-4 w-4" />
          Script em manutenção
        </div>

        <h1 className="mb-4 text-4xl font-black tracking-tight text-white md:text-5xl">
          SlenderHub Script está temporariamente indisponível
        </h1>

        <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-gray-400 md:text-lg">
          Estamos corrigindo e revisando o script antes de liberar novamente. Por segurança, o código e o botão de cópia foram desativados por enquanto.
        </p>

        <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-left">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
            <div>
              <h2 className="font-bold text-white">Voltamos em breve</h2>
              <p className="mt-1 text-sm text-gray-400">
                Assim que a manutenção terminar, a página do script será reativada com a versão corrigida.
              </p>
            </div>
          </div>
        </div>

        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/25"
        >
          Voltar para a loja
        </Link>
      </div>
    </div>
  );
};

export default Scripts;
