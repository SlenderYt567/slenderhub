import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const apiDevPlugin = () => ({
    name: 'api-dev-plugin',
    configureServer(server: any) {
        server.middlewares.use(async (req: any, res: any, next: any) => {
            if (!req.url?.startsWith('/api/')) return next();

            const urlPath = req.url.split('?')[0];
            let relativeFilePath = `.${urlPath}.ts`;
            let filePath = path.resolve(__dirname, relativeFilePath);

            if (!fs.existsSync(filePath)) {
                const indexPath = path.resolve(__dirname, `.${urlPath}/index.ts`);
                if (fs.existsSync(indexPath)) {
                    relativeFilePath = `.${urlPath}/index.ts`;
                    filePath = indexPath;
                } else {
                    return next();
                }
            }

            try {
                // Parse body
                let rawBody = '';
                await new Promise<void>((resolve) => {
                    req.on('data', (chunk: any) => (rawBody += chunk));
                    req.on('end', resolve);
                });

                // Parse query params
                const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
                const query: Record<string, string> = {};
                new URLSearchParams(queryString).forEach((val, key) => { query[key] = val; });

                // Parse JSON body
                let body: any = {};
                if (rawBody) {
                    try { body = JSON.parse(rawBody); } catch { body = {}; }
                }

                // Build Express-style req/res shims
                const expressReq = {
                    method: req.method,
                    url: req.url,
                    headers: req.headers,
                    query,
                    body,
                };

                const headers: Record<string, string> = {};
                const expressRes = {
                    statusCode: 200,
                    status(code: number) { this.statusCode = code; return this; },
                    setHeader(k: string, v: string) { headers[k] = v; },
                    json(data: any) {
                        res.statusCode = this.statusCode;
                        res.setHeader('Content-Type', 'application/json');
                        Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
                        res.end(JSON.stringify(data));
                    },
                    send(data: any) {
                        res.statusCode = this.statusCode;
                        Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
                        res.end(typeof data === 'string' ? data : JSON.stringify(data));
                    },
                    end(data: any) {
                        res.statusCode = this.statusCode;
                        Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
                        res.end(data);
                    },
                };

                const handlerModule = await server.ssrLoadModule(relativeFilePath);
                const handler = handlerModule.default;

                if (handler) {
                    await handler(expressReq, expressRes);
                    return;
                }
            } catch (err: any) {
                console.error('[API Dev Plugin Error]:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Internal API error' }));
                return;
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

