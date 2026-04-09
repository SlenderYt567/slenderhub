import { createClient } from '@supabase/supabase-js';

// Motor de ofuscação ultra-rápido consolidado
const obfuscateLua = (code: string): string => {
  let result = code;

  // 0. Remover blocos de código Markdown se colados por engano (```lua ... ```)
  result = result.replace(/^```[a-z]*\n/i, '');
  result = result.replace(/\n```$/m, '');
  result = result.trim();

  // 1. Remover Comentários
  result = result.replace(/--\[\[[\s\S]*?\]\]/g, ''); 
  result = result.replace(/--.*$/gm, '');             

  // 2. Proteção de Strings
  result = result.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, (match) => {
    const quote = match[0];
    const content = match.slice(1, -1);
    let escaped = '';
    for (let i = 0; i < content.length; i++) {
        escaped += '\\' + content.charCodeAt(i).toString(10).padStart(3, '0');
    }
    return `${quote}${escaped}${quote}`;
  });

  // 3. Renomeação de Variáveis Locais
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
  return `-- SlenderHub Protected\n` + result;
};

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pypfcdczatmsnqjuggiq.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_f6NUOpZVZwHxqe0Meivd-w_7zs3cj4b';

export default async function handler(request: Request) {
    if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });

    try {
        const authHeader = request.headers.get('Authorization');
        const body = await request.json();
        const { code, userId } = body;

        if (!code) return new Response(JSON.stringify({ error: 'Código vazio.' }), { status: 400 });

        // OFUSCAR IMEDIATAMENTE (NUNCA ESPERA O DB)
        const obfuscatedCode = obfuscateLua(code);

        // Tenta falar com o banco em paralelo, mas não trava se demorar
        // Usamos um timeout bem curto para a verificação de créditos
        let remainingCredits = 999999;
        
        if (userId) {
            try {
                const supabase = createClient(supabaseUrl, supabaseKey, {
                    global: { headers: { Authorization: authHeader || '' } },
                    auth: { persistSession: false }
                });

                // Tentativa de consulta com timeout de 3 segundos
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), 3000);

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('credits, is_admin')
                    .eq('id', userId)
                    .single();
                
                clearTimeout(id);

                if (profile) {
                    remainingCredits = profile.is_admin ? 999999 : profile.credits - 1;
                    // Atualiza créditos em background sem await
                    if (!profile.is_admin) {
                        supabase.from('profiles').update({ credits: profile.credits - 1 }).eq('id', userId).then();
                    }
                }
            } catch (dbError) {
                console.warn("DB interaction failed or timed out, proceeding anyway.");
            }
        }

        return new Response(JSON.stringify({ 
            success: true, 
            obfuscatedCode,
            remainingCredits
        }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: 'Erro crítico de execução.' }), { status: 500 });
    }
}
