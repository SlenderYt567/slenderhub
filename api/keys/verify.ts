import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://pypfcdczatmsnqjuggiq.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_f6NUOpZVZwHxqe0Meivd-w_7zs3cj4b';
const RPC_TIMEOUT_MS = 12000;

const getHeader = (request: any, name: string) => {
    const headers = request?.headers;
    if (!headers) return undefined;

    if (typeof headers.get === 'function') {
        return headers.get(name) || headers.get(name.toLowerCase()) || undefined;
    }

    const value = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
};

const getRequestUrl = (request: any) => {
    try {
        return new URL(request.url);
    } catch {
        const host = getHeader(request, 'host') || 'localhost';
        const protocol = getHeader(request, 'x-forwarded-proto') || 'https';
        return new URL(request.url, `${protocol}://${host}`);
    }
};

export default async function handler(request: any) {
    if (!supabaseKey) {
        console.error('Critical verify error: missing API key');
        return new Response(JSON.stringify({ success: false, message: 'Server Config Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const requestUrl = getRequestUrl(request);
    const { searchParams } = requestUrl;
    const key = searchParams.get('key');
    const hwid = searchParams.get('hwid') || 'untracked';

    if (!key) {
        return new Response(JSON.stringify({ success: false, message: 'Key is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const rpcPromise = supabase.rpc('verify_license_key', {
            p_key_string: key,
            p_hwid: hwid
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`verify_license_key timed out after ${RPC_TIMEOUT_MS}ms`)), RPC_TIMEOUT_MS);
        });

        const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);

        if (error) {
            return new Response(JSON.stringify({
                success: false,
                message: `Database Error: ${error.message}`,
                details: error.hint || null
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store'
                }
            });
        }

        return new Response(JSON.stringify(data), {
            status: data && data.success ? 200 : 403,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({
            success: false,
            message: `Internal Server Error: ${err.message}`
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        });
    }
}
