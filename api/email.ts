import nodemailer from 'nodemailer';

export function getTransporter() {
    const smtpUser = process.env.SMTP_EMAIL;
    const smtpPass = process.env.SMTP_PASSWORD;

    if (!smtpUser || !smtpPass) {
        return null;
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: smtpUser,
            pass: smtpPass
        }
    });
}

/**
 * Gera o Template HTML Dark Mode Responsivo para Entrega de Keys / Links
 */
export function generateKeyDeliveryEmailHtml(params: {
    customerName: string;
    orderId: string;
    productTitle: string;
    keyContent: string;
    isUrl?: boolean;
}): string {
    const { customerName, orderId, productTitle, keyContent, isUrl } = params;
    const discordUrl = 'https://discord.gg/2B8TQ7A3MV';
    const actionUrl = isUrl ? keyContent : `https://slenderhub.shop/claim?key=${encodeURIComponent(keyContent)}`;
    const actionText = isUrl ? '⚡ Acessar Link de Resgate' : '🔑 Copiar Key / Ativar';

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sua Key / Licença Slender Hub</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0e14;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0b0e14;
      padding: 30px 10px;
      box-sizing: border-box;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #161b22;
      border: 1px solid #2d3748;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
      padding: 32px 24px;
      text-align: center;
      border-bottom: 1px solid #3730a3;
    }
    .header h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 6px 0 0 0;
      font-size: 14px;
      color: #c7d2fe;
    }
    .body-content {
      padding: 32px 28px;
    }
    .greeting {
      font-size: 16px;
      color: #cbd5e1;
      margin-bottom: 20px;
    }
    .product-badge {
      display: inline-block;
      background-color: rgba(88, 101, 242, 0.15);
      border: 1px solid #5865F2;
      color: #818cf8;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .key-card {
      background: #0f172a;
      border: 1px dashed #6366f1;
      border-radius: 10px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
      position: relative;
    }
    .key-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #94a3b8;
      margin-bottom: 8px;
      font-weight: 700;
    }
    .key-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 20px;
      font-weight: 700;
      color: #38bdf8;
      background: #1e293b;
      padding: 12px 16px;
      border-radius: 6px;
      word-break: break-all;
      display: block;
      margin: 10px 0;
      border: 1px solid #334155;
    }
    .btn-action {
      display: inline-block;
      background-color: #5865F2;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      padding: 14px 28px;
      border-radius: 8px;
      margin-top: 14px;
      box-shadow: 0 4px 12px rgba(88, 101, 242, 0.4);
      transition: all 0.2s ease;
    }
    .instructions {
      background-color: #1e293b;
      border-left: 4px solid #5865F2;
      padding: 16px 20px;
      border-radius: 0 8px 8px 0;
      margin-top: 24px;
      font-size: 14px;
      color: #94a3b8;
    }
    .instructions ol {
      margin: 8px 0 0 0;
      padding-left: 20px;
    }
    .instructions li {
      margin-bottom: 6px;
      color: #cbd5e1;
    }
    .footer {
      background-color: #0f172a;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #1e293b;
      font-size: 13px;
      color: #64748b;
    }
    .footer a {
      color: #5865F2;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- Header -->
      <div class="header">
        <h1>Slender Hub</h1>
        <p>Confirmação de Pedido & Entrega Digital</p>
      </div>

      <!-- Body -->
      <div class="body-content">
        <div class="greeting">
          Olá, <strong>${customerName || 'Cliente'}</strong>! Obrigado por comprar no <strong>Slender Hub</strong>.
        </div>

        <div class="product-badge">
          Pedido #${orderId || 'SLENDER-ONLINE'}
        </div>

        <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">
          ${productTitle}
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Seu pagamento foi confirmado com sucesso. Abaixo está sua chave de licença / link de acesso exclusivo:
        </p>

        <!-- Key Highlight Box -->
        <div class="key-card">
          <div class="key-label">Sua Key / Código de Acesso</div>
          <div class="key-code">${keyContent}</div>
          <a href="${actionUrl}" target="_blank" class="btn-action">
            ${actionText}
          </a>
        </div>

        <!-- Instructions -->
        <div class="instructions">
          <strong style="color: #ffffff;">📌 Instruções de Resgate:</strong>
          <ol>
            <li>Copie a key exibida no painel acima.</li>
            <li>Acesse o nosso site ou script loader.</li>
            <li>Insira a chave no campo de licença/ativação.</li>
            <li>Caso precise de ajuda, entre no nosso servidor do Discord!</li>
          </ol>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p style="margin: 0 0 10px 0;">Dúvidas ou problemas com seu produto?</p>
        <p style="margin: 0;">
          <a href="${discordUrl}" target="_blank">💬 Entrar no Suporte Discord (Slender Hub)</a>
        </p>
        <p style="margin: 16px 0 0 0; font-size: 11px; color: #475569;">
          © ${new Date().getFullYear()} Slender Hub. Todos os direitos reservados.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
}

