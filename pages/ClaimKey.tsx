import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Check,
  Copy,
  Disc as Discord,
  ExternalLink,
  Key,
  Loader2,
  Shield,
  Youtube,
} from 'lucide-react';

type ClaimConfigResponse = {
  success: boolean;
  error?: string;
  gateway?: {
    shortener_url?: string;
    discord_url?: string;
    youtube_url?: string;
    dev_tier?: string;
  };
  script?: {
    id: string;
    name: string;
  } | null;
};

const ClaimKey: React.FC = () => {
  const [searchParams] = useSearchParams();
  const ownerId = searchParams.get('owner') || '';
  const scriptId = searchParams.get('script') || '';
  const prefix = searchParams.get('prefix') || 'SLENDER';
  const note = searchParams.get('note') || 'Gateway claim';
  const label = searchParams.get('label') || 'Custom Key';
  const durationDays = Number(searchParams.get('duration') || '1');
  const isCompleted = searchParams.get('step') === 'completed';

  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gatewayConfig, setGatewayConfig] = useState<ClaimConfigResponse['gateway'] | null>(null);
  const [scriptName, setScriptName] = useState<string>('');
  const [claimedKey, setClaimedKey] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const [youtubeVerified, setYoutubeVerified] = useState(false);
  const [discordVerified, setDiscordVerified] = useState(false);
  const [socialTimer, setSocialTimer] = useState(0);
  const [verifyingType, setVerifyingType] = useState<'youtube' | 'discord' | null>(null);

  useEffect(() => {
    if (!ownerId) {
      setError('Missing owner configuration in claim link.');
      setLoading(false);
      return;
    }

    void fetchClaimConfig();
  }, [ownerId, scriptId]);

  useEffect(() => {
    if (isCompleted) {
      setYoutubeVerified(true);
      setDiscordVerified(true);
    }
  }, [isCompleted]);

  const fetchClaimConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL('/api/keys/claim-config', window.location.origin);
      url.searchParams.set('ownerId', ownerId);
      if (scriptId) {
        url.searchParams.set('scriptId', scriptId);
      }

      const response = await fetch(url.toString());
      const payload = (await response.json()) as ClaimConfigResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to load claim config.');
      }

      setGatewayConfig(payload.gateway || {});
      setScriptName(payload.script?.name || (scriptId ? 'Selected Script' : 'Global Access'));

      if (!payload.gateway?.youtube_url) setYoutubeVerified(true);
      if (!payload.gateway?.discord_url) setDiscordVerified(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load claim config.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySocial = (type: 'youtube' | 'discord', url: string) => {
    if (verifyingType) return;

    window.open(url, '_blank');
    setVerifyingType(type);
    setSocialTimer(12);

    const interval = window.setInterval(() => {
      setSocialTimer((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          if (type === 'youtube') setYoutubeVerified(true);
          if (type === 'discord') setDiscordVerified(true);
          setVerifyingType(null);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);
  };

  const claimLinkTarget = useMemo(() => {
    const url = new URL(`${window.location.origin}${window.location.pathname}`);
    url.hash = `#/claim?owner=${encodeURIComponent(ownerId)}${scriptId ? `&script=${encodeURIComponent(scriptId)}` : ''}&duration=${encodeURIComponent(String(durationDays))}&prefix=${encodeURIComponent(prefix)}&note=${encodeURIComponent(note)}&step=completed`;
    return url.toString();
  }, [durationDays, note, ownerId, prefix, scriptId]);

  const allVerified = youtubeVerified && discordVerified;
  const readyToClaim = isCompleted || (!gatewayConfig?.shortener_url && allVerified);

  const handleClaimKey = async () => {
    try {
      setClaiming(true);
      setError(null);

      const response = await fetch('/api/keys/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId,
          scriptId: scriptId || null,
          durationDays,
          prefix,
          note,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success || !payload.key?.key_string) {
        throw new Error(payload.error || 'Failed to generate key.');
      }

      setClaimedKey(payload.key.key_string);
    } catch (err: any) {
      setError(err.message || 'Failed to generate key.');
    } finally {
      setClaiming(false);
    }
  };

  const handleUnlockFlow = () => {
    if (gatewayConfig?.shortener_url && !isCompleted) {
      const targetUrl = claimLinkTarget;
      const base64Url = btoa(targetUrl);
      const linkvertiseUserId = (gatewayConfig.shortener_url || '').replace(/[^0-9]/g, '');
      const shortenerLink = `https://link-to.net/${linkvertiseUserId}/dynamic?r=${base64Url}`;

      window.open(shortenerLink, '_blank');
      return;
    }

    void handleClaimKey();
  };

  const copyClaimedKey = async () => {
    if (!claimedKey) return;
    await navigator.clipboard.writeText(claimedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error && !gatewayConfig) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] p-4">
        <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-300">
          <AlertCircle className="mb-4 h-12 w-12" />
          <h2 className="mb-2 text-xl font-bold">Claim link error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#020617] px-4 pb-12 pt-24 text-white">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 shadow-2xl backdrop-blur-sm">
        <div className="border-b border-slate-800 p-8 pb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-600/20">
            <Shield className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="mb-2 text-2xl font-black">
            GET A NEW <span className="text-blue-500">KEY</span>
          </h1>
          <div className="mb-3 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
            {label}
          </div>
          <p className="text-sm text-gray-400">
            {scriptId ? `Generate a fresh key for ${scriptName}.` : 'Generate a fresh global key for compatible scripts.'}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Duration: {durationDays > 0 ? `${durationDays} day(s)` : 'Lifetime'}
          </p>
        </div>

        <div className="space-y-6 p-8">
          {!claimedKey && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-wider text-slate-500">
                <span>Your key slot</span>
                <span>{claimedKey ? '1/1' : '0/1'}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className={`h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all ${claimedKey ? 'w-full' : 'w-0'}`} />
              </div>
            </div>
          )}

          {claimedKey ? (
            <div className="text-center">
              <h3 className="mb-4 flex items-center justify-center gap-2 font-bold text-green-400">
                <Check className="h-5 w-5" />
                Key generated successfully
              </h3>
              <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                <code className="break-all font-mono text-lg text-blue-300">{claimedKey}</code>
              </div>
              <button
                onClick={copyClaimedKey}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 font-bold transition-colors hover:bg-blue-500"
              >
                {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                {copied ? 'Copied' : 'Copy Key'}
              </button>
            </div>
          ) : (
            <>
              {gatewayConfig?.youtube_url && (
                youtubeVerified ? (
                  <div className="flex items-center justify-between rounded-xl border border-green-500/20 bg-green-500/10 p-4">
                    <div className="flex items-center gap-3">
                      <Youtube className="h-6 w-6 text-green-500" />
                      <span className="font-semibold text-green-400">Subscribed</span>
                    </div>
                    <Check className="h-5 w-5 text-green-500" />
                  </div>
                ) : (
                  <button
                    onClick={() => handleVerifySocial('youtube', gatewayConfig.youtube_url || '')}
                    disabled={verifyingType !== null}
                    className={`flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-800/50 p-4 transition-all hover:bg-slate-800 ${verifyingType === 'youtube' ? 'ring-2 ring-red-500' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      {verifyingType === 'youtube' ? (
                        <Loader2 className="h-6 w-6 animate-spin text-red-500" />
                      ) : (
                        <Youtube className="h-6 w-6 text-red-500" />
                      )}
                      <span className="font-semibold text-gray-200">
                        {verifyingType === 'youtube' ? `Wait ${socialTimer}s...` : 'Subscribe on YouTube'}
                      </span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-500" />
                  </button>
                )
              )}

              {gatewayConfig?.discord_url && (
                discordVerified ? (
                  <div className="flex items-center justify-between rounded-xl border border-green-500/20 bg-green-500/10 p-4">
                    <div className="flex items-center gap-3">
                      <Discord className="h-6 w-6 text-green-500" />
                      <span className="font-semibold text-green-400">Joined Discord</span>
                    </div>
                    <Check className="h-5 w-5 text-green-500" />
                  </div>
                ) : (
                  <button
                    onClick={() => handleVerifySocial('discord', gatewayConfig.discord_url || '')}
                    disabled={verifyingType !== null}
                    className={`flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-800/50 p-4 transition-all hover:bg-slate-800 ${verifyingType === 'discord' ? 'ring-2 ring-indigo-500' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      {verifyingType === 'discord' ? (
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                      ) : (
                        <Discord className="h-6 w-6 text-indigo-400" />
                      )}
                      <span className="font-semibold text-gray-200">
                        {verifyingType === 'discord' ? `Wait ${socialTimer}s...` : 'Join Discord Server'}
                      </span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-500" />
                  </button>
                )
              )}

              {(allVerified || gatewayConfig?.shortener_url) && (
                <button
                  onClick={readyToClaim ? () => void handleClaimKey() : handleUnlockFlow}
                  disabled={claiming || (!allVerified && !gatewayConfig?.shortener_url)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-4 font-bold transition-all hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
                >
                  {claiming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Key className="h-5 w-5" />}
                  {claiming
                    ? 'Generating...'
                    : readyToClaim
                      ? 'Get a New Key'
                      : 'Continue to Ad (Get Key)'}
                </button>
              )}

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-slate-800 bg-slate-950/50 p-4 text-center text-xs text-slate-500">
          Powered by SlenderHub Claim Flow
        </div>
      </div>
    </div>
  );
};

export default ClaimKey;
