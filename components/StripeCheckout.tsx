import React, { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useStore } from '../store';
import { supabase } from '../lib/supabaseClient';

export default function StripeCheckout() {
  const { cart, totalCartValue, user } = useStore();
  const [email, setEmail] = useState(user?.email || '');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  const attempt = useRef(crypto.randomUUID());

  async function pay(event: React.FormEvent) {
    event.preventDefault();
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error('Entre novamente na sua conta para pagar.');
      const response = await fetch('/api/stripe-checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({
          items: cart.map(item => ({ productId: item.id, variantId: item.selectedVariant?.id, quantity: item.quantity })),
          contactEmail: email, robloxUsername: username, attemptId: attempt.current,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível abrir o pagamento.');
      const destination = new URL(result.url);
      if (destination.protocol !== 'https:' || destination.hostname !== 'checkout.stripe.com') throw new Error('Endereço de pagamento inválido.');
      window.location.assign(destination.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível abrir o pagamento.');
      locked.current = false;
      setBusy(false);
    }
  }
  return <form onSubmit={pay} className="space-y-5">
    <div>
      <h2 className="text-xl font-bold text-white">Pagar com Stripe</h2>
      <p className="mt-2 text-sm text-gray-400">Pagamento em dólares (USD). Confira os itens e o total na página segura da Stripe antes de confirmar.</p>
    </div>
    <p className="rounded-xl bg-purple-500/10 p-4 text-lg font-bold text-purple-300">Total do carrinho: US$ {totalCartValue.toFixed(2)}</p>
    <label className="block text-sm text-gray-300">E-mail para contato
      <input required type="email" maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white" />
    </label>
    <label className="block text-sm text-gray-300">Usuário do Roblox (sem @)
      <input required pattern="[A-Za-z0-9_]{3,20}" maxLength={20} value={username} onChange={e => setUsername(e.target.value.trim())}
        placeholder="Seu nome de usuário" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white" />
    </label>
    <p className="text-xs text-gray-400">Após a confirmação do pagamento, seu pedido aparecerá no atendimento para entrega pela equipe. Não é necessário enviar comprovante.</p>
    {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
    <button type="submit" disabled={busy || !cart.length} className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-4 font-bold text-white hover:bg-purple-500 disabled:opacity-50">
      {busy && <Loader2 className="h-5 w-5 animate-spin" />} {busy ? 'Abrindo pagamento…' : 'Continuar na Stripe'}
    </button>
  </form>;
}
