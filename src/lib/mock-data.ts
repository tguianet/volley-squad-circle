// Mock data for BeachPlay Arena

export type Player = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  city: string;
  level: "Iniciante" | "Intermediário" | "Avançado" | "Profissional";
  height: number; // cm
  dominantHand: "Destra" | "Canhota";
  preferredSide: "Direito" | "Esquerdo" | "Ambos";
  wins: number;
  losses: number;
  matches: number;
  rankingPoints: number;
  mvps: number;
  bio: string;
  gender: "M" | "F";
};

export type Dupla = {
  id: string;
  player1Id: string;
  player2Id: string;
  name: string;
  wins: number;
  losses: number;
  rankingPoints: number;
  formedAt: string;
  gender: "M" | "F";
};

export type Quarteto = {
  id: string;
  playerIds: [string, string, string, string];
  name: string;
  wins: number;
  losses: number;
  rankingPoints: number;
  formedAt: string;
  gender: "M" | "F";
};


export type Arena = {
  id: string;
  name: string;
  city: string;
  address: string;
  cover: string;
  photos: string[];
  courts: number;
  rating: number;
  frequentPlayers: string[];
};

export type Post = {
  id: string;
  authorId: string;
  authorType: "player" | "arena" | "tournament";
  content: string;
  image?: string;
  video?: string;
  likes: number;
  comments: { user: string; text: string }[];
  createdAt: string;
};

export type Match = {
  id: string;
  arenaId: string;
  date: string;
  time: string;
  level: Player["level"];
  type: "2x2" | "3x3" | "4x4";
  slotsTotal: number;
  slotsTaken: number;
  notes: string;
  hostId: string;
};

export type Tournament = {
  id: string;
  name: string;
  arenaId: string;
  startDate: string;
  cover: string;
  status: "Inscrições abertas" | "Em andamento" | "Finalizado";
  category: string;
  duplas: string[]; // dupla IDs
  prize: string;
};

const img = (seed: string, w = 800, h = 600) =>
  `https://images.unsplash.com/photo-${seed}?w=${w}&h=${h}&fit=crop&auto=format`;

const avatar = (seed: number) =>
  `https://i.pravatar.cc/200?img=${seed}`;

export const players: Player[] = [
  { id: "p1", name: "Bruno Schmidt", username: "@brunoschmidt", avatar: avatar(12), city: "Vitória, ES", level: "Profissional", height: 198, dominantHand: "Destra", preferredSide: "Direito", wins: 142, losses: 38, matches: 180, rankingPoints: 2840, mvps: 21, bio: "Bicampeão mundial. Vibra na areia.", gender: "M" },
  { id: "p2", name: "Alison Cerutti", username: "@alisonceru", avatar: avatar(33), city: "Vila Velha, ES", level: "Profissional", height: 203, dominantHand: "Destra", preferredSide: "Esquerdo", wins: 130, losses: 42, matches: 172, rankingPoints: 2710, mvps: 18, bio: "Mamute da areia 🦣", gender: "M" },
  { id: "p3", name: "Carolina Solberg", username: "@carolsolberg", avatar: avatar(45), city: "Rio de Janeiro, RJ", level: "Profissional", height: 184, dominantHand: "Destra", preferredSide: "Direito", wins: 118, losses: 35, matches: 153, rankingPoints: 2590, mvps: 14, bio: "Praia, sol e bola.", gender: "F" },
  { id: "p4", name: "Maria Antonelli", username: "@mariaanto", avatar: avatar(47), city: "Saquarema, RJ", level: "Avançado", height: 180, dominantHand: "Canhota", preferredSide: "Esquerdo", wins: 95, losses: 40, matches: 135, rankingPoints: 2180, mvps: 9, bio: "Defensora implacável.", gender: "F" },
  { id: "p5", name: "Pedro Solberg", username: "@pedrosolberg", avatar: avatar(13), city: "Rio de Janeiro, RJ", level: "Avançado", height: 192, dominantHand: "Destra", preferredSide: "Direito", wins: 88, losses: 36, matches: 124, rankingPoints: 2090, mvps: 7, bio: "Bloqueio sólido.", gender: "M" },
  { id: "p6", name: "Ágatha Bednarczuk", username: "@agathabed", avatar: avatar(48), city: "Curitiba, PR", level: "Profissional", height: 187, dominantHand: "Destra", preferredSide: "Direito", wins: 110, losses: 40, matches: 150, rankingPoints: 2450, mvps: 12, bio: "Ataque potente.", gender: "F" },
  { id: "p7", name: "Evandro Gonçalves", username: "@evandrog", avatar: avatar(15), city: "Niterói, RJ", level: "Avançado", height: 195, dominantHand: "Destra", preferredSide: "Esquerdo", wins: 82, losses: 38, matches: 120, rankingPoints: 1970, mvps: 6, bio: "Saque viagem.", gender: "M" },
  { id: "p8", name: "Duda Lisboa", username: "@dudalisboa", avatar: avatar(49), city: "Salvador, BA", level: "Profissional", height: 178, dominantHand: "Destra", preferredSide: "Direito", wins: 102, losses: 28, matches: 130, rankingPoints: 2520, mvps: 15, bio: "Energia pura na areia.", gender: "F" },
];

