import { createClient } from '@supabase/supabase-js';

// Lógica de ofuscação movida para dentro da API para compatibilidade total com Vercel
const obfuscateLua = (code: string): string => {
  let result = code;

  // 1. Remover Comentários
  result = result.replace(/--\[\[[\s\S]*?\]\]/g, ''); 
  result = result.replace(/--.*$/gm, '');             

  // 2. Proteção de Strings (Hex Escape)
  result = result.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, (match) => {
    const quote = match[0];
    const content = match.slice(1, -1);
    let escaped = '';
    for (let i = 0; i < content.length; i++) {
        escaped += '\\' + content.charCodeAt(i).toString(10).padStart(3, '0');
    }
    return `${quote}${escaped}${quote}`;
  });

  // 3. Renomeação de Variáveis Locais (Otimizado)
  const localVars = new Set<string>();
  const localRegex = /local\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match;
  while ((match = localRegex.exec(result)) !== null) {
    if (!['function', 'then', 'else', 'end', 'in', 'do', 'repeat', 'until', 'while', 'for', 'if'].includes(match[1])) {
        localVars.add(match[1]);
    }
  }

  const varMap = new Map<string, string>();
  localVars.forEach(v => {
    const randomName = 'slender_' + Math.random().toString(36).substring(2, 10);
    varMap.set(v, randomName);
  });

  // Única passagem pelo código para renomear todas as variáveis
  if (localVars.size > 0) {
      const allVarsRegex = new RegExp(`\\b(${Array.from(localVars).join('|')})\\b`, 'g');
      result = result.replace(allVarsRegex, (m) => varMap.get(m) || m);
  }

  // 4. Minificação básica
  result = result.replace(/\s+/g, ' ').trim();

  const header = `-- Obfuscated by SlenderHub (Beta)\n-- Date: ${new Date().toLocaleDateString()}\n`;
  return header + result;
};

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pypfcdczatmsnqjuggiq.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_f6NUOpZVZwHxqe0Meivd-w_7zs3cj4b';

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
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
            return new Response(JSON.stringify({ error: 'Perfil não encontrado no banco de dados.' }), {
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
            await supabase
                .from('profiles')
                .update({ credits: currentCredits - 1 })
                .eq('id', userId);
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
