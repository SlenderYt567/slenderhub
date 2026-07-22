import deliverKeyHandler from '../deliver-key.js';

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await request.json();
        const eventType = body.event_type;

        console.log(`[PayPal Webhook] Evento recebido: ${eventType}`);

        // Processar apenas pagamentos aprovados/capturados
        if (eventType === 'PAYMENT.CAPTURE.COMPLETED' || eventType === 'CHECKOUT.ORDER.APPROVED') {
            const resource = body.resource;
            
            // Extrair dados do pagador e do item
            const customerEmail = resource.payer?.email_address || resource.purchase_units?.[0]?.payee?.email_address;
            const customerName = resource.payer?.name?.given_name || 'Cliente PayPal';
            const orderId = resource.id || resource.supplementary_data?.related_ids?.order_id;
            
            // Tentar recuperar custom_id ou item details
            const customData = resource.custom_id || resource.purchase_units?.[0]?.custom_id;
            let productId = 'default-product';
            let productTitle = 'Produto Digital';

            if (customData) {
                try {
                    const parsed = JSON.parse(customData);
                    productId = parsed.productId || productId;
                    productTitle = parsed.productTitle || productTitle;
                } catch {
                    productId = customData;
                }
            }

            if (!customerEmail) {
                console.error("[PayPal Webhook] E-mail do cliente não encontrado no payload do evento.");
                return new Response(JSON.stringify({ error: 'Missing customer email' }), { status: 400 });
            }

            // Invocar a lógica de entrega da key
            const mockRequest = new Request('http://localhost/api/deliver-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: orderId,
                    productId: productId,
                    productTitle: productTitle,
                    customerEmail: customerEmail,
                    customerName: customerName
                })
            });

            return await deliverKeyHandler(mockRequest);
        }

        return new Response(JSON.stringify({ status: 'ignored', message: `Evento ${eventType} não requer entrega.` }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error("[PayPal Webhook Error]:", error);
        return new Response(JSON.stringify({ error: error.message || 'Webhook processing failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
