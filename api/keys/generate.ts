import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://pypfcdczatmsnqjuggiq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const generateKey = (prefix: string = 'SLENDER') => {
    const randomPart = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${randomPart()}-${randomPart()}-${randomPart()}`;
};

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!supabaseKey) {
        return res.status(500).json({ error: 'Server configuration error (API Key)' });
    }

    try {
        const { userId, prefix, durationDays, note, scriptId } = req.body || {};

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
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
        const expiresAt = durationDays ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString() : null;

        const { data: newKey, error: genError } = await supabase
            .from('license_keys')
            .insert({
                owner_id: userId,
                key_string: keyString,
                expires_at: expiresAt,
                note: note || 'Default Key',
                script_id: scriptId || null
            })
            .select()
            .single();

        if (genError) throw genError;

        return res.status(200).json({ success: true, key: newKey });
    } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
}
