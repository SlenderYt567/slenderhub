import { createClient } from '@supabase/supabase-js';
import { createHmac, createHash } from 'crypto';

export const config = {
    // Node.js runtime obrigatório: usa createHmac/createHash/Buffer do Node crypto,
    // que não existem no Edge runtime do Vercel (Web Crypto é assíncrono e limitado).
    runtime: 'nodejs',
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

// Assinatura Express-style (req, res): o @vercel/node (Vercel 58+) não despacha
// handlers Web API (request: Request) — crashavam com FUNCTION_INVOCATION_FAILED.
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    try {
        const { key_string, steps_completed } = req.body || {};

        if (!key_string || typeof key_string !== 'string') {
            return res.status(400).json({ success: false, error: 'key_string is required' });
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
            return res.status(404).json({ success: false, error: 'Invalid or inactive key' });
        }

        // Gerar token de gateway
        const token = generateGatewayToken(keyHash);

        return res.status(200).json({
            success: true,
            token,
            expires_in: 3600
        });

    } catch (error) {
        console.error('[Gateway Complete] Error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
}
