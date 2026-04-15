import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Shield, ExternalLink, Youtube, Disc as Discord, Key, Check, Loader2, AlertCircle, Copy } from 'lucide-react';

const UnlockKey: React.FC = () => {
    const { key } = useParams<{ key: string }>();
    const [searchParams] = useSearchParams();
    const isCompleted = searchParams.get('step') === 'completed';

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [gatewayConfig, setGatewayConfig] = useState<any>(null);
    const [copied, setCopied] = useState(false);

    // Verification States
    const [youtubeVerified, setYoutubeVerified] = useState(false);
    const [discordVerified, setDiscordVerified] = useState(false);
    const [socialTimer, setSocialTimer] = useState(0);
    const [verifyingType, setVerifyingType] = useState<'youtube' | 'discord' | null>(null);

    useEffect(() => {
        if (key) {
            fetchGatewayInfo();
        }
        
        // Listen for verification from another tab (verify-gateway page)
        const handleStorageChange = () => {
            const isVerified = localStorage.getItem('slender_gateway_verified');
            if (isVerified === 'true') {
                window.location.href = `${window.location.origin}${window.location.pathname}#/unlock/${key}?step=completed`;
                localStorage.removeItem('slender_gateway_verified');
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [key]);

    // If it comes back from shortener, auto-verify social steps to avoid annoying the user again
    useEffect(() => {
        if (isCompleted) {
            setYoutubeVerified(true);
            setDiscordVerified(true);
        }
    }, [isCompleted]);

    const fetchGatewayInfo = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.rpc('get_key_gateway_info', {
                p_key_string: key
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.error || 'Key not found');

            setGatewayConfig(data);

            // Auto-verify if they don't exist
            if (!data.youtube_url) setYoutubeVerified(true);
            if (!data.discord_url) setDiscordVerified(true);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifySocial = (type: 'youtube' | 'discord', url: string) => {
        if (verifyingType) return; // Already verifying something
        
        window.open(url, '_blank');
        setVerifyingType(type);
        setSocialTimer(12);

        const interval = setInterval(() => {
            setSocialTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    if (type === 'youtube') setYoutubeVerified(true);
                    if (type === 'discord') setDiscordVerified(true);
                    setVerifyingType(null);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleGetFinalKey = () => {
        if (gatewayConfig.shortener_url && !isCompleted) {
            // Se o desenvolvedor colocou um ID do Linkvertise, geramos o link dinâmico para essa chave específica
            const targetUrl = `${window.location.origin}${window.location.pathname}#/unlock/${key}?step=completed`;
            const base64Url = btoa(targetUrl); // Linkvertise requer base64 do nosso link final
            
            // Linkvertise Dynamic URL format: https://link-to.net/{userId}/dynamic?r={base64_encoded_url}
            const linkvertiseUserId = gatewayConfig.shortener_url.replace(/[^0-9]/g, '');
            const shortenerLink = `https://link-to.net/${linkvertiseUserId}/dynamic?r=${base64Url}`;

            window.open(shortenerLink, '_blank');
            
            // Depois de alguns segundos fechamos essa tela ou deixamos o linkvertise trazer ele de volta.
            // Para garantir que a aba antiga atualize no futuro caso percam, atualizamos com delay.
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 30000); 
        } else {
             // Already completed or no shortener
             setCopied(true);
             navigator.clipboard.writeText(key || '');
             setTimeout(() => setCopied(false), 2000);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
                 <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl max-w-md w-full flex flex-col items-center text-center">
                    <AlertCircle className="w-12 h-12 mb-4" />
                    <h2 className="text-xl font-bold mb-2">Error Validating Key</h2>
                    <p>{error}</p>
                 </div>
            </div>
        );
    }

    const allVerified = youtubeVerified && discordVerified;
    const showFinalKey = isCompleted || (!gatewayConfig?.shortener_url && allVerified);

    return (
        <div className="min-h-screen bg-[#020617] text-white pt-24 pb-12 px-4 flex flex-col items-center">
            <div className="w-full max-w-md bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm shadow-2xl">
                
                <div className="p-8 pb-6 border-b border-slate-800 text-center">
                    <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                        <Shield className="w-8 h-8 text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-black mb-2">KEY <span className="text-blue-500">GATEWAY</span></h1>
                    <p className="text-gray-400 text-sm">Complete the required steps to unlock your script license key.</p>
                </div>

                <div className="p-8 space-y-6">
                    {showFinalKey ? (
                        <div className="text-center animate-in fade-in zoom-in duration-500">
                            <h3 className="text-green-400 font-bold mb-4 flex items-center justify-center gap-2">
                                <Check className="w-5 h-5" /> 
                                Successfully Unlocked!
                            </h3>
                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-4">
                                <code className="text-blue-300 font-mono text-lg break-all">{key}</code>
                            </div>
                            <button 
                                onClick={handleGetFinalKey}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                            >
                                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                {copied ? 'Copied to Clipboard' : 'Copy Key'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {gatewayConfig?.youtube_url && (
                                youtubeVerified ? (
                                    <div className="w-full flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <Youtube className="w-6 h-6 text-green-500" />
                                            <span className="font-semibold text-green-400">Subscribed</span>
                                        </div>
                                        <Check className="w-5 h-5 text-green-500" />
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleVerifySocial('youtube', gatewayConfig.youtube_url)}
                                        disabled={verifyingType !== null}
                                        className={`w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all group ${verifyingType === 'youtube' ? 'ring-2 ring-red-500' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {verifyingType === 'youtube' ? <Loader2 className="w-6 h-6 text-red-500 animate-spin" /> : <Youtube className="w-6 h-6 text-red-500" />}
                                            <span className="font-semibold text-gray-200">
                                                {verifyingType === 'youtube' ? `Aguarde ${socialTimer}s...` : 'Subscribe on YouTube'}
                                            </span>
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
                                    </button>
                                )
                            )}

                            {gatewayConfig?.discord_url && (
                                discordVerified ? (
                                    <div className="w-full flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <Discord className="w-6 h-6 text-green-500" />
                                            <span className="font-semibold text-green-400">Joined Server</span>
                                        </div>
                                        <Check className="w-5 h-5 text-green-500" />
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleVerifySocial('discord', gatewayConfig.discord_url)}
                                        disabled={verifyingType !== null}
                                        className={`w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all group ${verifyingType === 'discord' ? 'ring-2 ring-indigo-500' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {verifyingType === 'discord' ? <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /> : <Discord className="w-6 h-6 text-indigo-400" />}
                                            <span className="font-semibold text-gray-200">
                                                {verifyingType === 'discord' ? `Aguarde ${socialTimer}s...` : 'Join Discord Server'}
                                            </span>
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
                                    </button>
                                )
                            )}

                            {allVerified && (
                                <button
                                    onClick={handleGetFinalKey}
                                    className="w-full mt-4 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 group"
                                >
                                    <Key className="w-5 h-5" />
                                    {gatewayConfig?.shortener_url ? 'Continue to Ad (Get Key)' : 'Unlock Now'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-950/50 text-center text-xs text-slate-500 border-t border-slate-800">
                    Powered by SlenderHub Key System
                </div>
            </div>
        </div>
    );
};

export default UnlockKey;
