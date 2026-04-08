/**
 * SlenderHub Lua Obfuscator Engine (Beta)
 * Fornece proteção básica: renomeação de variáveis, criptografia de strings e minificação.
 */

export const obfuscateLua = (code: string): string => {
  let result = code;

  // 1. Remover Comentários
  result = result.replace(/--\[\[[\s\S]*?\]\]/g, ''); // Comentários de bloco
  result = result.replace(/--.*$/gm, '');             // Comentários de linha

  // 2. Proteção de Strings (Hex Escape)
  // Converte "string" para "\x73\x74\x72\x69\x6e\x67"
  result = result.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, (match) => {
    const quote = match[0];
    const content = match.slice(1, -1);
    let escaped = '';
    for (let i = 0; i < content.length; i++) {
        escaped += '\\' + content.charCodeAt(i).toString(10).padStart(3, '0');
    }
    return `${quote}${escaped}${quote}`;
  });

  // 3. Renomeação de Variáveis Locais (Básico)
  // Encontra declarações 'local x' e substitui por nomes aleatórios
  const localVars = new Set<string>();
  const localRegex = /local\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match;
  while ((match = localRegex.exec(result)) !== null) {
    if (!['function', 'then', 'else', 'end', 'in', 'do', 'repeat', 'until', 'while', 'for', 'if'].includes(match[1])) {
        localVars.add(match[1]);
    }
  }

  const varMap = new Map<string, string>();
  localVars.forEach(v => {
    const randomName = 'slender_' + Math.random().toString(36).substring(2, 10);
    varMap.set(v, randomName);
  });

  // Substituir as variáveis (com cuidado para não pegar partes de outras palavras)
  varMap.forEach((newName, oldName) => {
    const regex = new RegExp(`\\b${oldName}\\b`, 'g');
    result = result.replace(regex, newName);
  });

  // 4. Minificação básica (remover quebras de linha e espaços extras)
  result = result.replace(/\s+/g, ' ').trim();

  // 5. Adicionar Header
  const header = `-- Obfuscated by SlenderHub (Beta)\n-- Date: ${new Date().toLocaleDateString()}\n`;
  
  return header + result;
};

export const generateLoader = (rawUrl: string): string => {
    return `-- SlenderHub Loader\nloadstring(game:HttpGet("${rawUrl}"))()`;
};
