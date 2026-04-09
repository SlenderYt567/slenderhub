import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pypfcdczatmsnqjuggiq.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_f6NUOpZVZwHxqe0Meivd-w_7zs3cj4b';

export default async function handler(request: Request) {
    if (request.method !== 'GET') {
        return new Response(JSON.stringify({ success: false, message: 'Method Not Allowed' }), { status: 405 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const hwid = searchParams.get('hwid') || 'untracked';

    if (!key) {
        return new Response(JSON.stringify({ success: false, message: 'Key is required' }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Buscar a key no banco
        const { data: license, error } = await supabase
            .from('license_keys')
            .select('*, owner_id(dev_tier)')
            .eq('key_string', key)
            .single();

        if (error || !license) {
            return new Response(JSON.stringify({ success: false, message: 'Invalid or non-existent key' }), { status: 404 });
        }

        if (!license.is_active) {
            return new Response(JSON.stringify({ success: false, message: 'Key is disabled by developer' }), { status: 403 });
        }

        // Verificar Expiração
        if (license.expires_at && new Date(license.expires_at) < new Date()) {
            return new Response(JSON.stringify({ success: false, message: 'Key has expired' }), { status: 403 });
        }

        // Sistema de HWID (Hardware ID Protection)
        if (!license.hwid) {
            // Primeiro uso: Gravar o HWID
            await supabase
                .from('license_keys')
                .update({ hwid: hwid })
                .eq('id', license.id);
        } else if (license.hwid !== hwid && hwid !== 'untracked') {
            return new Response(JSON.stringify({ success: false, message: 'HWID mismatch. Protect your key!' }), { status: 403 });
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Authenticated successfully',
            data: {
                tier: license.tier,
                expires: license.expires_at || 'Lifetime'
            }
        }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), { status: 500 });
    }
}
