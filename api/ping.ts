
// Runtime Node.js explícito: sem isso o Vercel 58+ compila a função como
// Edge e o bundle do namespace compartilhado pendura no runtime.
export const config = {
    runtime: 'nodejs',
};

export default async function handler(request: Request) {
    return new Response(JSON.stringify({ 
        success: true, 
        message: 'SlenderHub API is Online',
        timestamp: Date.now()
    }), {
        status: 200,
        headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
        }
    });
}
