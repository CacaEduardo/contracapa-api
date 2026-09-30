import { Logger, NotFoundException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import type { Connection, Model } from 'mongoose';
import { AppModule } from '../src/app.module';
import { slugify } from '../src/common/lib/slugify';
import { BooksService } from '../src/modules/books/books.service';
import type { Editoria } from '../src/modules/books/editorias';
import { CategoriesService } from '../src/modules/categories/categories.service';
import { ExpertsService } from '../src/modules/experts/experts.service';
import { ReviewsService } from '../src/modules/reviews/reviews.service';
import {
  Review,
  type ReviewDocument,
} from '../src/modules/reviews/schemas/review.schema';

// Dados de demonstração: categorias, 50 livros, 50 especialistas e 50 resenhas.
// Especialistas usam e-mails @example.com, que servem de marcador para não
// rodar duas vezes e para limpar depois.

const SEED_EMAIL_DOMAIN = '@example.com';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const CATEGORIES = [
  'Clássicos brasileiros',
  'Ensaio',
  'Ficção contemporânea',
  'Memórias',
  'Poesia',
  'Romance',
  'Literatura estrangeira',
  'Negócios',
  'Liderança',
  'Economia',
  'Psicologia',
  'Tecnologia',
  'Ciência',
  'História',
  'Filosofia',
  'Biografia',
];

type SeedBook = {
  title: string;
  author: string;
  year: number;
  pages: number;
  categories: string[];
  description: string;
};

const BOOKS: SeedBook[] = [
  {
    title: 'Vidas Secas',
    author: 'Graciliano Ramos',
    year: 1938,
    pages: 176,
    categories: ['Clássicos brasileiros', 'Romance'],
    description:
      'Uma família de retirantes atravessa o sertão em frases secas como o chão que pisa.',
  },
  {
    title: 'Memórias Póstumas de Brás Cubas',
    author: 'Machado de Assis',
    year: 1881,
    pages: 208,
    categories: ['Clássicos brasileiros', 'Romance'],
    description:
      'Um defunto autor revisita a própria vida com ironia e nenhuma piedade.',
  },
  {
    title: 'Dom Casmurro',
    author: 'Machado de Assis',
    year: 1899,
    pages: 256,
    categories: ['Clássicos brasileiros', 'Romance'],
    description:
      'Bentinho conta a história de Capitu e deixa ao leitor a dúvida mais famosa da literatura brasileira.',
  },
  {
    title: 'Grande Sertão: Veredas',
    author: 'João Guimarães Rosa',
    year: 1956,
    pages: 624,
    categories: ['Clássicos brasileiros', 'Romance'],
    description:
      'Riobaldo narra travessias, jagunços e o pacto que talvez nunca tenha feito.',
  },
  {
    title: 'A Hora da Estrela',
    author: 'Clarice Lispector',
    year: 1977,
    pages: 88,
    categories: ['Clássicos brasileiros', 'Romance'],
    description:
      'Macabéa, nordestina no Rio, vista por um narrador que duvida do próprio direito de narrá-la.',
  },
  {
    title: 'Tenda dos Milagres',
    author: 'Jorge Amado',
    year: 1969,
    pages: 368,
    categories: ['Clássicos brasileiros', 'Romance'],
    description:
      'Pedro Archanjo e a Bahia mestiça contra o racismo travestido de ciência.',
  },
  {
    title: 'O Cortiço',
    author: 'Aluísio Azevedo',
    year: 1890,
    pages: 272,
    categories: ['Clássicos brasileiros', 'Romance'],
    description:
      'Um cortiço carioca como organismo vivo, movido a ambição e sobrevivência.',
  },
  {
    title: 'Macunaíma',
    author: 'Mário de Andrade',
    year: 1928,
    pages: 224,
    categories: ['Clássicos brasileiros', 'Romance'],
    description:
      'O herói sem nenhum caráter atravessa o Brasil em rapsódia modernista.',
  },
  {
    title: 'Torto Arado',
    author: 'Itamar Vieira Junior',
    year: 2019,
    pages: 264,
    categories: ['Ficção contemporânea', 'Romance'],
    description:
      'Duas irmãs, uma faca e a terra que nunca foi de quem trabalha nela.',
  },
  {
    title: 'O Avesso da Pele',
    author: 'Jeferson Tenório',
    year: 2020,
    pages: 192,
    categories: ['Ficção contemporânea', 'Romance'],
    description:
      'Um filho reconstrói a vida do pai, professor negro morto em uma abordagem policial.',
  },
  {
    title: 'Tudo É Rio',
    author: 'Carla Madeira',
    year: 2014,
    pages: 210,
    categories: ['Ficção contemporânea', 'Romance'],
    description:
      'Um triângulo de amor, culpa e perdão contado em prosa de corredeira.',
  },
  {
    title: 'A Paixão Segundo G.H.',
    author: 'Clarice Lispector',
    year: 1964,
    pages: 176,
    categories: ['Romance', 'Filosofia'],
    description:
      'Uma mulher, uma barata e a desmontagem completa de quem ela achava que era.',
  },
  {
    title: 'Sentimento do Mundo',
    author: 'Carlos Drummond de Andrade',
    year: 1940,
    pages: 112,
    categories: ['Poesia'],
    description: 'Drummond sai do próprio quarto e encara o mundo em guerra.',
  },
  {
    title: 'Morte e Vida Severina',
    author: 'João Cabral de Melo Neto',
    year: 1955,
    pages: 96,
    categories: ['Poesia'],
    description:
      'O auto de Natal de um retirante que só encontra a morte pelo caminho.',
  },
  {
    title: 'Quarto de Despejo',
    author: 'Carolina Maria de Jesus',
    year: 1960,
    pages: 200,
    categories: ['Memórias'],
    description:
      'O diário da favela do Canindé escrito por quem catava papel para viver.',
  },
  {
    title: 'Minha Vida de Menina',
    author: 'Helena Morley',
    year: 1942,
    pages: 336,
    categories: ['Memórias'],
    description:
      'O diário de uma adolescente em Diamantina no fim do século XIX.',
  },
  {
    title: 'Raízes do Brasil',
    author: 'Sérgio Buarque de Holanda',
    year: 1936,
    pages: 256,
    categories: ['Ensaio', 'História'],
    description: 'O homem cordial e as heranças ibéricas que moldaram o país.',
  },
  {
    title: 'Casa-Grande & Senzala',
    author: 'Gilberto Freyre',
    year: 1933,
    pages: 728,
    categories: ['Ensaio', 'História'],
    description:
      'A formação da família brasileira sob o regime patriarcal, com todas as suas contradições.',
  },
  {
    title: 'Os Sertões',
    author: 'Euclides da Cunha',
    year: 1902,
    pages: 656,
    categories: ['Ensaio', 'História'],
    description: 'Canudos narrado como terra, homem e luta.',
  },
  {
    title: 'Cem Anos de Solidão',
    author: 'Gabriel García Márquez',
    year: 1967,
    pages: 448,
    categories: ['Literatura estrangeira', 'Romance'],
    description:
      'Sete gerações dos Buendía em Macondo, onde o extraordinário é rotina.',
  },
  {
    title: '1984',
    author: 'George Orwell',
    year: 1949,
    pages: 416,
    categories: ['Literatura estrangeira', 'Romance'],
    description:
      'Winston Smith contra o Grande Irmão e a reescrita permanente da verdade.',
  },
  {
    title: 'Crime e Castigo',
    author: 'Fiódor Dostoiévski',
    year: 1866,
    pages: 592,
    categories: ['Literatura estrangeira', 'Romance'],
    description:
      'Raskólnikov mata para provar uma teoria e passa o livro inteiro pagando por ela.',
  },
  {
    title: 'O Estrangeiro',
    author: 'Albert Camus',
    year: 1942,
    pages: 128,
    categories: ['Literatura estrangeira', 'Filosofia'],
    description:
      'Meursault e a indiferença que o tribunal não consegue perdoar.',
  },
  {
    title: 'Orgulho e Preconceito',
    author: 'Jane Austen',
    year: 1813,
    pages: 424,
    categories: ['Literatura estrangeira', 'Romance'],
    description:
      'Elizabeth Bennet, Mr. Darcy e a comédia afiada dos casamentos por conveniência.',
  },
  {
    title: 'A Metamorfose',
    author: 'Franz Kafka',
    year: 1915,
    pages: 104,
    categories: ['Literatura estrangeira'],
    description:
      'Gregor Samsa acorda inseto, e a família se preocupa primeiro com o aluguel.',
  },
  {
    title: 'Sapiens',
    author: 'Yuval Noah Harari',
    year: 2011,
    pages: 464,
    categories: ['História', 'Ciência'],
    description:
      'Uma breve história da humanidade contada a partir das ficções que nos fazem cooperar.',
  },
  {
    title: 'Rápido e Devagar',
    author: 'Daniel Kahneman',
    year: 2011,
    pages: 608,
    categories: ['Psicologia', 'Economia'],
    description:
      'Os dois sistemas do pensamento e os vieses que atrapalham as nossas decisões.',
  },
  {
    title: 'O Poder do Hábito',
    author: 'Charles Duhigg',
    year: 2012,
    pages: 408,
    categories: ['Psicologia', 'Negócios'],
    description: 'Gatilho, rotina e recompensa, do indivíduo às empresas.',
  },
  {
    title: 'Hábitos Atômicos',
    author: 'James Clear',
    year: 2018,
    pages: 320,
    categories: ['Psicologia'],
    description: 'Pequenas mudanças diárias e os sistemas que as sustentam.',
  },
  {
    title: 'A Startup Enxuta',
    author: 'Eric Ries',
    year: 2011,
    pages: 288,
    categories: ['Negócios', 'Tecnologia'],
    description:
      'Construir, medir e aprender: o método para empreender sob incerteza.',
  },
  {
    title: 'De Zero a Um',
    author: 'Peter Thiel',
    year: 2014,
    pages: 240,
    categories: ['Negócios', 'Tecnologia'],
    description:
      'Por que monopólios criativos constroem o futuro e a concorrência não.',
  },
  {
    title: 'Empresas Feitas para Vencer',
    author: 'Jim Collins',
    year: 2001,
    pages: 368,
    categories: ['Negócios', 'Liderança'],
    description:
      'O que separa empresas boas das excelentes, segundo uma pesquisa de cinco anos.',
  },
  {
    title: 'O Lado Difícil das Situações Difíceis',
    author: 'Ben Horowitz',
    year: 2014,
    pages: 320,
    categories: ['Negócios', 'Liderança'],
    description: 'Gestão de startups quando não existe resposta fácil.',
  },
  {
    title: 'A Estratégia do Oceano Azul',
    author: 'W. Chan Kim e Renée Mauborgne',
    year: 2005,
    pages: 288,
    categories: ['Negócios'],
    description: 'Criar mercados novos em vez de disputar os saturados.',
  },
  {
    title: 'O Dilema da Inovação',
    author: 'Clayton M. Christensen',
    year: 1997,
    pages: 320,
    categories: ['Negócios', 'Tecnologia'],
    description:
      'Por que empresas bem geridas perdem para tecnologias disruptivas.',
  },
  {
    title: 'Pai Rico, Pai Pobre',
    author: 'Robert T. Kiyosaki',
    year: 1997,
    pages: 336,
    categories: ['Economia'],
    description:
      'Lições de finanças pessoais contadas por meio de dois pais imaginários.',
  },
  {
    title: 'O Segredo',
    author: 'Rhonda Byrne',
    year: 2006,
    pages: 216,
    categories: ['Psicologia'],
    description: 'A lei da atração como promessa de sucesso pelo pensamento.',
  },
  {
    title: 'Quem Mexeu no Meu Queijo?',
    author: 'Spencer Johnson',
    year: 1998,
    pages: 112,
    categories: ['Negócios'],
    description: 'Uma fábula corporativa sobre como lidar com mudanças.',
  },
  {
    title: 'Os 7 Hábitos das Pessoas Altamente Eficazes',
    author: 'Stephen R. Covey',
    year: 1989,
    pages: 432,
    categories: ['Liderança', 'Psicologia'],
    description: 'Princípios de efetividade pessoal e interpessoal.',
  },
  {
    title: 'Mindset',
    author: 'Carol S. Dweck',
    year: 2006,
    pages: 312,
    categories: ['Psicologia'],
    description: 'Mentalidade fixa contra mentalidade de crescimento.',
  },
  {
    title: 'Freakonomics',
    author: 'Steven D. Levitt e Stephen J. Dubner',
    year: 2005,
    pages: 336,
    categories: ['Economia'],
    description: 'Incentivos escondidos por trás de perguntas improváveis.',
  },
  {
    title: 'A Riqueza das Nações',
    author: 'Adam Smith',
    year: 1776,
    pages: 1064,
    categories: ['Economia', 'História'],
    description:
      'Divisão do trabalho, mercado e a origem da economia política moderna.',
  },
  {
    title: 'O Capital no Século XXI',
    author: 'Thomas Piketty',
    year: 2013,
    pages: 672,
    categories: ['Economia'],
    description:
      'Três séculos de dados sobre renda, patrimônio e desigualdade.',
  },
  {
    title: 'Steve Jobs',
    author: 'Walter Isaacson',
    year: 2011,
    pages: 624,
    categories: ['Biografia', 'Tecnologia'],
    description:
      'A biografia autorizada do fundador da Apple, com luz e sombra.',
  },
  {
    title: 'Meditações',
    author: 'Marco Aurélio',
    year: 180,
    pages: 256,
    categories: ['Filosofia'],
    description: 'As anotações estoicas de um imperador para si mesmo.',
  },
  {
    title: 'O Mundo de Sofia',
    author: 'Jostein Gaarder',
    year: 1991,
    pages: 568,
    categories: ['Filosofia', 'Literatura estrangeira'],
    description:
      'A história da filosofia contada a uma adolescente por cartas misteriosas.',
  },
  {
    title: 'Uma Breve História do Tempo',
    author: 'Stephen Hawking',
    year: 1988,
    pages: 256,
    categories: ['Ciência'],
    description: 'Do Big Bang aos buracos negros, sem equações.',
  },
  {
    title: 'O Gene Egoísta',
    author: 'Richard Dawkins',
    year: 1976,
    pages: 544,
    categories: ['Ciência'],
    description: 'A evolução vista do ponto de vista do gene.',
  },
  {
    title: 'Antifrágil',
    author: 'Nassim Nicholas Taleb',
    year: 2012,
    pages: 616,
    categories: ['Economia', 'Filosofia'],
    description: 'Coisas que se beneficiam do caos, e como ser uma delas.',
  },
  {
    title: 'Trabalho Focado',
    author: 'Cal Newport',
    year: 2016,
    pages: 304,
    categories: ['Tecnologia', 'Psicologia'],
    description: 'Concentração profunda como vantagem num mundo distraído.',
  },
];

// Índices em BOOKS agrupados pelo papel mais provável em cada editoria.
const MARKET_POOL = [
  25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 38, 39, 40, 42, 43, 48, 49,
];
const OFF_MARKET_POOL = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  22, 23, 24, 41, 44, 45, 46, 47,
];
const DO_NOT_READ_POOL = [35, 36, 37, 38, 28, 41, 21, 6, 33, 39];

