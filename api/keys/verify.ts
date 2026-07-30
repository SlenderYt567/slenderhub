import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

function getClientIp(req: any): string {
    return (
        req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers?.['x-real-ip'] ||
        req.headers?.['cf-connecting-ip'] ||
        'unknown'
    );
}

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

export default async function handler(req: any, res: any) {
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
        console.error('[Verify] Missing environment variables');
        return res.status(500).json({ success: false, valid: false, message: 'Server configuration error' });
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
