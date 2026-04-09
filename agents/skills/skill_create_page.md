# 🛠️ Skill: Criar Nova Página (Aba)

Use esta skill para adicionar funcionalidades completas ao SlenderHub.

## Passo 1: Criar o Componente de Página
Crie o arquivo em `src/pages/NovaPagina.tsx`. Use o padrão Premium Dark Mode:
```tsx
import React from 'react';
const NovaPagina: React.FC = () => (
  <div className="mx-auto max-w-7xl px-4 py-12">
    <h1 className="text-3xl font-bold mb-8">Título da Página</h1>
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
      {/* Conteúdo */}
    </div>
  </div>
);
export default NovaPagina;
```

## Passo 2: Registrar no App.tsx
1. Importe a página no topo do `App.tsx`:
   `import NovaPagina from './pages/NovaPagina';`
2. Adicione a rota no componente `<Routes>`:
   `<Route path="/nome-da-rota" element={<NovaPagina />} />`

## Passo 3: Adicionar ao Navbar.tsx
Se a página for para usuários logados ou admin:
1. Localize o bloco `isAuthenticated` ou `isAdmin`.
2. Adicione o componente `<Link>`:
   ```tsx
   <Link to="/nome-da-rota" className={isActive('/nome-da-rota')}>
     Minha Nova Aba
   </Link>
   ```

## Passo 4: Registrar no vercel.json (Opcional)
Se a página precisar de rewrite de spa:
O padrão `{ "source": "/(.*)", "destination": "/index.html" }` já cobre a maioria, mas verifique se há exceções.
