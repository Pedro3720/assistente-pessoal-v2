/**
 * Reordenação de tarefas com filtro ativo (sugestão 2).
 *
 * A coluna `tasks.position` é uma ordem GLOBAL por usuário. Quando a lista
 * está filtrada (por categoria ou por status), arrastar não pode reescrever a
 * lista inteira: a regra é permutar apenas as posições que os itens VISÍVEIS já
 * ocupavam na ordem global. Quem está escondido pelo filtro não se move.
 *
 *   antes:  [0]A  [1]casa-1  [2]B  [3]casa-2  [4]casa-3  [5]C
 *   visível: casa-1, casa-2, casa-3 (slots 1, 3 e 4)
 *   ação:   arrastar casa-3 para o topo da lista visível
 *   depois: [0]A  [1]casa-3  [2]B  [3]casa-1  [4]casa-2  [5]C
 *
 * Sem imports de propósito: é lógica pura, exercitável isolada.
 */
export function reorderWithinFilter<T extends { id: number }>(
  order: T[],
  shown: T[],
  activeId: number,
  overId: number
): T[] | null {
  if (activeId === overId) return null;

  const de = shown.findIndex((item) => item.id === activeId);
  const para = shown.findIndex((item) => item.id === overId);
  if (de < 0 || para < 0) return null;

  // Os slots que os visíveis ocupam na ordem global, em ordem crescente.
  const slots: number[] = [];
  for (const item of shown) {
    const slot = order.findIndex((o) => o.id === item.id);
    if (slot < 0) return null; // shown tem item que não está em order
    slots.push(slot);
  }
  slots.sort((a, b) => a - b);

  // Move dentro da lista visível, sem mutar a entrada.
  const movidos = [...shown];
  const [arrastado] = movidos.splice(de, 1);
  movidos.splice(para, 0, arrastado);

  // Escreve os visíveis de volta nos mesmos slots.
  const proxima = [...order];
  slots.forEach((slot, i) => {
    proxima[slot] = movidos[i];
  });

  // Rede de segurança: a lista global vai inteira para o servidor, então um id
  // perdido ou duplicado viraria perda de dado. Se acontecer, aborta.
  if (proxima.length !== order.length) return null;
  const antes = new Set(order.map((o) => o.id));
  const depois = new Set(proxima.map((o) => o.id));
  if (depois.size !== antes.size) return null;
  for (const id of antes) if (!depois.has(id)) return null;

  return proxima;
}
