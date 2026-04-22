import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://pypfcdczatmsnqjuggiq.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_f6NUOpZVZwHxqe0Meivd-w_7zs3cj4b';
const RPC_TIMEOUT_MS = 12000;

export default async function handler(req: any, res: any) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    if (!supabaseKey) {
        return res.status(500).json({ success: false, message: 'Server Config Error' });
    }

    const key = req.query?.key;
    const hwid = req.query?.hwid || 'untracked';

    if (!key) {
        return res.status(400).json({ success: false, message: 'Key is required' });
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        });

        const rpcPromise = supabase.rpc('verify_license_key', {
            p_key_string: key,
            p_hwid: hwid
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`verify_license_key timed out after ${RPC_TIMEOUT_MS}ms`)), RPC_TIMEOUT_MS);
        });

        const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);

        if (error) {
            return res.status(500).json({
                success: false,
                message: `Database Error: ${error.message}`,
                details: error.hint || null
            });
        }

        return res
            .status(data && data.success ? 200 : 403)
            .setHeader('Cache-Control', 'no-store')
            .json(data);
    } catch (err: any) {
        return res.status(500).json({
            success: false,
            message: `Internal Server Error: ${err.message}`
        });
    }
}
