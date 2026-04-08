import { createClient } from '@supabase/supabase-js';
import { obfuscateLua } from '../lib/obfuscator';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pypfcdczatmsnqjuggiq.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''; // Use ANON KEY or Service Role if possible

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const body = await request.json();
        const { code, userId } = body;

        if (!code || !userId) {
            return new Response(JSON.stringify({ error: 'Código e ID do usuário são obrigatórios.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Verificar créditos e admin status
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('credits, is_admin')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            return new Response(JSON.stringify({ error: 'Usuário não encontrado.' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const isAdmin = profile.is_admin;
        const currentCredits = profile.credits;

        if (!isAdmin && currentCredits <= 0) {
            return new Response(JSON.stringify({ error: 'Créditos insuficientes. Adquira mais na loja.' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 2. Ofuscar
        const obfuscatedCode = obfuscateLua(code);

        // 3. Deduzir crédito (se não for admin)
        if (!isAdmin) {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ credits: currentCredits - 1 })
                .eq('id', userId);

            if (updateError) {
                console.error("Erro ao deduzir créditos:", updateError);
            }
        }

        return new Response(JSON.stringify({ 
            success: true, 
            obfuscatedCode,
            remainingCredits: isAdmin ? 999999 : currentCredits - 1
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error("Obfuscation API error:", error);
        return new Response(JSON.stringify({ error: error.message || 'Erro interno no servidor' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
