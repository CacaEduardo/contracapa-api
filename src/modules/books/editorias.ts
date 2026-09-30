export const EDITORIAS = ['market', 'off_market', 'do_not_read'] as const;

export type Editoria = (typeof EDITORIAS)[number];

// Livro de Mercado e Livro de Fora de Mercado recomendam; Livro pra Não Ler desrecomenda.
export const isRecommendation = (editoria: Editoria): boolean =>
  editoria !== 'do_not_read';
