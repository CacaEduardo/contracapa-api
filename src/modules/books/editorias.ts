export const EDITORIAS = ['market', 'off_market', 'disrecommended'] as const;

export type Editoria = (typeof EDITORIAS)[number];

// Livro de mercado e livro fora de mercado recomendam; desrecomendado não.
export const isRecommendation = (editoria: Editoria): boolean =>
  editoria !== 'disrecommended';
