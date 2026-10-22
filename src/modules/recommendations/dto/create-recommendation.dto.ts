import { z } from 'zod';
import { EDITORIAS } from 'src/modules/books/editorias';

const objectId = (message: string) =>
  z.string({ message }).regex(/^[a-fA-F0-9]{24}$/, message);

export const createRecommendationSchema = z.object({
  episodeId: objectId('Selecione o episódio'),
  expertId: objectId('Selecione um especialista'),
  bookId: objectId('Selecione o livro'),
  editoria: z.enum(EDITORIAS, { message: 'Selecione o tipo de recomendação' }),
});

export type CreateRecommendationDto = z.infer<
  typeof createRecommendationSchema
>;