const FIRST_NAMES = [
  'Ana',
  'Bruno',
  'Camila',
  'Diego',
  'Eduarda',
  'Felipe',
  'Gabriela',
  'Henrique',
  'Isabela',
  'João',
  'Larissa',
  'Marcelo',
  'Natália',
  'Otávio',
  'Paula',
  'Rafael',
  'Sofia',
  'Tiago',
  'Úrsula',
  'Vinícius',
  'Yasmin',
  'Lucas',
  'Beatriz',
  'Caio',
  'Débora',
];
const LAST_NAMES = [
  'Albuquerque',
  'Barreto',
  'Cardoso',
  'Duarte',
  'Esteves',
  'Figueiredo',
  'Guimarães',
  'Holanda',
  'Leitão',
  'Macedo',
  'Nogueira',
  'Pacheco',
  'Queiroz',
  'Rezende',
  'Sampaio',
  'Teixeira',
  'Valadares',
  'Xavier',
  'Moraes',
  'Brandão',
];
const COMPANIES = [
  'Editora Arquipélago',
  'Consultoria Norte Claro',
  'Instituto Travessia',
  'Revista Margem',
  'Laboratório Página Viva',
  'Fundo Horizonte Capital',
  'Escola Paralela',
  'Grupo Ateliê Digital',
  'Livraria Sebo Azul',
  'Podcast Estante Aberta',
];
const SOCIAL_NETWORKS = [
  'instagram',
  'linkedin',
  'x',
  'youtube',
  'tiktok',
  'website',
] as const;

