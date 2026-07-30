import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('[Generate] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
}

const generateKey = (prefix: string = 'SLENDER'): string => {
    const part1 = randomBytes(3).toString('hex').toUpperCase();
    const part2 = randomBytes(3).toString('hex').toUpperCase();
    const part3 = randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}-${part1}-${part2}-${part3}`;
};

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!supabaseKey) {
        return res.status(500).json({ error: 'Server configuration error (API Key)' });
    }

    try {
        const { userId, prefix, durationDays, note, scriptId, tier } = req.body || {};

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