/**
 * Função utilitária para enviar e-mail de chave digital
 */
export async function sendDigitalDeliveryEmail(params: {
    toEmail: string;
    customerName: string;
    orderId: string;
    productTitle: string;
    keyContent: string;
}) {
    const transporter = getTransporter();
    const smtpUser = process.env.SMTP_EMAIL;

    const isUrl = params.keyContent.startsWith('http://') || params.keyContent.startsWith('https://');
    const htmlContent = generateKeyDeliveryEmailHtml({
        customerName: params.customerName,
        orderId: params.orderId,
        productTitle: params.productTitle,
        keyContent: params.keyContent,
        isUrl
    });

    if (!transporter || !smtpUser) {
        console.warn("[Email Service] SMTP não configurado. Simulando envio de e-mail de key digital...");
        console.log(`[SIMULADO] Para: ${params.toEmail} | Produto: ${params.productTitle} | Key: ${params.keyContent}`);
        return { success: true, simulated: true };
    }

    const mailOptions = {
        from: `"Slender Hub" <${smtpUser}>`,
        to: params.toEmail,
        subject: `[Slender Hub] Sua Key de Licença - ${params.productTitle}`,
        html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    return { success: true, simulated: false };
}

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const body = await request.json();
        const { contactEmail, customerName, totalValue, items, method } = body;

        const transporter = getTransporter();
        const smtpUser = process.env.SMTP_EMAIL;

        if (!transporter || !smtpUser) {
            console.warn("SMTP_EMAIL or SMTP_PASSWORD not set. Simulating email send...");
            console.log("Simulated Admin Alert:", { contactEmail, customerName, totalValue, method });
            console.log("Simulated Customer Email to:", contactEmail);
            
            return new Response(JSON.stringify({ success: true, simulated: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const itemsList = items.map((item: any) => `- ${item.title} x${item.quantity} ($${item.price})`).join('\n');

        const adminMailOptions = {
            from: smtpUser,
            to: process.env.ADMIN_EMAIL || 'slenderyt9@gmail.com',
            subject: `[SlenderHub] Nova Compra via ${method.toUpperCase()}!`,
            text: `Olá Admin!\n\nUma nova compra acabou de ser iniciada.\n\nDetalhes:\nComprador: ${customerName}\nE-mail de Contato: ${contactEmail}\nValor Total: $${totalValue}\nMétodo: ${method}\n\nItens Comprados:\n${itemsList}\n\nEntre no dashboard ou confira o chat para validar o pagamento e liberar o pedido.`
        };

        const customerMailOptions = {
            from: smtpUser,
            to: contactEmail,
            subject: `SlenderHub - Status do seu pedido`,
            text: `Olá ${customerName},\n\nObrigado pela sua compra!\n\nEnviaremos sua chave ou item em breve. Fique atento ao seu email ou se preferir nos contate no discord:\nhttps://discord.gg/2B8TQ7A3MV\n\nResumo do Pedido:\n${itemsList}\nTotal: $${totalValue}\n\nAtenciosamente,\nEquipe SlenderHub`
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