const TITLE_TEMPLATES = [
  (book: string) => `O que ${book} ainda ensina`,
  (book: string) => `Por que voltar a ${book}`,
  (book: string) => `${book} e o preço da pressa`,
  () => 'Três livros para esta estação',
  () => 'Quando o best-seller não basta',
  (book: string) => `Fora da vitrine: ${book}`,
  () => 'O que deixar na prateleira',
  (book: string) => `A leitura que ${book} pede`,
  () => 'Leituras para quem decide',
  (book: string) => `Entre o mercado e ${book}`,
];

const EDITORIA_TEXT: Record<Editoria, (book: SeedBook) => string> = {
  market: (book) =>
    `<p>Para quem precisa entender o jogo agora, ${book.title}, de ${book.author}, é leitura obrigatória. O livro organiza ideias que circulam em reuniões e conselhos e dá vocabulário para discuti-las com precisão.</p>`,
  off_market: (book) =>
    `<p>Fora do radar do mercado, ${book.title}, de ${book.author}, entrega o que nenhum manual entrega: repertório, silêncio e uma forma diferente de olhar para as pessoas. É o livro que eu daria a quem acha que já leu tudo.</p>`,
  do_not_read: (book) =>
    `<p>Já ${book.title}, de ${book.author}, fica na estante. A promessa é maior do que o conteúdo, e o tempo gasto rende mais em qualquer outra leitura desta lista.</p>`,
};