export const duplas: Dupla[] = [
  { id: "d1", player1Id: "p1", player2Id: "p2", name: "Bruno & Alison", wins: 64, losses: 12, rankingPoints: 3200, formedAt: "2024-02-10", gender: "M" },
  { id: "d2", player1Id: "p3", player2Id: "p6", name: "Carol & Ágatha", wins: 58, losses: 14, rankingPoints: 3050, formedAt: "2024-01-05", gender: "F" },
  { id: "d3", player1Id: "p5", player2Id: "p7", name: "Pedro & Evandro", wins: 41, losses: 20, rankingPoints: 2480, formedAt: "2024-03-12", gender: "M" },
  { id: "d4", player1Id: "p4", player2Id: "p8", name: "Maria & Duda", wins: 47, losses: 18, rankingPoints: 2710, formedAt: "2024-02-25", gender: "F" },
];

export const quartetos: Quarteto[] = [
  { id: "q1", playerIds: ["p1","p2","p5","p7"], name: "Titãs da Areia", wins: 38, losses: 6, rankingPoints: 4120, formedAt: "2024-04-02", gender: "M" },
  { id: "q2", playerIds: ["p3","p4","p6","p8"], name: "Fênix Costeira", wins: 31, losses: 11, rankingPoints: 3680, formedAt: "2024-03-18", gender: "F" },
  { id: "q3", playerIds: ["p1","p3","p5","p8"], name: "Brisa Atlântica", wins: 27, losses: 13, rankingPoints: 3410, formedAt: "2024-05-09", gender: "M" },
  { id: "q4", playerIds: ["p2","p4","p6","p7"], name: "Ondas do Sul", wins: 22, losses: 17, rankingPoints: 2980, formedAt: "2024-05-22", gender: "F" },
];


export const arenas: Arena[] = [
  {
    id: "a1", name: "Arena Praia Grande", city: "Vitória, ES",
    address: "Av. Beira-Mar, 1500",
    cover: img("1592656094267-764a45160876"),
    photos: [img("1592656094267-764a45160876"), img("1576267423048-15c0040fec78"), img("1612872087720-bb876e2e67d1")],
    courts: 6, rating: 4.9, frequentPlayers: ["p1", "p2", "p7"],
  },
  {
    id: "a2", name: "Beach Club Saquarema", city: "Saquarema, RJ",
    address: "Rua das Ondas, 220",
    cover: img("1612872087720-bb876e2e67d1"),
    photos: [img("1612872087720-bb876e2e67d1"), img("1576267423048-15c0040fec78")],
    courts: 4, rating: 4.7, frequentPlayers: ["p4", "p5"],
  },
  {
    id: "a3", name: "Arena Sol & Areia", city: "Salvador, BA",
    address: "Praia do Forte, s/n",
    cover: img("1576267423048-15c0040fec78"),
    photos: [img("1576267423048-15c0040fec78"), img("1592656094267-764a45160876")],
    courts: 8, rating: 4.8, frequentPlayers: ["p8", "p3", "p6"],
  },
  {
    id: "a4", name: "Copacabana", city: "Rio de Janeiro, RJ",
    address: "Av. Atlântica, s/n — Posto 6",
    cover: img("1483729558449-99ef09a8c325"),
    photos: [img("1483729558449-99ef09a8c325"), img("1519046904684-a3e8a03d6110")],
    courts: 10, rating: 4.9, frequentPlayers: ["p3", "p5", "p7"],
  },
];

