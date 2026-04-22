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

            const scriptHeader = `
-- [SlenderHub Protected Environment]
getgenv().LRM_IsUserPremium = ${data.tier === 'premium' || data.tier === 'lifetime' ? 'true' : 'false'};
getgenv().LRM_ScriptName = "${data.script_name || 'Protected Script'}";
getgenv().LRM_TotalExecutions = ${data.total_executions || 1};
getgenv().LRM_SecondsLeft = ${secondsLeft};
getgenv().LRM_UserNote = "${data.note || ''}";

`;

            return sendLua(scriptHeader + data.script_content);
        }

        const errorMessage = data?.error || 'Unknown Error';
        return sendLua(`warn("SlenderHub Gateway: ${errorMessage}"); LocalPlayer:Kick("SlenderHub: ${errorMessage}")`);
    } catch (err: any) {
        return sendLua(`warn("Internal Server Error: ${err.message}");`);
    }
}
