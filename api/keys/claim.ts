import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://pypfcdczatmsnqjuggiq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const generateKey = (prefix: string = 'SLENDER') => {
    const randomPart = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${randomPart()}-${randomPart()}-${randomPart()}`;
};

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    if (!supabaseKey) {
        return res.status(500).json({ success: false, error: 'Server configuration error (API Key)' });
    }

    try {
        const {
            ownerId,
            scriptId,
            durationDays,
            prefix,
            note,
        } = req.body || {};

        if (!ownerId) {
            return res.status(400).json({ success: false, error: 'ownerId is required' });
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

        const { count, error: countError } = await supabase
            .from('license_keys')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', ownerId);

        if (countError) {
            throw countError;
        }

        if (count && profile.dev_key_limit && count >= profile.dev_key_limit) {
            return res.status(403).json({ success: false, error: 'Developer key limit reached' });
        }

        const safeDurationDays = Number.isFinite(Number(durationDays)) ? Math.max(0, Number(durationDays)) : 1;
        const keyString = generateKey((prefix || 'SLENDER').toString().replace(/[^A-Z0-9_-]/gi, '').slice(0, 20) || 'SLENDER');
        const expiresAt = safeDurationDays > 0
            ? new Date(Date.now() + safeDurationDays * 24 * 60 * 60 * 1000).toISOString()
            : null;

        const { data: createdKey, error: createError } = await supabase
            .from('license_keys')
            .insert({
                owner_id: ownerId,
                key_string: keyString,
                expires_at: expiresAt,
                note: note || 'Gateway claim',
                script_id: scriptId || null,
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
