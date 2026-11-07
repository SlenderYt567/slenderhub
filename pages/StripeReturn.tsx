import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useStore } from '../store';

export default function StripeReturn() {
  const [params] = useSearchParams();
  const id = params.get('session_id');
  const { authReady, isAuthenticated } = useStore();
  const [result, setResult] = useState<{ status: string; orderId?: string; amount?: number }>({ status: 'loading' });
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!authReady || !isAuthenticated || !id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    let count = 0;
    setError('');
    const check = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error('Entre na conta usada na compra para consultar o pedido.');
        const response = await fetch(`/api/stripe-checkout?session_id=${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${data.session.access_token}` }, signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Não foi possível consultar o pagamento.');
        if (cancelled) return;
        setResult(body);
        // Keep the cart intact: the customer may have changed it in another tab.
        if (['confirming', 'pending'].includes(body.status) && ++count < 15) timer = setTimeout(check, 3000);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Falha ao consultar pagamento.');
      }
    };
    void check();
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [authReady, isAuthenticated, id, retry]);

  const paid = result.status === 'paid';
  const ended = ['failed', 'expired'].includes(result.status);
  return <div className="mx-auto max-w-xl px-4 py-16 text-center">
    <h1 className="text-3xl font-bold text-white">{paid ? 'Pagamento confirmado' : ended ? 'Pagamento não concluído' : 'Acompanhamento do pagamento'}</h1>
    {!id ? <p className="mt-6 text-red-300">O link não contém um identificador de pagamento.</p>
      : !authReady ? <p className="mt-6 text-gray-300">Carregando sua conta…</p>
      : !isAuthenticated ? <div className="mt-6 space-y-4"><p>Entre na conta usada na compra e retorne a esta página.</p><Link to="/login" className="text-purple-300 underline">Entrar na minha conta</Link></div>
      : <>
        <p className="mt-6 text-gray-300">{paid ? 'Seu pedido foi registrado. A equipe dará continuidade à entrega pelo atendimento.'
          : ended ? 'Você pode voltar ao checkout e tentar novamente.'
          : result.status === 'confirming' ? 'A Stripe confirmou o pagamento. Estamos aguardando o registro do pedido. Não pague novamente.'
          : 'Aguardando a confirmação do pagamento. Alguns meios de pagamento podem levar mais tempo.'}</p>
        {result.amount != null && <p className="mt-3 font-bold text-purple-300">US$ {(result.amount / 100).toFixed(2)}</p>}
        {error && <p role="alert" className="mt-4 text-red-300">{error}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {paid && result.orderId ? <a href={`/chat/${encodeURIComponent(result.orderId)}`} className="rounded-xl bg-purple-600 px-6 py-3 font-bold">Acompanhar entrega</a>
            : <button onClick={() => setRetry(n => n + 1)} className="rounded-xl bg-purple-600 px-6 py-3 font-bold">Verificar novamente</button>}
          {ended && <Link to="/checkout" className="rounded-xl border border-slate-700 px-6 py-3">Voltar ao checkout</Link>}
          <Link to="/contact" className="rounded-xl border border-slate-700 px-6 py-3">Falar com o suporte</Link>
        </div>
      </>}
  </div>;
}
