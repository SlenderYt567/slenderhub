export default async function handler(request: Request) {
    return new Response(JSON.stringify({ pong: true, timestamp: Date.now() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
