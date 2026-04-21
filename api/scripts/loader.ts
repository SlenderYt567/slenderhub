import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://pypfcdczatmsnqjuggiq.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_f6NUOpZVZwHxqe0Meivd-w_7zs3cj4b';

const getRequestUrl = (request: Request) => {
    try {
        return new URL(request.url);
    } catch {
        const host = request.headers.get('host') || 'localhost';
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        return new URL(request.url, `${protocol}://${host}`);
    }
};

const luaResponse = (script: string) =>
    new Response(script, {
        status: 200,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        }
    });

export default async function handler(request: Request) {
    if (!supabaseKey) {
        return luaResponse('warn("Server Config Error: Missing API Key");');
    }

    const { searchParams } = getRequestUrl(request);
    const key = searchParams.get('key');
    const hwid = searchParams.get('hwid');

    if (!key || !hwid) {
        return luaResponse('warn("Authentication Error: Key and HWID are required.");');
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
            return luaResponse(`warn("Database Error: ${error.message}");`);
        }

        if (data && data.success) {
            let secondsLeft = -1;
            if (data.expires_at) {
                secondsLeft = Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000);
            }

            const scriptHeader = `
-- [SlenderHub Protected Environment]
getgenv().LRM_IsUserPremium = ${data.tier === 'premium' || data.tier === 'lifetime' ? 'true' : 'false'};
getgenv().LRM_ScriptName = "${data.script_name || 'Protected Script'}";
getgenv().LRM_TotalExecutions = ${data.total_executions || 1};
getgenv().LRM_SecondsLeft = ${secondsLeft};
getgenv().LRM_UserNote = "${data.note || ''}";

`;

            return luaResponse(scriptHeader + data.script_content);
        }

        const errorMessage = data?.error || 'Unknown Error';
        return luaResponse(`warn("SlenderHub Gateway: ${errorMessage}"); LocalPlayer:Kick("SlenderHub: ${errorMessage}")`);
    } catch (err: any) {
        return luaResponse(`warn("Internal Server Error: ${err.message}");`);
    }
}
