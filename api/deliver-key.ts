import { createClient } from '@supabase/supabase-js';
import { sendDigitalDeliveryEmail, getTransporter } from './email.js';

export default async function handler(request: Request) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return new Response(JSON.stringify({ error: 'Server configuration error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
    });

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await request.json();
        const { orderId, productId, productTitle, customerEmail, customerName } = body;

        if (!productId || !customerEmail) {
            return new Response(JSON.stringify({
                error: 'Parâmetros obrigatórios ausentes: productId e customerEmail são necessários.'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const cleanOrderId = orderId || `ORD-${Date.now()}`;
        const cleanProductTitle = productTitle || 'Produto Digital Slender Hub';

        let keyContent: string | null = null;
        let keyId: string | null = null;

        // 1. Tentar resgatar a key atômica via Stored Procedure do Supabase (RPC)
        // A RPC deliver_key_atomic usa "FOR UPDATE SKIP LOCKED" para garantir atomicidade
        const { data: rpcData, error: rpcError } = await supabase.rpc('deliver_key_atomic', {
            p_product_id: productId,
            p_order_id: cleanOrderId,
            p_customer_email: customerEmail
        });

        if (!rpcError && rpcData && rpcData.length > 0 && rpcData[0].success) {
            keyContent = rpcData[0].content;
            keyId = rpcData[0].key_id;
        } else {
            const rpcErrorMessage = rpcError?.message || 'RPC returned unsuccessful';
            console.error(`[DeliverKey] RPC deliver_key_atomic falhou: ${rpcErrorMessage}`);
            // Nota: O fallback com SELECT + UPDATE foi removido pois possui race condition.
            // Certifique-se de que a RPC deliver_key_atomic existe no Supabase (schema.sql)
        }

        // 2. Se NÃO houver keys disponíveis (Estoque esgotado)
        if (!keyContent) {
            console.warn(`[ESTOQUE ESGOTADO] Sem keys disponíveis para o produto: ${productId}`);

            // Atualizar status do pedido/chat para "pending_stock" se orderId for informado
            if (orderId) {
                await supabase
                    .from('chat_sessions')
                    .update({ status: 'pending_stock' })
                    .eq('id', orderId);
            }

            // Alerta por e-mail para o Administrador
            const adminEmail = process.env.ADMIN_EMAIL;
            if (adminEmail) {
                const transporter = getTransporter();
                const smtpUser = process.env.SMTP_EMAIL;
                if (transporter && smtpUser) {
                    await transporter.sendMail({
                        from: smtpUser,
                        to: adminEmail,
                        subject: `⚠️ ALERTA DE ESTOQUE: Produto sem Keys (${cleanProductTitle})`,
                        text: `Atenção Admin!\n\nUma compra foi realizada por ${customerEmail} para o produto "${cleanProductTitle}" (ID: ${productId}), mas NÃO HÁ KEYS DISPONÍVEIS no banco de dados.\n\nID do Pedido: ${cleanOrderId}\n\nPor favor, adicione novas keys na tabela digital_keys ou entregue manualmente ao cliente.`
                    });
                }
            }

            return new Response(JSON.stringify({
                success: false,
                reason: 'OUT_OF_STOCK',
                message: 'Pagamento recebido, porém o estoque de keys está zerado. O administrador foi notificado para providenciar a reposição.'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 3. Se a Key foi resgatada com sucesso -> Disparar E-mail ao Comprador
        const emailResult = await sendDigitalDeliveryEmail({
            toEmail: customerEmail,
            customerName: customerName || customerEmail.split('@')[0],
            orderId: cleanOrderId,
            productTitle: cleanProductTitle,
            keyContent: keyContent
        });

        // 4. Atualizar o status do pedido para "verified" / "delivered"
        if (orderId) {
            await supabase
                .from('chat_sessions')
                .update({ 
                    payment_status: 'verified',
                    status: 'closed'
                })
                .eq('id', orderId);
        }

        return new Response(JSON.stringify({
            success: true,
            orderId: cleanOrderId,
            deliveredTo: customerEmail,
            keyId: keyId,
            simulatedEmail: emailResult.simulated,
            message: 'Key resgatada e e-mail enviado com sucesso!'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error("Erro na entrega de key digital:", error);
        return new Response(JSON.stringify({ error: error.message || 'Erro interno no servidor' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
