import deliverKeyHandler from '../deliver-key.js';

export const config = {
    runtime: 'nodejs',
};

// Assinatura Express-style (req, res): o @vercel/node (Vercel 58+) não despacha
// handlers Web API (request: Request) — penduravam com 0 bytes no runtime.
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const body = req.body || {};
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
                return res.status(400).json({ error: 'Missing customer email' });
            }

            // Invocar a lógica de entrega da key com mock (req, res) Express-style
            const mockReq: any = {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                url: '/api/deliver-key',
                body: {
                    orderId: orderId,
                    productId: productId,
                    productTitle: productTitle,
                    customerEmail: customerEmail,
                    customerName: customerName
                }
            };
            const mockRes: any = {
                _status: 200,
                _json: null,
                status(code: number) { this._status = code; return this; },
                json(payload: any) { this._json = payload; return this; },
                send(payload: any) { this._json = payload; return this; },
                setHeader() { return this; },
            };

            await deliverKeyHandler(mockReq, mockRes);

            if (mockRes._json !== null) {
                return res.status(mockRes._status).json(mockRes._json);
            }
            return res.status(mockRes._status).send('ok');
        }

        return res.status(200).json({ status: 'ignored', message: `Evento ${eventType} não requer entrega.` });

    } catch (error: any) {
        console.error("[PayPal Webhook Error]:", error);
        return res.status(500).json({ error: error.message || 'Webhook processing failed' });
    }
}
