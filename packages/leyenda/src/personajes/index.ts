/**
 * Los nombres del mundo: técnicos, compañeros y periodistas.
 *
 * Todos **ficticios**, con nombres verosímiles de cada región para que la carrera suene al lugar
 * donde ocurre: un técnico argentino no se llama igual que uno japonés y el juego se nota. No hay
 * personas reales acá y nunca puede haberlas: el juego inventa polémicas, y una polémica inventada
 * sobre alguien que existe no es un juego, es una calumnia.
 */
import { elegir, type Azar } from '../azar.js';

interface Repertorio {
  tecnicos: string[];
  companeros: string[];
  periodistas: string[];
  /** Figuras del espectáculo para los eventos sociales, también inventadas. */
  figuras: string[];
}

const RIOPLATENSE: Repertorio = {
  tecnicos: ['Rubén Ottaviani', 'Hugo Ferrari', 'Daniel Bertone', 'Alberto Sanguinetti', 'Néstor Cabral'],
  companeros: ['Mauro Vidal', 'Emiliano Sosa', 'Nahuel Ferreyra', 'Bruno Cáceres', 'Iván Peralta', 'Damián Roldán'],
  periodistas: ['Cacho Aguirre', 'Marisa Ledesma', 'Julián Bonavena', 'Silvia Ocampo'],
  figuras: ['Lola Renzi', 'Tato Miranda', 'la banda Los Pibes del Fondo'],
};

const ANDINO: Repertorio = {
  tecnicos: ['Wilfredo Palacios', 'Óscar Zambrano', 'Julio Cépeda', 'Marco Quintanilla', 'Édgar Tapia'],
  companeros: ['Jhoan Vílchez', 'Piero Salazar', 'Álex Huamán', 'Cristhian Bazán', 'Renzo Mendoza', 'Diego Chávez'],
  periodistas: ['Coco Barrios', 'Fiorella Ramos', 'Aldo Ninahuanca', 'Lucía Ferrand'],
  figuras: ['Kiara del Solar', 'el grupo Sabor Norteño', 'Beto Palomino'],
};

const BRASILENO: Repertorio = {
  tecnicos: ['Vanderlei Prado', 'Roberto Assis Neto', 'Jorge Meireles', 'Cláudio Fontana', 'Ademir Souza'],
  companeros: ['Ruan Teixeira', 'Wesley Pimenta', 'Kauã Nogueira', 'Léo Marchetti', 'Everton Bastos', 'Dedé Ramalho'],
  periodistas: ['Ronaldo Vasques', 'Bia Camargo', 'Milton Zoccola', 'Fernanda Rios'],
  figuras: ['Nayara Lins', 'MC Robinho', 'la cantante Duda Salles'],
};

const IBERICO: Repertorio = {
  tecnicos: ['Íñigo Aldecoa', 'Ramón Sanchís', 'Quique Berruezo', 'Aitor Egaña', 'Manuel Colomer'],
  companeros: ['Unai Arrieta', 'Sergio Lacalle', 'Nacho Berenguer', 'Pau Sunyer', 'Álvaro Iglesias', 'Iker Ruano'],
  periodistas: ['Chema Villalba', 'Marta Otxoa', 'Paco Redondo', 'Lucía Ibarrola'],
  figuras: ['Vera Montoro', 'el cantante Rulo Sanz', 'la actriz Nagore Elizalde'],
};

const ANGLOSAJON: Repertorio = {
  tecnicos: ['Graham Whitlock', 'Dermot Kelleher', 'Alan Prentice', 'Neil Bracewell', 'Colin Rutter'],
  companeros: ['Jamie Thornton', 'Kwame Boateng', 'Callum Reid', 'Ollie Marsden', 'Tyrese Adeyemi', 'Fraser Doyle'],
  periodistas: ['Piers Halloway', 'Nadia Whitcombe', 'Gary Ellwood', 'Sonia Vance'],
  figuras: ['la cantante Ivy Mercer', 'el presentador Danny Croft', 'la modelo Elise Harrow'],
};

const CENTROEUROPEO: Repertorio = {
  tecnicos: ['Bernd Kastner', 'Thibaut Lemoine', 'Marco Bellotti', 'Wim Grootveld', 'Rui Bragança'],
  companeros: ['Lukas Wendler', 'Théo Marchand', 'Andrea Pastore', 'Sven de Boer', 'Tomás Almeida', 'Jonas Reuter'],
  periodistas: ['Klaus Lehner', 'Camille Vasseur', 'Gigi Rondinelli', 'Anouk Verhoeven'],
  figuras: ['la dj Mila Neuner', 'el actor Bastien Rey', 'la cantante Giada Lonardi'],
};

