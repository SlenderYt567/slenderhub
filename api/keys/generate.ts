import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://pypfcdczatmsnqjuggiq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_f6NUOpZVZwHxqe0Meivd-w_7zs3cj4b';

const generateKey = (prefix: string = 'SLENDER') => {
    const randomPart = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${randomPart()}-${randomPart()}-${randomPart()}`;
};

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
    }

    try {
        const body = await request.json();
        const { userId, prefix, durationDays, note } = body;

        console.log("Generating key for:", userId);

        if (!userId) return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400 });

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Verificar se o usuário tem plano de dev (Tier)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('dev_tier, dev_key_limit')
            .eq('id', userId)
            .single();

        if (profileError || !profile || profile.dev_tier === 'none') {
            return new Response(JSON.stringify({ error: 'You need an active Developer Plan to generate keys.' }), { status: 403 });
        }

        // 2. Verificar limite de chaves
        const { count } = await supabase
            .from('license_keys')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', userId);

        if (count && count >= profile.dev_key_limit) {
            return new Response(JSON.stringify({ error: 'Key limit reached for your plan.' }), { status: 403 });
        }

        // 3. Gerar a Key
        const keyString = generateKey(prefix);
        const expiresAt = durationDays ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString() : null;

        const { data: newKey, error: genError } = await supabase
            .from('license_keys')
            .insert({
                owner_id: userId,
                key_string: keyString,
                expires_at: expiresAt,
                note: note || 'Default Key'
            })
            .select()
            .single();

        if (genError) throw genError;

        return new Response(JSON.stringify({ success: true, key: newKey }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
