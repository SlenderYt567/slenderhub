import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, ExternalLink, Loader2, AlertCircle } from 'lucide-react';

/**
 * GatewayVerify — Página de retorno após verificação de gateway.
 * Antes usava localStorage para bypass, agora é apenas informativa.
 * O fluxo real de verificação é feito via api/gateway/complete (server-side).
 */
const GatewayVerify: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('Processing verification...');

    useEffect(() => {
        if (token) {
            // Se veio com token, validar (mas na prática o fluxo é outro)
            setStatus('success');
            setMessage('Verification successful! You can return to the original tab.');
        } else {
            // Sem token — página apenas informativa
            setStatus('success');
            setMessage('You can return to the original tab to continue.');
        }
    }, [token]);

    return (
        <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900/50 border border-slate-800 rounded-3xl p-8 text-center backdrop-blur-sm shadow-2xl">
                {status === 'verifying' ? (
                    <>
                        <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                        </div>
                        <h1 className="text-3xl font-black mb-4">VERIFYING...</h1>
                        <p className="text-gray-400 mb-8">{message}</p>
                    </>
                ) : status === 'success' ? (
                    <>
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                            <CheckCircle className="w-10 h-10 text-green-500" />
                        </div>
                        <h1 className="text-3xl font-black mb-4">VERIFIED!</h1>
                        <p className="text-gray-400 mb-8">{message}</p>
                    </>
                ) : (
                    <>
                        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30">
                            <AlertCircle className="w-10 h-10 text-red-500" />
                        </div>
                        <h1 className="text-3xl font-black mb-4">FAILED</h1>
                        <p className="text-gray-400 mb-8">{message}</p>
                    </>
                )}
                <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 text-sm text-gray-500 flex items-center justify-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    You can close this tab now.
                </div>
            </div>
        </div>
    );
};

export default GatewayVerify;
