// =============================================================
// SLENDER HUB — ROUTER ÚNICO DO SISTEMA DE KEYS
// -------------------------------------------------------------
// Consolida 6 endpoints (/api/keys/verify, generate, reset-hwid,
// verify-logs, claim, claim-config) em UMA Serverless Function.
//
// Motivo: o plano Hobby da Vercel permite no máximo 12 funções.
// Antes havia 6 arquivos separados em api/keys/*.ts (16 funções
// no total). Com este router + rewrites no vercel.json, o projeto
// fica com 11 funções — dentro do limite.
//
// Dispatch é feito pelo pathname original em req.url
// (ex: /api/keys/verify?key=...&hwid=...).
// =============================================================
import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';

export const config = {
    runtime: 'nodejs',
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── Helpers compartilhados ───────────────────────────────────
function getClientIp(req: any): string {
    return (
        req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers?.['x-real-ip'] ||
        req.headers?.['cf-connecting-ip'] ||
        'unknown'
    );
}

const generateKey = (prefix: string = 'SLENDER'): string => {
    const part1 = randomBytes(6).toString('hex').toUpperCase();
    const part2 = randomBytes(6).toString('hex').toUpperCase();
    const part3 = randomBytes(6).toString('hex').toUpperCase();
    return `${prefix}-${part1}-${part2}-${part3}`;
};

const getClaimMarker = (claimToken: unknown) => {
    const safeToken = (claimToken || '').toString().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
    return safeToken ? `[claim:${safeToken}]` : '';
};

function getDaysRemaining(expiresAt: string | null): number {
    if (!expiresAt) return -1;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

async function antiBruteForceDelay(success: boolean): Promise<void> {
    if (!success) {
        const delay = 500 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RPC_TIMEOUT_MS = 12000;

async function checkRateLimit(supabase: any, ip: string): Promise<{ allowed: boolean; retryAfter?: number }> {
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

    const { count, error } = await supabase
        .from('key_verify_logs')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', ip)
        .gte('created_at', windowStart);

    if (error) {
        console.error('[RateLimit] DB error:', error);
        return { allowed: true };
    }

    if (count && count >= RATE_LIMIT_MAX) {
        return { allowed: false, retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000) };
    }

    return { allowed: true };
}

function envError(res: any, tag: string) {
    console.error(`[${tag}] Missing environment variables`);
    return res.status(500).json({ success: false, error: 'Server configuration error' });
}

// ── Handlers individuais (mesma lógica dos arquivos originais) ──

// GET /api/keys/verify?key=..&hwid=..&script_id=..
async function handleVerify(req: any, res: any) {
    const allowedOrigins = ['https://slenderhub.shop', 'http://localhost:3000', 'http://localhost:5173'];
    const origin = req.headers?.origin || req.headers?.['x-forwarded-host'];
    if (origin && allowedOrigins.some((o) => origin.startsWith(o))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
        res.setHeader('Access-Control-Allow-Origin', 'https://slenderhub.shop');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, valid: false, message: 'Method Not Allowed' });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return envError(res, 'Verify');
    }

    const key = (req.query?.key as string || '').trim();
    const hwid = (req.query?.hwid as string || 'untracked').trim();
    const scriptId = req.query?.script_id as string || undefined;

    if (!key) {
        return res.status(400).json({ success: false, valid: false, message: 'Key is required' });
    }

    if (!hwid || hwid === 'untracked') {
        return res.status(400).json({ success: false, valid: false, message: 'HWID is required' });
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
        });

        const clientIp = getClientIp(req);

        const rateCheck = await checkRateLimit(supabase, clientIp);
        if (!rateCheck.allowed) {
            return res.status(429).json({
                success: false,
                valid: false,
                message: 'Too many requests. Please wait.',
                retryAfter: rateCheck.retryAfter
            });
        }

        const { data: hashData, error: hashError } = await supabase.rpc('hash_license_key', { p_key_string: key });
        if (hashError || !hashData) {
            return res.status(500).json({ success: false, valid: false, message: 'Encryption error' });
        }
        const keyHash = hashData;

        const rpcPromise = supabase.rpc('verify_license_key_v2', {
            p_key_hash: keyHash,
            p_hwid: hwid,
            p_script_id: scriptId || null,
            p_ip_address: clientIp
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('verify_license_key_v2 timed out')), RPC_TIMEOUT_MS);
        });

        const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);

        if (error) {
            await antiBruteForceDelay(false);
            return res.status(500).json({
                success: false,
                valid: false,
                message: 'Verification error. Please try again.'
            });
        }

        const isValid = data?.success === true;
        const responseData = data?.data || data || {};

        await antiBruteForceDelay(isValid);

        return res.status(isValid ? 200 : 403).json({
            success: isValid,
            valid: isValid,
            message: isValid ? 'Key is valid.' : (responseData.message || 'Invalid or expired key.'),
            tier: responseData.tier || 'basic',
            type: responseData.tier || 'basic',
            expires_at: responseData.expires_at || null,
            days_remaining: responseData.expires_at ? getDaysRemaining(responseData.expires_at) : -1,
            hwid_locked: responseData.hwid_locked === true,
            total_executions: responseData.total_executions || 0,
            is_lifetime: responseData.is_lifetime === true,
        });
    } catch (err: any) {
        console.error('[Verify] Critical error:', err);
        return res.status(500).json({
            success: false,
            valid: false,
            message: 'Internal server error. Please try again later.'
        });
    }
}

