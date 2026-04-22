import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://pypfcdczatmsnqjuggiq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: any, res: any) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    if (!supabaseKey) {
        return res.status(500).json({ success: false, error: 'Server configuration error (API Key)' });
    }

    const ownerId = req.query?.ownerId;
    const scriptId = req.query?.scriptId;

    if (!ownerId) {
        return res.status(400).json({ success: false, error: 'ownerId is required' });
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        });

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('shortener_url, discord_url, youtube_url, dev_tier')
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
                dev_tier: profile.dev_tier || 'none',
            },
            script,
        });
    } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
    }
}
