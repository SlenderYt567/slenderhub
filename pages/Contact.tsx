import React from 'react';
import { Mail, MessageCircle, Globe, DollarSign } from 'lucide-react';

const Contact: React.FC = () => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white">Contact Us</h1>
        <p className="mt-4 text-lg text-gray-400">Need help with a script, purchase, or have a business inquiry?</p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <a 
          href="https://discord.gg/E3xsUmtx" 
          target="_blank" 
          rel="noopener noreferrer"
          className="group flex flex-col items-center rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center transition hover:border-blue-500 hover:bg-slate-800"
        >
            <div className="mb-4 rounded-full bg-blue-500/10 p-4 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <MessageCircle className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Join Discord</h3>
            <p className="mt-2 text-sm text-gray-400">Join our community for support, giveaways, and updates.</p>
        </a>

        <a 
          href="mailto:slenderyt9@gmail.com"
          className="group flex flex-col items-center rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center transition hover:border-purple-500 hover:bg-slate-800"
        >
            <div className="mb-4 rounded-full bg-purple-500/10 p-4 text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                <Mail className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Email Support</h3>
            <p className="mt-2 text-sm text-gray-400">slenderyt9@gmail.com</p>
        </a>
      </div>

      <div className="mt-8 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-8 text-center">
         <div className="flex flex-col items-center justify-center gap-4">
            <div className="rounded-full bg-indigo-500 p-3 text-white">
                <Globe className="h-6 w-6" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-white">International Purchases (USD/EUR)</h3>
                <p className="mt-2 text-gray-300">
                    If you are outside Brazil and cannot use Pix, please open a ticket in our 
                    <a href="https://discord.gg/E3xsUmtx" target="_blank" rel="noopener noreferrer" className="mx-1 font-bold text-indigo-400 hover:underline">Discord Server</a>.
                </p>
                <p className="mt-1 text-sm text-gray-400">
                    We accept PayPal, Crypto, and other international methods via manual support tickets.
                </p>
            </div>
         </div>
      </div>

      <div className="mt-12 rounded-2xl bg-slate-900 p-8 text-center border border-slate-800">
        <h3 className="text-lg font-bold text-white">FAQ</h3>
        <div className="mt-6 space-y-4 text-left">
            <div>
                <h4 className="font-semibold text-white">How do I receive my product?</h4>
                <p className="text-sm text-gray-400">Instant delivery via email or chat immediately after payment confirmation.</p>
            </div>
            <div>
                <h4 className="font-semibold text-white">Do you offer refunds?</h4>
                <p className="text-sm text-gray-400">Due to the nature of digital goods, we do not offer refunds once the key has been viewed.</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
