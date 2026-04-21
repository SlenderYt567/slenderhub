import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://pypfcdczatmsnqjuggiq.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_f6NUOpZVZwHxqe0Meivd-w_7zs3cj4b';

export default async function handler(request: Request) {
    if (!supabaseKey) {
        return new Response('warn("Server Config Error: Missing API Key");', { status: 500, headers: { 'Content-Type': 'text/plain' } });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const hwid = searchParams.get('hwid');

    if (!key || !hwid) {
        return new Response('warn("Authentication Error: Key and HWID are required.");', { 
            status: 400,
            headers: { 'Content-Type': 'text/plain' }
        });
    }

    const ipAddress = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'Unknown IP';

    try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase.rpc('validate_and_get_script', {
            p_key_string: key,
            p_hwid: hwid,
            p_ip_address: ipAddress
        });

        if (error) {
            return new Response(`warn("Database Error: ${error.message}");`, { 
                status: 500,
                headers: { 'Content-Type': 'text/plain' }
            });
        }

        if (data && data.success) {
            // Calcula o tempo restante (em segundos)
            let secondsLeft = -1;
            if (data.expires_at) {
                secondsLeft = Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000);
            }

            // Injeção de Variáveis (Estilo Luarmor)
            const scriptHeader = `
-- [SlenderHub Protected Environment]
getgenv().LRM_IsUserPremium = ${data.tier === 'premium' || data.tier === 'lifetime' ? 'true' : 'false'};
getgenv().LRM_ScriptName = "${data.script_name || 'Protected Script'}";
getgenv().LRM_TotalExecutions = ${data.total_executions || 1};
getgenv().LRM_SecondsLeft = ${secondsLeft};
getgenv().LRM_UserNote = "${data.note || ''}";

`;
            const finalScript = scriptHeader + data.script_content;

            return new Response(finalScript, {
                status: 200,
                headers: { 
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
                }
            });
        } else {
            // Erros de autenticação retornados pelo banco
            const errorMessage = data?.error || 'Unknown Error';
            return new Response(`warn("SlenderHub Gateway: ${errorMessage}"); LocalPlayer:Kick("SlenderHub: ${errorMessage}")`, {
                status: 403,
                headers: { 'Content-Type': 'text/plain' }
            });
        }

    } catch (err: any) {
        return new Response(`warn("Internal Server Error: ${err.message}");`, { 
            status: 500,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}
