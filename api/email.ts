import nodemailer from 'nodemailer';

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const body = await request.json();
        const { contactEmail, customerName, totalValue, items, method } = body;

        const smtpUser = process.env.SMTP_EMAIL;
        const smtpPass = process.env.SMTP_PASSWORD;

        if (!smtpUser || !smtpPass) {
            console.warn("SMTP_EMAIL or SMTP_PASSWORD not set. Simulating email send...");
            console.log("Simulated Admin Alert:", { contactEmail, customerName, totalValue, method });
            console.log("Simulated Customer Email to:", contactEmail);
            
            return new Response(JSON.stringify({ success: true, simulated: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: smtpUser,
                pass: smtpPass
            }
        });

        const itemsList = items.map((item: any) => `- ${item.title} x${item.quantity} ($${item.price})`).join('\n');

        const adminMailOptions = {
            from: smtpUser,
            to: 'slenderyt9@gmail.com', // Always goes to the owner
            subject: `[SlenderHub] Nova Compra via ${method.toUpperCase()}!`,
            text: `Olá Admin!\n\nUma nova compra acabou de ser iniciada.\n\nDetalhes:\nComprador: ${customerName}\nE-mail de Contato: ${contactEmail}\nValor Total: $${totalValue}\nMétodo: ${method}\n\nItens Comprados:\n${itemsList}\n\nEntre no dashboard ou confira o chat para validar o pagamento e liberar o pedido.`
        };

        const customerMailOptions = {
            from: smtpUser,
            to: contactEmail,
            subject: `SlenderHub - Status do seu pedido`,
            text: `Olá ${customerName},\n\nObrigado pela sua compra!\n\nEnviaremos sua chave ou item em breve. Fique atento ao seu email ou se preferir nos contate no discord:\nhttps://discord.gg/E3xsUmtx\n\nResumo do Pedido:\n${itemsList}\nTotal: $${totalValue}\n\nAtenciosamente,\nEquipe SlenderHub`
        };

        await transporter.sendMail(adminMailOptions);
        await transporter.sendMail(customerMailOptions);

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error("Email send error:", error);
        return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
