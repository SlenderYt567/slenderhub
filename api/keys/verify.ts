import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://pypfcdczatmsnqjuggiq.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_f6NUOpZVZwHxqe0Meivd-w_7zs3cj4b';
const RPC_TIMEOUT_MS = 12000;

// ─────────────────────────────────────────────
// In-memory rate limiter: max 10 requests per IP per 60s
// ─────────────────────────────────────────────
type RateEntry = { count: number; resetAt: number };
const rateLimitMap = new Map<string, RateEntry>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
        return false;
    }

    if (entry.count >= RATE_LIMIT) return true;

    entry.count += 1;
    return false;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function getClientIp(req: any): string {
    return (
        req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers?.['x-real-ip'] ||
        req.connection?.remoteAddress ||
        'unknown'
    );
}

function getDaysRemaining(expiresAt: string | null): number | null {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default async function handler(req: any, res: any) {
    // CORS headers — needed for Roblox HttpService calls
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, valid: false, message: 'Method Not Allowed' });
    }

    if (!supabaseKey) {
        return res.status(500).json({ success: false, valid: false, message: 'Server Config Error' });
    }

    // ── Rate limit ──────────────────────────────
    const clientIp = getClientIp(req);
    if (isRateLimited(clientIp)) {
        return res.status(429).json({
            success: false,
            valid: false,
            message: 'Too many requests. Please wait before verifying again.',
            retryAfter: 60
        });
    }

    // ── Parse params ─────────────────────────────
    const key = req.query?.key as string | undefined;
    const hwid = (req.query?.hwid as string | undefined) || 'untracked';
    const scriptId = req.query?.script_id as string | undefined;

    if (!key || key.trim() === '') {
        return res.status(400).json({ success: false, valid: false, message: 'Key is required' });
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        });

        // ── Verify via RPC (handles HWID lock atomically) ──
        const rpcPromise = supabase.rpc('verify_license_key', {
            p_key_string: key.trim(),
            p_hwid: hwid.trim()
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`verify_license_key timed out after ${RPC_TIMEOUT_MS}ms`)), RPC_TIMEOUT_MS);
        });

        const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);

        if (error) {
            return res.status(500).json({
                success: false,
                valid: false,
                message: `Database Error: ${error.message}`,
                details: error.hint || null
            });
        }

        const isValid = !!(data && data.success);
        const tier = data?.data?.tier || data?.tier || 'basic';
        const expiresAt = data?.data?.expires || data?.expires_at || null;
        const daysRemaining = getDaysRemaining(expiresAt);

        // ── Script scope check ──────────────────────
        if (isValid && scriptId && data?.script_id && data.script_id !== scriptId) {
            return res.status(403).json({
                success: false,
                valid: false,
                message: 'This key is not authorized for this script.',
                reason: 'WRONG_SCRIPT'
            });
        }

        // ── Log verification attempt (fire-and-forget) ──
        supabase
            .from('key_verify_logs')
            .insert({
                key_string: key.trim(),
                hwid: hwid.trim(),
                ip_address: clientIp,
                success: isValid,
                reason: isValid ? 'OK' : (data?.message || 'INVALID'),
                script_id: scriptId || null
            })
            .then(() => {/* fire and forget */})
            .catch(() => {/* ignore log errors */});

        return res
            .status(isValid ? 200 : 403)
            .json({
                // Primary fields (Luarmor-compatible)
                success: isValid,
                valid: isValid,
                message: isValid ? 'Key is valid.' : (data?.message || 'Invalid or expired key.'),
                // Extended info
                tier,
                type: tier,
                expires_at: expiresAt,
                days_remaining: daysRemaining,
                hwid_locked: !!data?.hwid,
                key_string: isValid ? key.trim() : undefined,
            });

    } catch (err: any) {
        return res.status(500).json({
            success: false,
            valid: false,
            message: `Internal Server Error: ${err.message}`
        });
    }
}
