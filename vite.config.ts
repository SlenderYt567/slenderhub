import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const apiDevPlugin = () => ({
    name: 'api-dev-plugin',
    configureServer(server: any) {
        server.middlewares.use(async (req: any, res: any, next: any) => {
            if (req.url && req.url.startsWith('/api/')) {
                const urlPath = req.url.split('?')[0];
                let relativeFilePath = `.${urlPath}.ts`;
                
                // Tratar se for pasta index ou se o arquivo existir
                let filePath = path.resolve(__dirname, relativeFilePath);
                if (!fs.existsSync(filePath) && fs.existsSync(path.resolve(__dirname, `.${urlPath}/index.ts`))) {
                    relativeFilePath = `.${urlPath}/index.ts`;
                    filePath = path.resolve(__dirname, relativeFilePath);
                }

                if (fs.existsSync(filePath)) {
                    try {
                        let body = '';
                        req.on('data', (chunk: any) => body += chunk);
                        await new Promise(resolve => req.on('end', resolve));

                        const handlerModule = await server.ssrLoadModule(relativeFilePath);
                        const handler = handlerModule.default;

                        if (handler) {
                            const fetchRequest = new Request(`http://localhost:3000${req.url}`, {
                                method: req.method,
                                headers: req.headers,
                                body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? body : undefined
                            });

                            const response = await handler(fetchRequest);
                            res.statusCode = response.status;

                            response.headers.forEach((val: string, key: string) => {
                                res.setHeader(key, val);
                            });

                            const responseText = await response.text();
                            res.end(responseText);
                            return;
                        }
                    } catch (err: any) {
                        console.error('[API Dev Plugin Error]:', err);
                        res.statusCode = 500;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ error: err.message || 'Erro no servidor de API local' }));
                        return;
                    }
                }
            }
            next();
        });
    }
});

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
        server: {
            port: 3000,
            host: '0.0.0.0',
        },
        plugins: [react(), apiDevPlugin()],
        define: {
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            }
        }
    };
});