// POST /api/keys/generate
async function handleGenerate(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return envError(res, 'Generate');
    }

    try {
        const { userId, prefix, durationDays, note, scriptId, tier } = req.body || {};

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        });

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('dev_tier, dev_key_limit')
            .eq('id', userId)
            .single();

        if (profileError || !profile || profile.dev_tier === 'none') {
            return res.status(403).json({ error: 'You need an active Developer Plan to generate keys.' });
        }

        const { count, error: countError } = await supabase
            .from('license_keys')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', userId);

        if (countError) {
            throw countError;
        }

        if (count && count >= profile.dev_key_limit) {
            return res.status(403).json({ error: 'Key limit reached for your plan.' });
        }

        const keyString = generateKey(prefix);
        const keyHash = createHash('sha256').update(keyString).digest('hex');
        const expiresAt = durationDays ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString() : null;

        const { data: newKey, error: genError } = await supabase
            .from('license_keys')
            .insert({
                owner_id: userId,
                key_string: keyString,
                key_hash: keyHash,
                expires_at: expiresAt,
                note: note || 'Default Key',
                script_id: scriptId || null,
                tier: tier || 'basic'
            })
            .select()
            .single();

        if (genError) throw genError;

        return res.status(200).json({ success: true, key: newKey });
    } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
}

// POST /api/keys/reset-hwid
async function handleResetHwid(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return envError(res, 'ResetHWID');
    }

    try {
        const authHeader = req.headers?.authorization || '';
        const token = authHeader.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Authentication required — send Bearer token' });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        });

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid or expired authentication token' });
        }

        const { keyId } = req.body || {};

        if (!keyId) {
            return res.status(400).json({ error: 'Missing keyId parameter' });
        }

        const { data: key, error: keyError } = await supabase
            .from('license_keys')
            .select('owner_id')
            .eq('id', keyId)
            .single();

        if (keyError || !key) {
            return res.status(404).json({ error: 'Key not found' });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.is_admin === true;

        if (key.owner_id !== user.id && !isAdmin) {
            return res.status(403).json({ error: 'You do not own this key' });
        }

        const { error: updateError } = await supabase
            .from('license_keys')
            .update({ hwid: null })
            .eq('id', keyId);

        if (updateError) throw updateError;

        return res.status(200).json({ success: true, message: 'HWID reset successfully' });
    } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
}

// GET /api/keys/verify-logs
async function handleVerifyLogs(req: any, res: any) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return envError(res, 'VerifyLogs');
    }

    const authHeader = req.headers?.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Authentication required — send Bearer token' });
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        global: { headers: { authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
        return res.status(401).json({ error: 'Invalid or expired authentication token' });
    }

    const { data: profile } = await authClient
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    if (!profile?.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const { data, error } = await supabase
            .from('key_verify_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        return res.status(200).json(data);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Internal error' });
    }
}

