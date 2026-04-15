
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
