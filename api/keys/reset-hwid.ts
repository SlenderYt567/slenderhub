import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('[ResetHWID] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Extrair userId do token de autenticação (não confiar no body)
        const authHeader = req.headers?.authorization || '';
        const token = authHeader.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Authentication required — send Bearer token' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        });

        // Verificar token e obter user autenticado
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid or expired authentication token' });
        }

        const { keyId } = req.body || {};

        if (!keyId) {
            return res.status(400).json({ error: 'Missing keyId parameter' });
        }

        // Verificar se a key pertence ao usuário autenticado (ou é admin)
        const { data: key, error: keyError } = await supabase
            .from('license_keys')
            .select('owner_id')
            .eq('id', keyId)
            .single();

        if (keyError || !key) {
            return res.status(404).json({ error: 'Key not found' });
        }

        // Verificar ownership
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
