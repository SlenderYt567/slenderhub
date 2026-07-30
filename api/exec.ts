import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge',
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(request: Request) {
    // Verificar User-Agent Roblox (proteção básica)
    const userAgent = request.headers.get('user-agent') || '';
    const isRoblox = userAgent.toLowerCase().includes('roblox');

    if (!isRoblox) {
        return new Response('ERRO: Você não pode acessar o código aberto desse script.', {
            status: 403,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return new Response('-- Erro de configuração do servidor.', { status: 500 });
    }

    // Extrair scriptId da query string
    const url = new URL(request.url);
    const scriptId = url.searchParams.get('script_id') || url.searchParams.get('scriptId');

    if (!scriptId) {
        return new Response('-- script_id é obrigatório.', { status: 400 });
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
        });

        // Buscar script diretamente (sem verificação de key — endpoint público legacy)
        const { data: script, error } = await supabase
            .from('protected_scripts')
            .select('script_obfuscated, script_content, is_active')
            .eq('id', scriptId)
            .single();

        if (error || !script || script.is_active === false) {
            return new Response('-- Script não encontrado ou desativado.', { status: 404 });
        }

        // Priorizar script ofuscado, fallback para texto puro
        const content = script.script_obfuscated || script.script_content || '-- Script vazio';

        return new Response(content, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
            },
        });

    } catch (error) {
        console.error('[Exec] Erro:', error);
        return new Response('-- Ocorreu um erro interno no servidor ao obter o script.', { status: 500 });
    }
}
