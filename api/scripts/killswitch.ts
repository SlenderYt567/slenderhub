import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'nodejs',
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: any, res: any) {
    // ── Temporariamente desativado (Developer Panel offline) ──
    return res.status(503).json({
        success: false,
        error: 'System temporarily disabled. The developer panel is offline.',
        disabled: true,
    });
    // ────────────────────────────────────────────────────────────
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { scriptId, ownerId, activate } = req.body || {};

    if (!scriptId || !ownerId) {
        return res.status(400).json({ error: 'scriptId and ownerId required' });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        if (activate) {
            const { data, error } = await supabase.rpc('activate_killswitch', {
                p_script_id: scriptId,
                p_owner_id: ownerId
            });

            if (error) return res.status(500).json({ error: error.message });
            return res.status(200).json(data);
        } else {
            const { error } = await supabase
                .from('protected_scripts')
                .update({ killswitch_activated: false, updated_at: new Date().toISOString() })
                .eq('id', scriptId)
                .eq('owner_id', ownerId);

            if (error) return res.status(500).json({ error: error.message });
            return res.status(200).json({ success: true, message: 'Killswitch deactivated' });
        }
    } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Internal error' });
    }
}
