import { createClient } from '@supabase/supabase-js';
import { createHmac, createHash } from 'crypto';

export const config = {
    runtime: 'edge',
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HMAC_SECRET = process.env.SCRIPT_HMAC_SECRET;

if (!HMAC_SECRET) {
    throw new Error('[Gateway Complete] Missing SCRIPT_HMAC_SECRET in environment');
}

/**
 * Gera um token de gateway HMAC válido por 1 hora
 * Token = base64( key_hash + ":" + exp_timestamp + ":" + hmac )
 */
function generateGatewayToken(keyHash: string): string {
    const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hora
    const payload = `${keyHash}:${exp}`;
    const hmac = createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
    const token = Buffer.from(`${payload}:${hmac}`).toString('base64url');
    return token;
}

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ success: false, error: 'Method Not Allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return new Response(JSON.stringify({ success: false, error: 'Server configuration error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await request.json();
        const { key_string, steps_completed } = body || {};

        if (!key_string || typeof key_string !== 'string') {
            return new Response(JSON.stringify({ success: false, error: 'key_string is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
        });

        // Verificar se a key existe
        const keyHash = createHash('sha256').update(key_string).digest('hex');
        const { data: keyData, error: keyError } = await supabase
            .from('license_keys')
            .select('id, is_active, is_banned')
            .eq('key_hash', keyHash)
            .single();

        if (keyError || !keyData || !keyData.is_active || keyData.is_banned) {
            return new Response(JSON.stringify({ success: false, error: 'Invalid or inactive key' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Gerar token de gateway
        const token = generateGatewayToken(keyHash);

        return new Response(JSON.stringify({
            success: true,
            token,
            expires_in: 3600
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        });

    } catch (error) {
        console.error('[Gateway Complete] Error:', error);
        return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
