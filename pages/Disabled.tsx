import React from 'react';
import { Hammer, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

// Placeholder genérico para áreas temporariamente desativadas
// (Developer Panel, Script Manager, Pricing).
const Disabled: React.FC<{ title?: string; message?: string }> = ({
  title = 'Indisponível no momento',
  message = 'Esta área está temporariamente desativada. Volte em breve!',
}) => {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0A0A0A] flex items-center justify-center px-4 py-20 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-orange-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-400">
          <Hammer className="h-8 w-8" />
        </div>

        <h1 className="mb-3 text-3xl font-black tracking-tight text-white md:text-4xl">
          {title}
        </h1>

        <p className="mx-auto mb-8 max-w-md text-base leading-relaxed text-gray-400">
          {message}
        </p>

        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/25"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a loja
        </Link>
      </div>
    </div>
  );
};

export default Disabled;
