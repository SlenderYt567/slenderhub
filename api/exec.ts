import { createClient } from '@supabase/supabase-js';

export const config = {
    // Node.js runtime: Vercel 58+ agrupa rotas em namespaces compartilhados.
    // Manter edge aqui faz o bundle edge puxar módulos Node (crypto) de outras
    // rotas do namespace e quebrar o build ("unsupported modules: crypto").
    runtime: 'nodejs',
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Assinatura Express-style (req, res): o @vercel/node (Vercel 58+) não despacha
// handlers Web API (request: Request) corretamente — crashavam com
// FUNCTION_INVOCATION_FAILED (request.headers.get não existe no IncomingMessage).
export default async function handler(req: any, res: any) {
    // Verificar User-Agent Roblox (proteção básica)
    const userAgent = (req.headers?.['user-agent'] as string) || '';
    const isRoblox = userAgent.toLowerCase().includes('roblox');

    if (!isRoblox) {
        return res.status(403).send('ERRO: Você não pode acessar o código aberto desse script.');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return res.status(500).send('-- Erro de configuração do servidor.');
    }

    // Extrair scriptId da query string
    const url = new URL(req.url || '/', 'http://localhost');
    const scriptId = url.searchParams.get('script_id') || url.searchParams.get('scriptId');

    if (!scriptId) {
        return res.status(400).send('-- script_id é obrigatório.');
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
            return res.status(404).send('-- Script não encontrado ou desativado.');
        }

        // Priorizar script ofuscado, fallback para texto puro
        const content = script.script_obfuscated || script.script_content || '-- Script vazio';

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        return res.status(200).send(content);

    } catch (error) {
        console.error('[Exec] Erro:', error);
        return res.status(500).send('-- Ocorreu um erro interno no servidor ao obter o script.');
    }
}
