
export const config = {
    runtime: 'nodejs',
};

// Runtime Node.js: o @vercel/node (Vercel 58+) espera assinatura (req, res).
// Handlers Web API (request: Request) crasham/penduram nesta versão da plataforma.
export default async function handler(req: any, res: any) {
    return res.status(200).json({
        success: true,
        message: 'SlenderHub API is Online',
        timestamp: Date.now()
    });
}
