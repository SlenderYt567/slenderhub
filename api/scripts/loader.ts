import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://pypfcdczatmsnqjuggiq.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_f6NUOpZVZwHxqe0Meivd-w_7zs3cj4b';
const RPC_TIMEOUT_MS = 12000;

export default async function handler(req: any, res: any) {
    const sendLua = (body: string) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        return res.status(200).send(body);
    };

    if (req.method !== 'GET') {
        return sendLua('warn("Method Not Allowed");');
    }

    if (!supabaseKey) {
        return sendLua('warn("Server Config Error: Missing API Key");');
    }

    const key = req.query?.key;
    const hwid = req.query?.hwid;
    const scriptId = req.query?.script_id || req.query?.scriptId;

    if (!key || !hwid) {
        return sendLua('warn("Authentication Error: Key and HWID are required.");');
    }

    const ipAddress = req.headers?.['cf-connecting-ip'] || req.headers?.['x-forwarded-for'] || 'Unknown IP';

    try {
        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        });

        const rpcPromise = supabase.rpc('validate_and_get_script', {
            p_key_string: key,
            p_hwid: hwid,
            p_ip_address: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`validate_and_get_script timed out after ${RPC_TIMEOUT_MS}ms`)), RPC_TIMEOUT_MS);
        });

        const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);

        if (error) {
            return sendLua(`warn("Database Error: ${error.message}");`);
        }

        if (data && data.success) {
            let secondsLeft = -1;
            if (data.expires_at) {
                secondsLeft = Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000);
            }

            let scriptContent = data.script_content;
            let scriptName = data.script_name || 'Protected Script';

            if ((!scriptContent || !String(scriptContent).trim()) && scriptId) {
                const { data: scriptRow, error: scriptError } = await supabase
                    .from('protected_scripts')
                    .select('name, script_content, is_active')
                    .eq('id', scriptId)
                    .single();

                if (scriptError) {
                    return sendLua(`warn("SlenderHub Gateway: Script_Not_Found");`);
                }

                if (scriptRow?.is_active === false) {
                    return sendLua(`warn("SlenderHub Gateway: Script_Disabled");`);
                }

                scriptContent = scriptRow?.script_content;
                scriptName = scriptRow?.name || scriptName;
            }

            const scriptHeader = `
-- [SlenderHub Protected Environment]
getgenv().LRM_IsUserPremium = ${data.tier === 'premium' || data.tier === 'lifetime' ? 'true' : 'false'};
getgenv().LRM_ScriptName = "${scriptName}";
getgenv().LRM_TotalExecutions = ${data.total_executions || 1};
getgenv().LRM_SecondsLeft = ${secondsLeft};
getgenv().LRM_UserNote = "${data.note || ''}";

`;

            if (!scriptContent || !String(scriptContent).trim()) {
                return sendLua(scriptHeader + '-- Global Key active, but no script assigned');
            }

            return sendLua(scriptHeader + scriptContent);
        }

        const errorMessage = data?.error || 'Unknown Error';
        return sendLua(`
warn("SlenderHub Gateway: ${errorMessage}")
local Players = game:GetService("Players")
local player = Players and Players.LocalPlayer
if player then
    player:Kick("SlenderHub: ${errorMessage}")
end
`);
    } catch (err: any) {
        return sendLua(`warn("Internal Server Error: ${err.message}");`);
    }
}
