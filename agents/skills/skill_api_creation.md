# 🛠️ Skill: Integrar Nova API (Vercel + Supabase)

Use esta skill para criar novos endpoints de backend no SlenderHub.

## Passo 1: Criar o Arquivo
Crie o arquivo em `api/nome-da-api.ts`.
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Post only' }), { status: 405 });
    }

    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    // Lógica aqui...

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
```

## Passo 2: Configurar Variáveis de Ambiente
Certifique-se de que a Vercel possui:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (Se for op administrativa)
- `SMTP_PASS` / `SMTP_USER` (Se for envio de email)

## Passo 3: Registrar no vercel.json
Se a API for colocada em uma subpasta como `api/keys/`, garanta que o rewrite global do `vercel.json` cubra isso:
`{ "source": "/api/(.*)", "destination": "/api/$1" }`

## Passo 4: Chamada no Frontend
Use o `fetch` padrão apontando para `/api/nome-da-api`:
```tsx
const response = await fetch('/api/nome-da-api', {
    method: 'POST',
    body: JSON.stringify({ data: 'exemplo' })
});
```
