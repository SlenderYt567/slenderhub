import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HMAC_SECRET = process.env.SCRIPT_HMAC_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('[Obfuscate] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
}

if (!HMAC_SECRET) {
    throw new Error('[Obfuscate] Missing SCRIPT_HMAC_SECRET in environment — set a random 64-char string');
}

function obfuscateLua(source: string): string {
    // 1. Remove comments
    let code = source.replace(/--\[\[[\s\S]*?\]\]/g, '')  // block comments
                    .replace(/--.*$/gm, '');                // line comments
    
    // 2. Minify (remove spaces)
    code = code.replace(/\s+/g, ' ')
              .replace(/\s*([{}();,=+\-*/<>])\s*/g, '$1');
    
    // 3. Obfuscate strings using simple substitution
    const stringMap = new Map<string, string>();
    let stringCounter = 0;
    code = code.replace(/(["'])((?:(?!\1).)*)\1/g, (match, quote, content) => {
        const key = `_S${stringCounter++}_`;
        stringMap.set(key, content);
        return key;
    });
    
    // 4. Scramble local variables
    let varCounter = 0;
    code = code.replace(/\blocal\s+(\w+)/g, (match, name) => {
        const obfuscated = `_v${varCounter++}_`;
        const regex = new RegExp(`\\b${name}\\b`, 'g');
        code = code.replace(regex, obfuscated);
        return `local ${obfuscated}`;
    });
    
    // 5. Construct final payload
    let stringTable = '';
    stringMap.forEach((value, key) => {
        const encoded = Buffer.from(value, 'utf-8').toString('base64');
        stringTable += `${key}="${encoded}",`;
    });
    
    const payload = `
--[SlenderHub Obfuscated v1]
local _S={${stringTable.slice(0, -1)}}
local function _d(s)
    local hs = game:GetService("HttpService")
    return s and hs:JSONDecode('{"data":"'..s..'"}').data or ""
end
${code.replace(/_S(\d+)_/g, '_d(_S[$1])')}
`;
    
    return payload;
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { scriptId, ownerId } = req.body || {};
        
        if (!scriptId || !ownerId) {
            return res.status(400).json({ error: 'scriptId and ownerId required' });
        }

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const { data: script, error: fetchError } = await supabase
            .from('protected_scripts')
            .select('*')
            .eq('id', scriptId)
            .eq('owner_id', ownerId)
            .single();

        if (fetchError || !script) {
            return res.status(404).json({ error: 'Script not found or not owned by you' });
        }

        const obfuscated = obfuscateLua(script.script_content);
        
        const checksum = createHmac('sha256', HMAC_SECRET)
            .update(obfuscated)
            .digest('hex');

        const { error: updateError } = await supabase
            .from('protected_scripts')
            .update({
                script_obfuscated: obfuscated,
                script_checksum: checksum,
                version: (script.version || 0) + 1,
                updated_at: new Date().toISOString()
            })
            .eq('id', scriptId);

        if (updateError) {
            return res.status(500).json({ error: 'Failed to save obfuscated script' });
        }

        return res.status(200).json({ 
            success: true, 
            version: (script.version || 0) + 1,
            checksum: checksum.slice(0, 16) + '...'
        });

    } catch (err: any) {
        console.error('[Obfuscate] Error:', err);
        return res.status(500).json({ error: err.message || 'Internal error' });
    }
}
