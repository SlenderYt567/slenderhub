import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://pypfcdczatmsnqjuggiq.supabase.co';
// Using ANON Key allows this endpoint to work reliably since RPC handles security
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_f6NUOpZVZwHxqe0Meivd-w_7zs3cj4b';

export default async function handler(request: Request) {
    if (!supabaseKey) {
        console.error("ERRO CRITICO: Verificação falhou - Chave de API ausente");
        return new Response(JSON.stringify({ success: false, message: 'Server Config Error' }), { status: 500 });
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

        const { data, error } = await supabase.rpc('verify_license_key', {
            p_key_string: key,
            p_hwid: hwid
        });

        if (error) {
            console.error("RPC Error:", error);
            return new Response(JSON.stringify({ success: false, message: 'Database error' }), { status: 500 });
        }

        // data holds the json returned by the RPC
        return new Response(JSON.stringify(data), {
            status: data && data.success ? 200 : 403,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), { status: 500 });
    }
}
