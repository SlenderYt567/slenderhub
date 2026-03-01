export const config = {
    runtime: 'edge',
};

export default async function handler(request: Request) {
    // Pega o header User-Agent da requisição
    const userAgent = request.headers.get('user-agent') || '';

    // Verifica se a requisição está vindo do cliente Roblox
    const isRoblox = userAgent.toLowerCase().includes('roblox');

    if (!isRoblox) {
        // Bloqueia acessos no navegador ou outros testadores HTTP
        return new Response('ERRO: Você não pode acessar o código aberto desse script.', {
            status: 403,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    }

    // URL RAW do Script Protegido no GitHub
    const SCRIPT_RAW_URL = 'https://raw.githubusercontent.com/SlenderYt567/sc/refs/heads/main/SlenderHub%20Script';

    try {
        const fetchResponse = await fetch(SCRIPT_RAW_URL, {
            // Se o repo for privado você pode mandar um token de autorização
            // headers: { 'Authorization': `token SEU_TOKEN_AQUI` }
        });

        if (!fetchResponse.ok) {
            return new Response('-- Falha ao obter o script no servidor.', { status: 500 });
        }

        const scriptContent = await fetchResponse.text();

        // Retorna o conteúdo do script em texto plano
        return new Response(scriptContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
            },
        });

    } catch (error) {
        console.error('Erro na Fetch:', error);
        return new Response('-- Ocorreu um erro interno no servidor ao obter o script.', { status: 500 });
    }
}