const NORTEAMERICANO: Repertorio = {
  tecnicos: ['Brad Kowalski', 'Miguel Ordaz', 'Steve Halvorsen', 'Ernesto Villalobos', 'Ryan Duquette'],
  companeros: ['Tyler Brooks', 'Ángel Zepeda', 'Josh Kimura', 'Cristian Molina', 'Devin Okafor', 'Iker Fuentes'],
  periodistas: ['Chad Mullen', 'Rosa Camarena', 'Kevin Astorga', 'Dana Whitfield'],
  figuras: ['la cantante Kendra Boone', 'el rapero Lil Zepeda', 'la actriz Paloma Reyes'],
};

const ASIATICO: Repertorio = {
  tecnicos: ['Kenji Morisawa', 'Fahad Al-Sabti', 'Hideo Tsukamoto', 'Nasser Bilal', 'Ryo Kadowaki'],
  companeros: ['Sho Nakagawa', 'Yusuf Rashad', 'Daichi Kurosawa', 'Omar Halabi', 'Ren Fujimoto', 'Tariq Nouri'],
  periodistas: ['Aya Shimizu', 'Zayd Marwan', 'Takeshi Ono', 'Layla Karam'],
  figuras: ['la idol Miku Sarashina', 'el actor Basel Zahra', 'la cantante Hina Torii'],
};

const AFRICANO: Repertorio = {
  tecnicos: ['Tarek El Masry', 'Kofi Mensah', 'Youssef Bennani', 'Sipho Dlamini', 'Amadou Diallo'],
  companeros: ['Ismail Farouk', 'Chika Nwosu', 'Karim Zoghbi', 'Thabo Mokoena', 'Lamine Ba', 'Hakim Toure'],
  periodistas: ['Hany Abdel', 'Grace Achieng', 'Rachid Belkacem', 'Nomsa Khumalo'],
  figuras: ['la cantante Amina Zerrouk', 'el músico Femi Balogun', 'la actriz Zola Mahlangu'],
};

/** El repertorio se elige por país y, si no está, por continente. */
const POR_PAIS: Record<string, Repertorio> = {
  AR: RIOPLATENSE,
  UY: RIOPLATENSE,
  PE: ANDINO,
  BO: ANDINO,
  EC: ANDINO,
  CO: ANDINO,
  CL: ANDINO,
  VE: ANDINO,
  BR: BRASILENO,
  ES: IBERICO,
  PT: CENTROEUROPEO,
  'GB-ENG': ANGLOSAJON,
  'GB-SCT': ANGLOSAJON,
  IE: ANGLOSAJON,
  DE: CENTROEUROPEO,
  FR: CENTROEUROPEO,
  IT: CENTROEUROPEO,
  NL: CENTROEUROPEO,
  BE: CENTROEUROPEO,
  US: NORTEAMERICANO,
  CA: NORTEAMERICANO,
  MX: NORTEAMERICANO,
  JP: ASIATICO,
  KR: ASIATICO,
  SA: ASIATICO,
  AE: ASIATICO,
  QA: ASIATICO,
  EG: AFRICANO,
  MA: AFRICANO,
  ZA: AFRICANO,
  NG: AFRICANO,
};

const POR_CONTINENTE: Record<string, Repertorio> = {
  sudamerica: ANDINO,
  europa: CENTROEUROPEO,
  norteamerica: NORTEAMERICANO,
  asia: ASIATICO,
  africa: AFRICANO,
  oceania: ANGLOSAJON,
  mundial: CENTROEUROPEO,
};

export function repertorioDe(paisCodigo: string | null, continente: string): Repertorio {
  if (paisCodigo && POR_PAIS[paisCodigo]) return POR_PAIS[paisCodigo] as Repertorio;
  return (POR_CONTINENTE[continente] ?? CENTROEUROPEO) as Repertorio;
}

export interface Elenco {
  dt: string;
  companeros: string[];
  periodista: string;
  figura: string;
}

/** El elenco de un club: se sortea al llegar y vive mientras dure el paso por ese club. */
export function elencoDe(azar: Azar, paisCodigo: string | null, continente: string): Elenco {
  const repertorio = repertorioDe(paisCodigo, continente);
  const companeros: string[] = [];
  while (companeros.length < 3) {
    const nombre = elegir(azar, repertorio.companeros);
    if (!companeros.includes(nombre)) companeros.push(nombre);
  }
  return {
    dt: elegir(azar, repertorio.tecnicos),
    companeros,
    periodista: elegir(azar, repertorio.periodistas),
    figura: elegir(azar, repertorio.figuras),
  };
}
