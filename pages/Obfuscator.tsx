import React, { useState } from 'react';
import { useStore } from '../store';
import { Lock, Zap, Copy, Check, Loader2, AlertCircle, Terminal, HelpCircle, Shield, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Obfuscator: React.FC = () => {
    const { user, credits, refreshProfile, isAuthenticated, isAdminProfile } = useStore();
    const [inputCode, setInputCode] = useState('');
    const [outputCode, setOutputCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleObfuscate = async () => {
        if (!inputCode.trim()) {
            setError('Por favor, insira o código Lua para ofuscar.');
            return;
        }

        if (!isAuthenticated) {
            setError('Você precisa estar logado para usar o ofuscador.');
            return;
        }

        if (credits <= 0 && !isAdminProfile) {
            setError('Créditos insuficientes. Adquira mais na loja.');
            return;
        }

        setLoading(true);
        setError(null);
        setOutputCode('');

        try {
            const response = await fetch('/api/obfuscate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    code: inputCode, 
                    userId: user?.id 
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Erro do servidor: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                setOutputCode(data.obfuscatedCode);
                refreshProfile(); // Atualiza contador de créditos
            } else {
                setError(data.error || 'Erro ao ofuscar o código.');
            }
        } catch (err: any) {
            setError(err.message || 'Falha na comunicação com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (!outputCode) return;
        navigator.clipboard.writeText(outputCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
                <div className="mb-4 inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-bold text-blue-400">
                    <Shield className="mr-2 h-3.5 w-3.5" />
                    Proteção de Scripts SlenderHub
                </div>
                <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                    Ofuscador <span className="text-blue-500">Lua Premium</span>
                </h1>
                <p className="mx-auto max-w-2xl text-gray-400">
                    Proteja sua propriedade intelectual. Nosso ofuscador transforma seu código em uma versão difícil de ler e reverter, mantendo a funcionalidade original.
                </p>
            </div>

            {!isAuthenticated && (
                <div className="mb-8 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6 text-center">
                    <div className="flex justify-center mb-4">
                        <AlertCircle className="h-10 w-10 text-yellow-500/50" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Login Necessário</h3>
                    <p className="mb-6 text-sm text-gray-400">Você precisa estar logado para acessar o ofuscador e gerenciar seus créditos.</p>
                    <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 font-bold text-white hover:bg-blue-500 transition">
                        Fazer Login <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            )}

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Input Section */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 py-4">
                        <div className="flex items-center gap-2 font-bold text-white">
                            <Terminal className="h-4 w-4 text-blue-500" />
                            Source Code
                        </div>
                        <div className="text-xs text-gray-500">Lua Script</div>
                    </div>
                    <div className="p-0">
                        <textarea
                            value={inputCode}
                            onChange={(e) => setInputCode(e.target.value)}
                            placeholder="Cole seu código aqui..."
                            className="h-[400px] w-full resize-none bg-transparent p-6 font-mono text-sm text-gray-300 focus:outline-none scrollbar-thin scrollbar-thumb-slate-700"
                        />
                    </div>
                    <div className="border-t border-slate-800 p-4 bg-slate-950/30">
                        <button
                            onClick={handleObfuscate}
                            disabled={loading || !isAuthenticated}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-500 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                <>
                                    <Lock className="h-4 w-4" />
                                    Ofuscar Agora (1 CR)
                                </>
                            )}
                        </button>
                        {error && (
                            <p className="mt-3 text-center text-xs text-red-400 flex items-center justify-center gap-1">
                                <AlertCircle className="h-3 w-3" /> {error}
                            </p>
                        )}
                    </div>
                </div>

                {/* Output Section */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 py-4">
                        <div className="flex items-center gap-2 font-bold text-white">
                            <Shield className="h-4 w-4 text-green-500" />
                            Protected Code
                        </div>
                        {outputCode && (
                            <button
                                onClick={copyToClipboard}
                                className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-slate-700 hover:text-white transition"
                            >
                                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                {copied ? 'Copiado!' : 'Copiar Resultado'}
                            </button>
                        )}
                    </div>
                    <div className="relative h-[400px] bg-[#020617] p-6">
                        {!outputCode && !loading && (
                            <div className="flex h-full flex-col items-center justify-center text-center opacity-30">
                                <Lock className="mb-4 h-12 w-12" />
                                <p className="text-sm">O código protegido aparecerá aqui.</p>
                            </div>
                        )}
                        {loading && (
                            <div className="flex h-full flex-col items-center justify-center text-center">
                                <Loader2 className="mb-4 h-12 w-12 animate-spin text-blue-500" />
                                <p className="text-sm text-gray-400">Aplicando camadas de proteção...</p>
                            </div>
                        )}
                        {outputCode && (
                            <pre className="h-full overflow-auto font-mono text-sm leading-relaxed text-blue-200">
                                {outputCode}
                            </pre>
                        )}
                    </div>
                    <div className="border-t border-slate-800 p-6 bg-slate-950/20">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status do Perfil</span>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                                <Zap className="h-3.5 w-3.5" />
                                {credits} Créditos Disponíveis
                            </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-800">
                            <div 
                                className="h-full rounded-full bg-blue-500 shadow-lg shadow-blue-500/40" 
                                style={{ width: isAuthenticated ? (credits > 0 ? '100%' : '5%') : '0%' }}
                            />
                        </div>
                        {credits <= 0 && isAuthenticated && !isAdminProfile && (
                            <Link to="/checkout" className="mt-4 block text-center text-xs font-bold text-blue-400 hover:underline">
                                Precisa de mais créditos? Visite a loja
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Info Cards */}
            <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                        <Lock className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 font-bold text-white">Variáveis Dinâmicas</h3>
                    <p className="text-sm text-gray-400">Renomeia automaticamente variáveis locais para nomes aleatórios, impedindo a compreensão lógica.</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                        <Zap className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 font-bold text-white">String Encryption</h3>
                    <p className="text-sm text-gray-400">Converte todas as strings de texto para sequências hexadecimais protegidas contra busca de texto.</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
                        <HelpCircle className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 font-bold text-white">Suporte a Scripts</h3>
                    <p className="text-sm text-gray-400">Ideal para scripts de roblox (LocalScripts, ServerScripts) e módulos complexos.</p>
                </div>
            </div>
        </div>
    );
};

export default Obfuscator;