export const posts: Post[] = [
  { id: "po1", authorId: "p1", authorType: "player",
    content: "Treino pesado hoje na Arena Praia Grande! Bora vencer o circuito desse ano 🏐☀️",
    image: img("1612872087720-bb876e2e67d1"),
    likes: 482, comments: [{user:"Alison", text:"Vamoooo dupla!"}, {user:"Carol", text:"🔥🔥"}],
    createdAt: "2h" },
  { id: "po2", authorId: "a3", authorType: "arena",
    content: "Final de semana com torneio aberto! Inscrições liberadas 🌴",
    image: img("1576267423048-15c0040fec78"),
    likes: 218, comments: [{user:"Duda", text:"Confirmadíssima!"}],
    createdAt: "5h" },
  { id: "po3", authorId: "p3", authorType: "player",
    content: "Match point salvo no susto 😅 vídeo nos stories!",
    likes: 312, comments: [{user:"Ágatha", text:"Que reflexo!"}, {user:"Pedro", text:"Show!"}],
    createdAt: "8h" },
  { id: "po4", authorId: "t1", authorType: "tournament",
    content: "Definidas as 16 duplas do BeachPlay Open 2026. Boa sorte a todas! 🏆",
    image: img("1592656094267-764a45160876"),
    likes: 654, comments: [{user:"Bruno", text:"Tamo junto"}],
    createdAt: "12h" },
];

export const matches: Match[] = [
  { id: "m1", arenaId: "a1", date: "2026-06-12", time: "18:00", level: "Intermediário", type: "2x2", slotsTotal: 4, slotsTaken: 2, notes: "Quadra 3. Trazer água!", hostId: "p5" },
  { id: "m2", arenaId: "a2", date: "2026-06-13", time: "09:00", level: "Avançado", type: "2x2", slotsTotal: 4, slotsTaken: 3, notes: "Jogo amistoso", hostId: "p4" },
  { id: "m3", arenaId: "a3", date: "2026-06-13", time: "16:30", level: "Iniciante", type: "4x4", slotsTotal: 8, slotsTaken: 5, notes: "Bem-vindos iniciantes!", hostId: "p8" },
  { id: "m4", arenaId: "a1", date: "2026-06-14", time: "08:00", level: "Profissional", type: "2x2", slotsTotal: 4, slotsTaken: 4, notes: "Treino fechado", hostId: "p1" },
  { id: "m5", arenaId: "a2", date: "2026-06-15", time: "19:00", level: "Intermediário", type: "3x3", slotsTotal: 6, slotsTaken: 2, notes: "Vamos suar!", hostId: "p7" },
];

export const tournaments: Tournament[] = [
  { id: "t1", name: "BeachPlay Open 2026", arenaId: "a1", startDate: "2026-07-10",
    cover: img("1592656094267-764a45160876"), status: "Inscrições abertas",
    category: "Profissional", duplas: ["d1","d2","d3","d4"], prize: "R$ 25.000" },
  { id: "t2", name: "Copa Saquarema Beach", arenaId: "a2", startDate: "2026-06-25",
    cover: img("1612872087720-bb876e2e67d1"), status: "Em andamento",
    category: "Avançado", duplas: ["d2","d3","d4"], prize: "R$ 10.000" },
  { id: "t3", name: "Bahia Sand Cup", arenaId: "a3", startDate: "2026-05-15",
    cover: img("1576267423048-15c0040fec78"), status: "Finalizado",
    category: "Profissional", duplas: ["d1","d4"], prize: "R$ 15.000" },
];

export const notifications = [
  { id: "n1", icon: "trophy", title: "Você foi inscrito no BeachPlay Open 2026", time: "Agora" },
  { id: "n2", icon: "users", title: "Carolina Solberg começou a seguir você", time: "1h" },
  { id: "n3", icon: "heart", title: "Bruno Schmidt curtiu sua publicação", time: "3h" },
  { id: "n4", icon: "calendar", title: "Sua partida em Arena Praia Grande começa em 1h", time: "5h" },
  { id: "n5", icon: "message", title: "Novo comentário na sua publicação", time: "Ontem" },
];

export const recentMatches = [
  { id: "rm1", date: "08/06", opponent: "Pedro & Evandro", score: "21-18 / 21-17", result: "V" as const },
  { id: "rm2", date: "05/06", opponent: "Maria & Duda", score: "19-21 / 18-21", result: "D" as const },
  { id: "rm3", date: "01/06", opponent: "Carol & Ágatha", score: "21-19 / 17-21 / 15-12", result: "V" as const },
  { id: "rm4", date: "28/05", opponent: "Evandro & Pedro", score: "21-15 / 21-13", result: "V" as const },
];

export function getPlayer(id: string) { return players.find(p => p.id === id); }
export function getDupla(id: string) { return duplas.find(d => d.id === id); }
export function getArena(id: string) { return arenas.find(a => a.id === id); }
export function getTournament(id: string) { return tournaments.find(t => t.id === id); }

export const currentUser = players[0];
