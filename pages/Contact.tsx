import React, { useState } from 'react';
import { Mail, MessageSquare, Globe, ChevronDown, ChevronUp, ShieldCheck, Sparkles, ExternalLink } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: 'Como recebo meu produto?',
    answer: 'A entrega é realizada de forma rápida e manual diretamente dentro do Roblox. Um atendente autorizado entrará no seu servidor ou enviará solicitação de amizade para realizar o trade do item/pet com você.',
  },
  {
    question: 'Vocês oferecem reembolso?',
    answer: 'Se houver um problema com seu pedido, fale com o suporte pelo Discord ou e-mail. A equipe analisará o caso e informará as opções disponíveis.',
  },
  {
    question: 'Quais formas de pagamento vocês aceitam?',
    answer: 'O checkout oferece Pix e as criptomoedas que estiverem configuradas no momento da compra. A confirmação é feita após análise do comprovante.',
  },
  {
    question: 'Quanto tempo demora a entrega?',
    answer: 'O prazo depende da confirmação do pagamento, disponibilidade do item e horário de atendimento. Você pode acompanhar o pedido e falar com o suporte pelo chat.',
  },
  {
    question: 'Vocês são confiáveis?',
    answer: 'Você pode acompanhar o status do pedido pelo chat da loja e pedir ajuda nos canais de suporte. Verifique os detalhes do item antes de concluir a compra.',
  },
];

const Contact: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#070914] text-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">

        {/* Header matching Image 1 */}
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Fale com a gente
          </h1>
          <p className="mt-3 text-sm sm:text-base text-gray-300">
            Precisa de ajuda com uma compra, script ou tem alguma dúvida?
          </p>
        </div>

        {/* 2 Primary Support Cards matching Image 1 */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">

          {/* Join Discord Card */}
          <div className="flex flex-col items-center justify-between rounded-3xl border border-purple-950/80 bg-[#0e122b]/90 p-8 text-center backdrop-blur-md transition-all hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-600/10">
            <div className="flex flex-col items-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                <MessageSquare className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-black text-white">Discord</h3>
              <p className="mt-2 text-xs text-gray-400 leading-relaxed max-w-xs">
                Entre no nosso servidor para suporte, sorteios e atualizações.
              </p>
            </div>

            <a
              href="https://discord.gg/2B8TQ7A3MV"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition hover:brightness-110"
            >
              Entrar no Discord
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Email Support Card */}
          <div className="flex flex-col items-center justify-between rounded-3xl border border-purple-950/80 bg-[#0e122b]/90 p-8 text-center backdrop-blur-md transition-all hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-600/10">
            <div className="flex flex-col items-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Mail className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-black text-white">Suporte por e-mail</h3>
              <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                contato@slenderhub.shop
              </p>
            </div>

            <a
              href="mailto:contato@slenderhub.shop"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-purple-800/60 bg-[#12163b] py-3 text-xs font-bold text-purple-200 transition hover:bg-purple-600 hover:text-white"
            >
              Enviar Email
            </a>
          </div>

        </div>

        {/* International Purchases Card matching Image 1 */}
        <div className="mt-8 rounded-3xl border border-purple-950/80 bg-[#0c102a]/90 p-6 sm:p-8 backdrop-blur-md transition hover:border-purple-500/30">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-600/15 text-cyan-400 border border-cyan-500/30">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                International Purchases (USD/EUR)
              </h3>
              <p className="mt-1 text-xs text-gray-300 leading-relaxed">
                Se você está fora do Brasil e não pode usar Pix, abra um ticket no nosso Discord. Aceitamos Crypto e outros métodos internacionais.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Accordion matching Image 1 */}
        <div className="mt-12 rounded-3xl border border-purple-950/80 bg-[#0e122b]/80 p-6 sm:p-8 backdrop-blur-md">
          <h2 className="text-xl font-black text-white mb-6">
            FAQ
          </h2>

          <div className="divide-y divide-purple-950/60">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className="py-4">
                  <button
                    onClick={() => toggleFaq(index)}
                    className="flex w-full items-center justify-between text-left text-sm font-bold text-white hover:text-purple-300 transition"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-purple-400 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <p className="mt-2.5 text-xs text-gray-300/90 leading-relaxed animate-in fade-in slide-in-from-top-1">
                      {faq.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Contact;
