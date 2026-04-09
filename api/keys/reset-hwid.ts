import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://pypfcdczatmsnqjuggiq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Chave secreta no backend

export default async function handler(request: Request) {
    if (!supabaseKey) {
        console.error("ERRO CRITICO: Reset falhou - Chave de API ausente");
        return new Response(JSON.stringify({ error: 'Server Config Error' }), { status: 500 });
    }

    try {
        const body = await request.json();
        const { keyId, userId } = body;

        console.log("Resetting HWID for key:", keyId);

        if (!keyId || !userId) return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });

        const supabase = createClient(supabaseUrl, supabaseKey);

        // O RLS da tabela license_keys já garante que apenas o dono pode atualizar
        const { data, error } = await supabase
            .from('license_keys')
            .update({ hwid: null })
            .eq('id', keyId)
            .eq('owner_id', userId)
            .select();

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, message: 'HWID reset successfully' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
