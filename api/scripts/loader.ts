import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RPC_TIMEOUT_MS = 12000;

function sanitizeLuaString(s: string | null | undefined): string {
    if (!s) return '';
    return s
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
}

function escapeLuaComment(s: string): string {
    return (s || '').replace(/[\n\r"]/g, ' ').slice(0, 200);
}

export default async function handler(req: any, res: any) {
    const sendLua = (body: string) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.status(200).send(body);
    };

    if (req.method !== 'GET') return sendLua('warn("Method Not Allowed");');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return sendLua('warn("Loader configuration error. Contact support.");');
    }

    const key = (req.query?.key || '').trim();
    const hwid = (req.query?.hwid || '').trim();
    const scriptId = req.query?.script_id || req.query?.scriptId || '';

    if (!key || !hwid) {
        return sendLua('warn("SlenderHub: Key and HWID are required.");');
    }

    if (!scriptId) {
        return sendLua('warn("SlenderHub: script_id is required.");');
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
        });

        // Hash of key
        const { data: hashData } = await supabase.rpc('hash_license_key', { p_key_string: key });
        if (!hashData) return sendLua('warn("SlenderHub: Encryption error");');
        const keyHash = hashData;

        // Validate and retrieve script
        const rpcPromise = supabase.rpc('validate_and_get_script_v2', {
            p_key_hash: keyHash,
            p_hwid: hwid,
            p_script_id: scriptId,
            p_ip_address: req.headers?.['cf-connecting-ip'] || req.headers?.['x-forwarded-for'] || 'unknown'
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('validate timed out')), RPC_TIMEOUT_MS);
        });

        const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);

        if (error || !data?.success) {
            const errMsg = escapeLuaComment(data?.error || error?.message || 'Verification failed');
            return sendLua(`
warn("SlenderHub: ${errMsg}")
local p = game:GetService("Players").LocalPlayer
if p then p:Kick("SlenderHub: ${errMsg}") end
`);
        }

        let secondsLeft = -1;
        if (data.expires_at) {
            secondsLeft = Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000);
        }

        const safeName = sanitizeLuaString(data.script_name || 'Protected Script');
        const safeTier = sanitizeLuaString(data.tier || 'basic');
        const execCount = Math.max(0, parseInt(data.total_executions) || 1);
        const scriptVersion = parseInt(data.script_version) || 1;
        const checksum = sanitizeLuaString(data.script_checksum || '');

        const scriptHeader = `
-- [SlenderHub Protected Environment v2]
-- !! NÃO EDITE ESTA SEÇÃO — ela é verificada pelo servidor !!
do
    local env = getgenv()
    env.SLH_IsPremium = ${safeTier === 'premium' || safeTier === 'lifetime' ? 'true' : 'false'}
    env.SLH_ScriptName = "${safeName}"
    env.SLH_ScriptVersion = ${scriptVersion}
    env.SLH_TotalExecs = ${execCount}
    env.SLH_SecondsLeft = ${secondsLeft}
    env.SLH_Tier = "${safeTier}"
    env.SLH_Checksum = "${checksum}"
    
    -- Freeze to prevent runtime modifications
    if not env.SLH_Frozen then
        local mt = getrawmetatable(game)
        if mt then
            local oldIndex = mt.__index
            local oldNewIndex = mt.__newindex
            mt.__newindex = function(t, k, v)
                if typeof(k) == "string" and k:sub(1, 4) == "SLH_" then
                    return
                end
                return oldNewIndex and oldNewIndex(t, k, v) or rawset(t, k, v)
            end
        end
        env.SLH_Frozen = true
    end
end

-- Script ID: ${sanitizeLuaString(scriptId)}
`;

        if (!data.script_content || !String(data.script_content).trim()) {
            return sendLua(scriptHeader + '\n-- No script content assigned to this key.');
        }

        return sendLua(scriptHeader + '\n' + data.script_content);

    } catch (err: any) {
        console.error('[Loader] Error:', err);
        return sendLua('warn("SlenderHub: Internal server error. Please try again.");');
    }
}
