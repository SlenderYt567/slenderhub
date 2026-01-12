# Guia de Deploy na Vercel

Este guia explica como fazer o deploy do Slender Hub na Vercel.

## Pré-requisitos
- Conta na Vercel (https://vercel.com)
- Repositório GitHub já configurado

## Passos para Deploy

### 1. Conectar o Repositório na Vercel
1. Acesse https://vercel.com e faça login
2. Clique em "Add New Project"
3. Selecione "Import Git Repository"
4. Escolha o repositório `SlenderYt567/slenderhub`
5. Clique em "Import"

### 2. Configurar Variáveis de Ambiente
Na página de configuração do projeto, adicione as seguintes variáveis de ambiente:

**Environment Variables:**
```
VITE_SUPABASE_URL=https://rrqzpzczhvzrrdsjzqgb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJycXpwemN6aHZ6cnJkc2p6cWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjUxNjEsImV4cCI6MjA4Mzc0MTE2MX0.9iMKLDpfwRDM1vP4gEV5IsS1rA4bNsRk08MzW0FAOxM
```

### 3. Configurações de Build
A Vercel deve detectar automaticamente as configurações do `vercel.json`:
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### 4. Deploy
1. Clique em "Deploy"
2. Aguarde o build completar (geralmente 1-2 minutos)
3. Após o deploy, você receberá uma URL como `https://slenderhub.vercel.app`

## Configuração do Supabase (Importante!)

Após o deploy, você precisa adicionar o domínio da Vercel nas configurações do Supabase:

1. Acesse o dashboard do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto `Slender Hub`
3. Vá em **Authentication** → **URL Configuration**
4. Adicione a URL da Vercel em **Site URL** e **Redirect URLs**:
   - `https://seu-projeto.vercel.app`
   - `https://seu-projeto.vercel.app/**`

## Atualizações Futuras

Para fazer deploy de novas alterações:
1. Faça commit e push das mudanças para o GitHub:
   ```bash
   git add .
   git commit -m "Descrição das mudanças"
   git push origin main
   ```
2. A Vercel fará o deploy automaticamente!

## Troubleshooting

### Erro de autenticação do Supabase
- Verifique se as variáveis de ambiente estão configuradas corretamente
- Confirme que o domínio da Vercel está nas configurações do Supabase

### Build falhou
- Verifique os logs de build na Vercel
- Certifique-se de que todas as dependências estão no `package.json`
