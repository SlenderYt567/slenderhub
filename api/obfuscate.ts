import { createClient } from '@supabase/supabase-js';

// Motor de ofuscação (Execução instantânea local)
const obfuscateLua = (code: string): string => {
  let result = code;
  result = result.replace(/--\[\[[\s\S]*?\]\]/g, ''); 
  result = result.replace(/--.*$/gm, '');             

  result = result.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, (match) => {
    const quote = match[0];
    const content = match.slice(1, -1);
    let escaped = '';
    for (let i = 0; i < content.length; i++) {
        escaped += '\\' + content.charCodeAt(i).toString(10).padStart(3, '0');
    }
    return `${quote}${escaped}${quote}`;
  });

  const localVars = new Set<string>();
  const localRegex = /local\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match;
  while ((match = localRegex.exec(result)) !== null) {
    if (!['function', 'then', 'else', 'end', 'in', 'do', 'repeat', 'until', 'while', 'for', 'if'].includes(match[1])) {
        localVars.add(match[1]);
    }
  }

  if (localVars.size > 0) {
      const varMap = new Map<string, string>();
      localVars.forEach(v => {
        varMap.set(v, 'slender_' + Math.random().toString(36).substring(2, 10));
      });
      const allVarsRegex = new RegExp(`\\b(${Array.from(localVars).join('|')})\\b`, 'g');
      result = result.replace(allVarsRegex, (m) => varMap.get(m) || m);
  }

  result = result.replace(/\s+/g, ' ').trim();
  return `-- Obfuscated by SlenderHub (Beta)\n-- Date: ${new Date().toLocaleDateString()}\n` + result;
};

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pypfcdczatmsnqjuggiq.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_f6NUOpZVZwHxqe0Meivd-w_7zs3cj4b';

export default async function handler(request: Request) {
    if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });

    try {
        const authHeader = request.headers.get('Authorization');
        const body = await request.json();
        const { code, userId } = body;

        if (!code || !userId) return new Response(JSON.stringify({ error: 'Faltam dados.' }), { status: 400 });

        // 1. OFUSCAR PRIMEIRO (Prioridade máxima, não depende de banco de dados)
        // Isso garante que se o DB estiver lento, a ofuscação já ocorreu e está na memória.
        const obfuscatedCode = obfuscateLua(code);

        // 2. CONEXÃO COM BANCO (TIMEOUT DE 5 SEGUNDOS PARA DB)
        // Se o Supabase demorar mais de 5s, vamos assumir que deu erro para não travar a Vercel.
        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader || '' } },
            auth: { persistSession: false } 
        });

        // Verificação rápida de perfil (com limite de tempo)
        const profilePromise = supabase.from('profiles').select('credits, is_admin').eq('id', userId).single();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), 5000));

        const { data: profile, error: profileError } = await Promise.race([profilePromise, timeoutPromise]) as any;

        if (profileError || !profile) {
            return new Response(JSON.stringify({ error: 'Erro ao validar créditos no banco.' }), { status: 500 });
        }

        if (!profile.is_admin && profile.credits <= 0) {
            return new Response(JSON.stringify({ error: 'Créditos insuficientes.' }), { status: 403 });
        }

        // 3. DEDUZIR CRÉDITO EM SEGUNDO PLANO (Não esperamos o resultado para responder ao usuário)
        if (!profile.is_admin) {
            supabase.from('profiles').update({ credits: profile.credits - 1 }).eq('id', userId).then();
        }

        // 4. RESPONDER AO USUÁRIO (Rápido!)
        return new Response(JSON.stringify({ 
            success: true, 
            obfuscatedCode,
            remainingCredits: profile.is_admin ? 999999 : profile.credits - 1
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message === 'DB_TIMEOUT' ? 'Banco de dados lento. Tente novamente.' : 'Erro interno.' }), { status: 500 });
    }
}