const EXCERPT_TEMPLATES = [
  'Uma conversa sobre o que vale o tempo de quem lê pouco e decide muito.',
  'Três indicações, uma provocação: nem todo livro famoso merece a sua próxima semana.',
  'Uma seleção que mistura o que o mercado discute com o que ele deveria ler.',
  'O que ler, o que reler e o que deixar de lado, com argumentos.',
  'Leituras escolhidas para atravessar a próxima estação com mais repertório.',
];

const pick = <T>(pool: T[], index: number) => pool[index % pool.length];

// Combinações de editorias alternadas para variar a quantidade de indicações.
const EDITORIA_PATTERNS: Editoria[][] = [
  ['market', 'off_market', 'do_not_read'],
  ['market', 'off_market'],
  ['off_market'],
  ['market', 'do_not_read'],
  ['off_market', 'do_not_read'],
];

async function bootstrap() {
  const logger = new Logger('SeedCatalog');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const connection = app.get<Connection>(getConnectionToken());
    const categoriesService = app.get(CategoriesService);
    const booksService = app.get(BooksService);
    const expertsService = app.get(ExpertsService);
    const reviewsService = app.get(ReviewsService);
    const reviewModel = app.get<Model<ReviewDocument>>(
      getModelToken(Review.name),
    );

    const unmigrated = await connection
      .db!.collection('books')
      .countDocuments({ active: { $exists: false } });

    if (unmigrated > 0) {
      logger.error(
        'Banco ainda no modelo antigo. Rode `yarn reset:reviews` antes do seed.',
      );
      return;
    }

    const alreadySeeded = await expertsService.findAll({
      q: SEED_EMAIL_DOMAIN,
    });

    if (alreadySeeded.length > 0) {
      logger.warn(
        'Seed já aplicado (há especialistas @example.com); nada foi feito.',
      );
      return;
    }

    const existingCategories = await categoriesService.findAll();
    const categorySlugByName = new Map(
      existingCategories.map((category) => [category.name, category.slug]),
    );

    for (const name of CATEGORIES) {
      if (!categorySlugByName.has(name)) {
        const created = await categoriesService.create({ name });
        categorySlugByName.set(name, created.slug);
      }
    }
    logger.log(`Categorias prontas: ${categorySlugByName.size}.`);

    const bookIds: string[] = [];
    for (const book of BOOKS) {
      const categorySlugs = book.categories.map((name) =>
        categorySlugByName.get(name)!,
      );

      try {
        // Reaproveita livros que já existem com o mesmo título.
        const existing = await booksService.findBySlugAdmin(
          slugify(book.title),
        );
        bookIds.push(existing._id);
      } catch (error) {
        if (!(error instanceof NotFoundException)) throw error;

        const created = await booksService.create({
          title: book.title,
          author: book.author,
          description: book.description,
          year: book.year,
          pages: book.pages,
          amazonUrl: `https://www.amazon.com.br/s?k=${encodeURIComponent(book.title)}`,
          categorySlugs,
        });
        bookIds.push(created._id);
      }
    }
    logger.log(`Livros prontos: ${bookIds.length}.`);

    const expertIds: string[] = [];
    for (let index = 0; index < 50; index += 1) {
      const firstName = pick(FIRST_NAMES, index);
      const lastName = pick(LAST_NAMES, index * 3 + Math.floor(index / 20));
      const fullName = `${firstName} ${lastName}`;
      const handle = `${slugify(firstName)}.${slugify(lastName)}.${index + 1}`;
      const network = pick([...SOCIAL_NETWORKS], index);

      const expert = await expertsService.create({
        fullName,
        email: `${handle}${SEED_EMAIL_DOMAIN}`,
        company: pick(COMPANIES, index),
        phone: null,
        podcastUrl: `https://open.spotify.com/show/contracapa-${handle}`,
        socialLinks: [
          { network, url: `https://example.com/${network}/${handle}` },
        ],
      });
      expertIds.push(expert._id);
    }
    logger.log(`Especialistas criados: ${expertIds.length}.`);

    const now = Date.now();
    for (let index = 0; index < 50; index += 1) {
      const editorias = pick(EDITORIA_PATTERNS, index);
      const pools: Record<Editoria, number[]> = {
        market: MARKET_POOL,
        off_market: OFF_MARKET_POOL,
        do_not_read: DO_NOT_READ_POOL,
      };
      const indications = editorias.map((editoria, position) => ({
        editoria,
        bookIndex: pick(pools[editoria], index * 7 + position * 3),
      }));
      const [lead] = indications;
      const leadBook = BOOKS[lead.bookIndex];
      const title = pick(TITLE_TEMPLATES, index)(leadBook.title);

      const review = await reviewsService.create({
        expertId: expertIds[index],
        editorialTitle: title,
        excerpt: pick(EXCERPT_TEMPLATES, index),
        content: [
          `<h2>${title}</h2>`,
          ...indications.map(({ editoria, bookIndex }) =>
            EDITORIA_TEXT[editoria](BOOKS[bookIndex]),
          ),
        ].join(''),
        indications: indications.map(({ editoria, bookIndex }) => ({
          editoria,
          bookId: bookIds[bookIndex],
        })),
        weekly: index === 49,
        podcast: {
          spotify: `https://open.spotify.com/episode/contracapa-${index + 1}`,
          youtube: `https://www.youtube.com/watch?v=contracapa${index + 1}`,
        },
      });

      // Espalha as datas de publicação pelas últimas 50 semanas.
      await reviewModel
        .updateOne(
          { _id: review._id },
          { publishedAt: new Date(now - (49 - index) * WEEK_MS) },
        )
        .exec();
    }
    logger.log('Resenhas criadas: 50 (a última é a resenha da semana).');
  } finally {
    await app.close();
  }
}

void bootstrap();
