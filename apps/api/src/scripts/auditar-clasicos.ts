import 'reflect-metadata';
import { rivalesDeclarados } from '@athena/domain';
import { PrismaClient } from '@athena/database';

/**
 * Comprueba que cada club nombrado en la tabla de clásicos exista de verdad.
 *
 * Es la única forma de equivocarse en `clasicos.ts` que no se nota nunca: un slug mal escrito no
 * rompe nada, solo hace que el clásico se caiga al último recurso —el club más grande de la liga—.
 * Trece de ciento once estaban así, y por eso el clásico de Melgar era Universitario.
 *
 * Recorre los slugs pidiéndoselos a `rivalesDeclarados`, que es la misma puerta que usa el juego.
 */
const CANDIDATOS = [
  'universitario', 'alianza-lima', 'sporting-cristal', 'fbc-melgar', 'cienciano',
  'cesar-vallejo', 'carlos-a-mannucci', 'boca-juniors', 'river-plate', 'racing-club',
  'independiente', 'san-lorenzo', 'huracan', 'rosario-central', 'newells-old-boys',
  'estudiantes-l-p', 'gimnasia-l-p', 'velez-sarsfield', 'ferro-carril-oeste', 'flamengo',
  'fluminense', 'corinthians', 'palmeiras', 'sao-paulo', 'santos', 'gremio', 'internacional',
  'atletico-mineiro', 'cruzeiro', 'botafogo', 'vasco-da-gama', 'colo-colo',
  'universidad-de-chile', 'universidad-catolica', 'penarol', 'nacional', 'millonarios',
  'santa-fe', 'atletico-nacional', 'independiente-medellin', 'america-de-cali', 'deportivo-cali',
  'barcelona-sc', 'emelec', 'ldu-de-quito', 'aucas', 'club-america', 'guadalajara-chivas',
  'cruz-azul', 'u-n-a-m-pumas', 'monterrey', 'tigres-uanl', 'liverpool', 'everton',
  'manchester-united', 'manchester-city', 'arsenal', 'tottenham', 'chelsea', 'newcastle',
  'sunderland', 'aston-villa', 'birmingham', 'west-ham', 'millwall', 'real-madrid', 'barcelona',
  'atletico-madrid', 'sevilla', 'real-betis', 'athletic-club', 'real-sociedad', 'valencia',
  'levante', 'celta-vigo', 'deportivo-la-coruna', 'ac-milan', 'inter', 'as-roma', 'lazio',
  'juventus', 'torino', 'napoli', 'genoa', 'sampdoria', 'borussia-dortmund', 'fc-schalke-04',
  'bayern-munchen', 'tsv-1860-munchen', 'hamburger-sv', 'werder-bremen', '1-fc-koln',
  'borussia-monchengladbach', 'paris-saint-germain', 'marseille', 'lyon', 'saint-etienne',
  'lille', 'lens', 'ajax', 'feyenoord', 'psv-eindhoven', 'benfica', 'fc-porto', 'sporting-cp',
  'los-angeles-galaxy', 'los-angeles-fc', 'seattle-sounders', 'portland-timbers',
  'new-york-red-bulls', 'new-york-city-fc',
];

/**
 * Clubes que la tabla nombra y que no están en nuestra base porque no cubrimos su liga. No son
 * errores: si algún día entran, el clásico empieza a funcionar solo. Se listan a mano para que el
 * aviso de "slug mal escrito" siga sirviendo, que es lo único que este script busca de verdad.
 */
const SIN_COBERTURA = new Set(['atletico-mineiro']);

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const declarados = CANDIDATOS.filter((slug) => rivalesDeclarados(slug).length > 0);
  const existen = new Set(
    (
      await prisma.team.findMany({
        where: { slug: { in: declarados } },
        select: { slug: true },
      })
    ).map((t) => t.slug),
  );

  const faltan = declarados.filter((slug) => !existen.has(slug));
  console.log(`${declarados.length} clubes con clásico declarado · ${faltan.length} sin equipo en la base`);

  /*
   * Faltar no siempre es un error. Un club puede no estar en nuestra base porque no cubrimos su
   * liga —Atlético Mineiro—, y ahí no hay nada que corregir. Lo que sí es un error es el slug mal
   * escrito, y se reconoce porque en la base hay uno parecido: `melgar` contra `fbc-melgar`.
   */
  let sospechosos = 0;
  for (const slug of faltan) {
    const ultima = slug.split('-').at(-1) ?? slug;
    const parecidos = await prisma.team.findMany({
      where: { slug: { contains: ultima } },
      select: { slug: true, name: true },
      orderBy: { relevancia: 'desc' },
      take: 2,
    });
    if (parecidos.length === 0 || SIN_COBERTURA.has(slug)) {
      console.log(`  ${slug.padEnd(28)} liga no cubierta, nada que corregir`);
      continue;
    }
    sospechosos++;
    console.log(`  ${slug.padEnd(28)} ¿será ${parecidos.map((p) => `${p.slug} (${p.name})`).join(' o ')}?`);
  }

  await prisma.$disconnect();
  if (sospechosos > 0) process.exitCode = 1;
}

void main();
