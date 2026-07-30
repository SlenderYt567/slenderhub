import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('[Claim] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
}

const generateKey = (prefix: string = 'SLENDER'): string => {
    const part1 = randomBytes(3).toString('hex').toUpperCase();
    const part2 = randomBytes(3).toString('hex').toUpperCase();
    const part3 = randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}-${part1}-${part2}-${part3}`;
};

const getClaimMarker = (claimToken: unknown) => {
    const safeToken = (claimToken || '').toString().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
    return safeToken ? `[claim:${safeToken}]` : '';
};

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    if (!supabaseKey) {
        return res.status(500).json({ success: false, error: 'Server configuration error (API Key)' });
    }

    try {
        // =============================================
        // VERIFICAR AUTENTICAÇÃO
        // =============================================
        const authHeader = req.headers.authorization || '';
        let authenticatedUserId: string | null = null;

        if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.slice(7);
            // Criar client com o token do usuário para verificar
            const userClient = createClient(supabaseUrl, token, {
                auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
            });
            const { data: { user }, error: authError } = await userClient.auth.getUser();
            if (!authError && user) {
                authenticatedUserId = user.id;
            }
        }

        // Fallback: verificar cookie de sessão (Vercel/Next.js)
        if (!authenticatedUserId) {
            const cookieSupabase = createClient(supabaseUrl, supabaseKey, {
                auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
                global: { headers: { cookie: req.headers.cookie || '' } }
            });
            const { data: { user } } = await cookieSupabase.auth.getUser();
            if (user) {
                authenticatedUserId = user.id;
            }
        }

        const {
            ownerId,
            scriptId,
            durationDays,
            prefix,
            note,
            claimToken,
            tier,
            gatewayToken,
        } = req.body || {};

        if (!ownerId) {
            return res.status(400).json({ success: false, error: 'ownerId is required' });
        }

        // =============================================
        // VALIDAR QUE O CHAMADOR É O PROPRIETÁRIO
        // =============================================
        if (authenticatedUserId && authenticatedUserId !== ownerId) {
            return res.status(403).json({ success: false, error: 'Unauthorized: you can only claim keys for yourself' });
        }

        // Se não conseguiu autenticar, ainda permitir (para claim links públicos)
        // mas apenas se não houver ownerId diferente do autenticado
        // Nota: Idealmente todos os claims deveriam exigir auth,
        // mas claim links são compartilhados publicamente.

        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        });

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('dev_tier, dev_key_limit')
            .eq('id', ownerId)
            .single();

        if (profileError || !profile || profile.dev_tier === 'none') {
            return res.status(403).json({ success: false, error: 'Developer plan not active' });
        }

        if (scriptId) {
            const { data: scriptData, error: scriptError } = await supabase
                .from('protected_scripts')
                .select('id')
                .eq('id', scriptId)
                .eq('owner_id', ownerId)
                .single();

            if (scriptError || !scriptData) {
                return res.status(404).json({ success: false, error: 'Script not found for this developer' });
            }
        }

        // =============================================
        // RATE LIMITING: Máx 10 keys por minuto por owner
        // =============================================
        const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
        const { count: recentCount, error: countError } = await supabase
            .from('license_keys')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', ownerId)
            .gte('created_at', oneMinuteAgo);

        if (countError) {
            throw countError;
        }

        if (recentCount && recentCount >= 10) {
            return res.status(429).json({ success: false, error: 'Rate limit: too many keys generated recently. Wait a moment.' });
        }

        const nowIso = new Date().toISOString();
        const claimMarker = getClaimMarker(claimToken);
        const baseNote = note || 'Gateway claim';
        const storedNote = claimMarker ? `${baseNote} ${claimMarker}` : baseNote;

        if (claimMarker) {
            let activeClaimQuery = supabase
                .from('license_keys')
                .select('id, key_string, expires_at, script_id')
                .eq('owner_id', ownerId)
                .eq('note', storedNote)
                .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
                .order('created_at', { ascending: false })
                .limit(1);

            activeClaimQuery = scriptId
                ? activeClaimQuery.eq('script_id', scriptId)
                : activeClaimQuery.is('script_id', null);

            const { data: activeKeys, error: activeKeyError } = await activeClaimQuery;

            if (activeKeyError) {
                throw activeKeyError;
            }

            if (activeKeys && activeKeys.length > 0) {
                return res.status(200).json({
                    success: true,
                    key: activeKeys[0],
                    reused: true,
                });
            }
        }

        const activeLimitFilter = `expires_at.is.null,expires_at.gt.${nowIso}`;
        const { count: totalCount, error: totalCountError } = await supabase
            .from('license_keys')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', ownerId)
            .or(activeLimitFilter);

        if (totalCountError) {
            throw totalCountError;
        }

        if (totalCount && profile.dev_key_limit && totalCount >= profile.dev_key_limit) {
            return res.status(403).json({ success: false, error: 'Developer key limit reached' });
        }

        const safeDurationDays = Number.isFinite(Number(durationDays)) ? Math.max(0, Number(durationDays)) : 1;
        const keyString = generateKey((prefix || 'SLENDER').toString().replace(/[^A-Z0-9_-]/gi, '').slice(0, 20) || 'SLENDER');
        const keyHash = createHash('sha256').update(keyString).digest('hex');
        const expiresAt = safeDurationDays > 0
            ? new Date(Date.now() + safeDurationDays * 24 * 60 * 60 * 1000).toISOString()
            : null;

        const { data: createdKey, error: createError } = await supabase
            .from('license_keys')
            .insert({
                owner_id: ownerId,
                key_string: keyString,
                key_hash: keyHash,
                expires_at: expiresAt,
                note: storedNote,
                script_id: scriptId || null,
                tier: tier || 'basic'
            })
            .select('id, key_string, expires_at, script_id')
            .single();

        if (createError) {
            throw createError;
        }

        return res.status(200).json({
            success: true,
            key: createdKey,
        });
    } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
    }
}
