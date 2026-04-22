import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://pypfcdczatmsnqjuggiq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!supabaseKey) {
        return res.status(500).json({ error: 'Server Config Error' });
    }

    try {
        const { keyId, userId } = req.body || {};

        if (!keyId || !userId) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        });

        const { error } = await supabase
            .from('license_keys')
            .update({ hwid: null })
            .eq('id', keyId)
            .eq('owner_id', userId);

        if (error) throw error;

        return res.status(200).json({ success: true, message: 'HWID reset successfully' });
    } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
}