// POST /api/keys/claim
async function handleClaim(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return envError(res, 'Claim');
    }

    try {
        const authHeader = req.headers.authorization || '';
        let authenticatedUserId: string | null = null;

        if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.slice(7);
            const userClient = createClient(SUPABASE_URL, token, {
                auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
            });
            const { data: { user }, error: authError } = await userClient.auth.getUser();
            if (!authError && user) {
                authenticatedUserId = user.id;
            }
        }

        if (!authenticatedUserId) {
            const cookieSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
                auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
                global: { headers: { cookie: req.headers.cookie || '' } }
            });
            const { data: { user } } = await cookieSupabase.auth.getUser();
            if (user) {
                authenticatedUserId = user.id;
            }
        }

        const {
            ownerId,
            scriptId,
            durationDays,
            prefix,
            note,
            claimToken,
            tier,
            gatewayToken,
        } = req.body || {};

        if (!ownerId) {
            return res.status(400).json({ success: false, error: 'ownerId is required' });
        }

        if (authenticatedUserId && authenticatedUserId !== ownerId) {
            return res.status(403).json({ success: false, error: 'Unauthorized: you can only claim keys for yourself' });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        });

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('dev_tier, dev_key_limit')
            .eq('id', ownerId)
            .single();

        if (profileError || !profile || profile.dev_tier === 'none') {
            return res.status(403).json({ success: false, error: 'Developer plan not active' });
        }

        if (scriptId) {
            const { data: scriptData, error: scriptError } = await supabase
                .from('protected_scripts')
                .select('id')
                .eq('id', scriptId)
                .eq('owner_id', ownerId)
                .single();

            if (scriptError || !scriptData) {
                return res.status(404).json({ success: false, error: 'Script not found for this developer' });
            }
        }

        const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
        const { count: recentCount, error: countError } = await supabase
            .from('license_keys')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', ownerId)
            .gte('created_at', oneMinuteAgo);

        if (countError) {
            throw countError;
        }

        if (recentCount && recentCount >= 10) {
            return res.status(429).json({ success: false, error: 'Rate limit: too many keys generated recently. Wait a moment.' });
        }

        const nowIso = new Date().toISOString();
        const claimMarker = getClaimMarker(claimToken);
        const baseNote = note || 'Gateway claim';
        const storedNote = claimMarker ? `${baseNote} ${claimMarker}` : baseNote;

        if (claimMarker) {
            let activeClaimQuery = supabase
                .from('license_keys')
                .select('id, key_string, expires_at, script_id')
                .eq('owner_id', ownerId)
                .eq('note', storedNote)
                .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
                .order('created_at', { ascending: false })
                .limit(1);

            activeClaimQuery = scriptId
                ? activeClaimQuery.eq('script_id', scriptId)
                : activeClaimQuery.is('script_id', null);

            const { data: activeKeys, error: activeKeyError } = await activeClaimQuery;

            if (activeKeyError) {
                throw activeKeyError;
            }

            if (activeKeys && activeKeys.length > 0) {
                return res.status(200).json({
                    success: true,
                    key: activeKeys[0],
                    reused: true,
                });
            }
        }

        const activeLimitFilter = `expires_at.is.null,expires_at.gt.${nowIso}`;
        const { count: totalCount, error: totalCountError } = await supabase
            .from('license_keys')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', ownerId)
            .or(activeLimitFilter);

        if (totalCountError) {
            throw totalCountError;
        }

        if (totalCount && profile.dev_key_limit && totalCount >= profile.dev_key_limit) {
            return res.status(403).json({ success: false, error: 'Developer key limit reached' });
        }

        const safeDurationDays = Number.isFinite(Number(durationDays)) ? Math.max(0, Number(durationDays)) : 1;
        const keyString = generateKey((prefix || 'SLENDER').toString().replace(/[^A-Z0-9_-]/gi, '').slice(0, 20) || 'SLENDER');
        const keyHash = createHash('sha256').update(keyString).digest('hex');
        const expiresAt = safeDurationDays > 0
            ? new Date(Date.now() + safeDurationDays * 24 * 60 * 60 * 1000).toISOString()
            : null;

        const { data: createdKey, error: createError } = await supabase
            .from('license_keys')
            .insert({
                owner_id: ownerId,
                key_string: keyString,
                key_hash: keyHash,
                expires_at: expiresAt,
                note: storedNote,
                script_id: scriptId || null,
                tier: tier || 'basic'
            })
            .select('id, key_string, expires_at, script_id')
            .single();

        if (createError) {
            throw createError;
        }

        return res.status(200).json({
            success: true,
            key: createdKey,
        });
    } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
    }
}

// GET /api/keys/claim-config?ownerId=..&scriptId=..
async function handleClaimConfig(req: any, res: any) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return envError(res, 'ClaimConfig');
    }

    const ownerId = req.query?.ownerId;
    const scriptId = req.query?.scriptId;

    if (!ownerId) {
        return res.status(400).json({ success: false, error: 'ownerId is required' });
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        });

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('shortener_url, discord_url, youtube_url, monetag_url, dev_tier')
            .eq('id', ownerId)
            .single();

        if (profileError || !profile) {
            return res.status(404).json({ success: false, error: 'Developer profile not found' });
        }

        let script: { id: string; name: string } | null = null;
        if (scriptId) {
            const { data: scriptData, error: scriptError } = await supabase
                .from('protected_scripts')
                .select('id, name')
                .eq('id', scriptId)
                .eq('owner_id', ownerId)
                .single();

            if (scriptError || !scriptData) {
                return res.status(404).json({ success: false, error: 'Script not found for this developer' });
            }

            script = scriptData;
        }

        return res.status(200).json({
            success: true,
            gateway: {
                shortener_url: profile.shortener_url || '',
                discord_url: profile.discord_url || '',
                youtube_url: profile.youtube_url || '',
                monetag_url: profile.monetag_url || '',
                dev_tier: profile.dev_tier || 'none',
            },
            script,
        });
    } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
    }
}

// ── Router principal ─────────────────────────────────────────
export default async function handler(req: any, res: any) {
    const pathname = (req.url || '').split('?')[0].replace(/\/+$/, '') || '/';
    const route = pathname.split('/').filter(Boolean).pop() || '';

    switch (route) {
        case 'verify':
            return handleVerify(req, res);
        // ── Temporariamente desativados (Developer Panel offline) ──────────
        case 'generate':
        case 'reset-hwid':
        case 'verify-logs':
            return res.status(503).json({
                success: false,
                error: 'System temporarily disabled. The developer panel is offline.',
                disabled: true,
            });
        // ────────────────────────────────────────────────────────────────────
        case 'claim':
            return handleClaim(req, res);
        case 'claim-config':
            return handleClaimConfig(req, res);
        default:
            return res.status(404).json({ success: false, error: `Unknown keys route: ${pathname}` });
    }
}
