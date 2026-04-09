# 🛠️ Skill: Estética Premium UI

Use esta skill para garantir que todos os novos componentes do SlenderHub mantenham o padrão "Elite".

## 💎 Card Glassmorphic Premium
```tsx
<div className="group relative rounded-3xl border border-slate-800 bg-slate-900/40 p-1 backdrop-blur-xl transition hover:border-blue-500/50">
    <div className="rounded-[22px] bg-slate-950 p-6">
        {/* Conteúdo aqui */}
    </div>
</div>
```

## 🚀 Botão de Ação com Gradiente
```tsx
<button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:scale-105 active:scale-95">
    <Zap className="h-5 w-5" />
    Começar Agora
</button>
```

## 🌊 Input Estilizado
```tsx
<div className="relative">
    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">Título</label>
    <input 
      type="text" 
      className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-white placeholder-gray-600 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50" 
      placeholder="Digite aqui..." 
    />
</div>
```

## 🎭 Badges Modernas
- **Padrão**: `rounded-full bg-slate-800 px-3 py-1 text-xs text-gray-400`.
- **Destaque**: `rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400 ring-1 ring-blue-500/20`.

## 💡 Regra de Ouro
Nunca use um preto puro `#000` se puder usar o Slate 950 `#020617`. A diferença na percepção de "luxo" é enorme.
