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
  gender: "M" | "F" | "X";
};

export type Quarteto = {
  id: string;
  playerIds: [string, string, string, string];
  name: string;
  wins: number;
  losses: number;
  rankingPoints: number;
  formedAt: string;
  gender: "M" | "F" | "X";
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
  { id: "d5", player1Id: "p5", player2Id: "p1", name: "Trovão Pires", wins: 49, losses: 15, rankingPoints: 1800, formedAt: "2024-10-11", gender: "M" },
  { id: "d6", player1Id: "p7", player2Id: "p5", name: "Tubarões Rocha", wins: 32, losses: 27, rankingPoints: 3326, formedAt: "2024-01-09", gender: "M" },
  { id: "d7", player1Id: "p5", player2Id: "p2", name: "Maré Ramos", wins: 65, losses: 41, rankingPoints: 2739, formedAt: "2024-08-06", gender: "M" },
  { id: "d8", player1Id: "p2", player2Id: "p7", name: "Sol Mendes", wins: 45, losses: 39, rankingPoints: 2935, formedAt: "2024-02-25", gender: "M" },
  { id: "d9", player1Id: "p1", player2Id: "p7", name: "Estrela Barbosa", wins: 33, losses: 8, rankingPoints: 2630, formedAt: "2024-09-20", gender: "M" },
  { id: "d10", player1Id: "p7", player2Id: "p5", name: "Areia Mendes", wins: 43, losses: 17, rankingPoints: 2803, formedAt: "2024-01-13", gender: "M" },
  { id: "d11", player1Id: "p2", player2Id: "p1", name: "Praia Barbosa", wins: 19, losses: 7, rankingPoints: 1636, formedAt: "2024-01-19", gender: "M" },
  { id: "d12", player1Id: "p7", player2Id: "p2", name: "Norte Rocha", wins: 67, losses: 34, rankingPoints: 1811, formedAt: "2024-01-08", gender: "M" },
  { id: "d13", player1Id: "p5", player2Id: "p1", name: "Furacão Lima", wins: 45, losses: 39, rankingPoints: 3192, formedAt: "2024-09-11", gender: "M" },
  { id: "d14", player1Id: "p7", player2Id: "p1", name: "Mar Teixeira", wins: 37, losses: 30, rankingPoints: 3288, formedAt: "2024-05-23", gender: "M" },
  { id: "d15", player1Id: "p7", player2Id: "p1", name: "Onda Teixeira", wins: 20, losses: 33, rankingPoints: 3411, formedAt: "2024-02-27", gender: "M" },
  { id: "d16", player1Id: "p5", player2Id: "p2", name: "Furacão Costa", wins: 50, losses: 31, rankingPoints: 1696, formedAt: "2024-09-06", gender: "M" },
  { id: "d17", player1Id: "p2", player2Id: "p1", name: "Onda Moura", wins: 24, losses: 37, rankingPoints: 2155, formedAt: "2024-05-20", gender: "M" },
  { id: "d18", player1Id: "p1", player2Id: "p5", name: "Sul Cruz", wins: 22, losses: 38, rankingPoints: 3492, formedAt: "2024-03-21", gender: "M" },
  { id: "d19", player1Id: "p7", player2Id: "p1", name: "Atlântico Teixeira", wins: 50, losses: 33, rankingPoints: 1625, formedAt: "2024-03-21", gender: "M" },
  { id: "d20", player1Id: "p8", player2Id: "p4", name: "Trovão Rocha", wins: 25, losses: 33, rankingPoints: 2897, formedAt: "2024-03-21", gender: "F" },
  { id: "d21", player1Id: "p3", player2Id: "p6", name: "Furacão Ramos", wins: 35, losses: 39, rankingPoints: 1773, formedAt: "2024-04-14", gender: "F" },
  { id: "d22", player1Id: "p8", player2Id: "p6", name: "Tropical Vieira", wins: 30, losses: 24, rankingPoints: 2080, formedAt: "2024-07-04", gender: "F" },
  { id: "d23", player1Id: "p4", player2Id: "p6", name: "Tubarões Cruz", wins: 15, losses: 43, rankingPoints: 1927, formedAt: "2024-08-02", gender: "F" },
  { id: "d24", player1Id: "p4", player2Id: "p6", name: "Praia Mendes", wins: 11, losses: 29, rankingPoints: 2431, formedAt: "2024-07-12", gender: "F" },
  { id: "d25", player1Id: "p6", player2Id: "p4", name: "Maré Barbosa", wins: 52, losses: 27, rankingPoints: 2024, formedAt: "2024-05-02", gender: "F" },
  { id: "d26", player1Id: "p4", player2Id: "p3", name: "Sul Teixeira", wins: 56, losses: 26, rankingPoints: 1529, formedAt: "2024-02-09", gender: "F" },
  { id: "d27", player1Id: "p8", player2Id: "p4", name: "Norte Freitas", wins: 39, losses: 14, rankingPoints: 2728, formedAt: "2024-02-21", gender: "F" },
  { id: "d28", player1Id: "p8", player2Id: "p4", name: "Mar Barbosa", wins: 40, losses: 42, rankingPoints: 3018, formedAt: "2024-06-08", gender: "F" },
  { id: "d29", player1Id: "p4", player2Id: "p8", name: "Estrela Barbosa", wins: 44, losses: 28, rankingPoints: 2611, formedAt: "2024-03-03", gender: "F" },
  { id: "d30", player1Id: "p6", player2Id: "p3", name: "Praia Lima", wins: 67, losses: 38, rankingPoints: 1701, formedAt: "2024-02-04", gender: "F" },
  { id: "d31", player1Id: "p4", player2Id: "p6", name: "Maré Cruz", wins: 37, losses: 35, rankingPoints: 1657, formedAt: "2024-05-07", gender: "F" },
  { id: "d32", player1Id: "p3", player2Id: "p6", name: "Litoral Mendes", wins: 56, losses: 19, rankingPoints: 2115, formedAt: "2024-05-27", gender: "F" },
  { id: "d33", player1Id: "p3", player2Id: "p4", name: "Sol Cruz", wins: 56, losses: 28, rankingPoints: 2385, formedAt: "2024-03-26", gender: "F" },
  { id: "d34", player1Id: "p6", player2Id: "p8", name: "Litoral Cruz", wins: 59, losses: 44, rankingPoints: 1729, formedAt: "2024-09-22", gender: "F" },
  { id: "d35", player1Id: "p1", player2Id: "p6", name: "Trovão Teixeira", wins: 10, losses: 11, rankingPoints: 2738, formedAt: "2024-05-10", gender: "X" },
  { id: "d36", player1Id: "p5", player2Id: "p3", name: "Tubarões Mendes", wins: 46, losses: 24, rankingPoints: 1886, formedAt: "2024-07-26", gender: "X" },
  { id: "d37", player1Id: "p1", player2Id: "p4", name: "Coqueiros Lima", wins: 13, losses: 14, rankingPoints: 2384, formedAt: "2024-04-24", gender: "X" },
  { id: "d38", player1Id: "p1", player2Id: "p6", name: "Praia Ramos", wins: 54, losses: 40, rankingPoints: 1836, formedAt: "2024-03-18", gender: "X" },
  { id: "d39", player1Id: "p7", player2Id: "p8", name: "Litoral Aragão", wins: 62, losses: 32, rankingPoints: 1759, formedAt: "2024-03-27", gender: "X" },
  { id: "d40", player1Id: "p7", player2Id: "p4", name: "Areia Mendes", wins: 58, losses: 30, rankingPoints: 2145, formedAt: "2024-10-19", gender: "X" },
  { id: "d41", player1Id: "p1", player2Id: "p6", name: "Brisa Cardoso", wins: 13, losses: 38, rankingPoints: 3133, formedAt: "2024-05-11", gender: "X" },
  { id: "d42", player1Id: "p5", player2Id: "p3", name: "Costa Freitas", wins: 53, losses: 38, rankingPoints: 1982, formedAt: "2024-09-22", gender: "X" },
  { id: "d43", player1Id: "p5", player2Id: "p8", name: "Furacão Barbosa", wins: 60, losses: 38, rankingPoints: 1979, formedAt: "2024-01-24", gender: "X" },
  { id: "d44", player1Id: "p5", player2Id: "p4", name: "Estrela Lima", wins: 55, losses: 13, rankingPoints: 2498, formedAt: "2024-08-17", gender: "X" },
  { id: "d45", player1Id: "p1", player2Id: "p6", name: "Litoral Mendes", wins: 37, losses: 32, rankingPoints: 2757, formedAt: "2024-03-19", gender: "X" },
  { id: "d46", player1Id: "p2", player2Id: "p4", name: "Litoral Barbosa", wins: 58, losses: 27, rankingPoints: 3197, formedAt: "2024-02-16", gender: "X" },
  { id: "d47", player1Id: "p5", player2Id: "p6", name: "Areia Costa", wins: 28, losses: 7, rankingPoints: 2883, formedAt: "2024-04-18", gender: "X" },
  { id: "d48", player1Id: "p5", player2Id: "p8", name: "Vento Mendes", wins: 56, losses: 28, rankingPoints: 1658, formedAt: "2024-04-27", gender: "X" },
  { id: "d49", player1Id: "p1", player2Id: "p8", name: "Sol Cardoso", wins: 53, losses: 41, rankingPoints: 2121, formedAt: "2024-06-13", gender: "X" },
];

export const quartetos: Quarteto[] = [
  { id: "q1", playerIds: ["p1","p2","p5","p7"], name: "Titãs da Areia", wins: 38, losses: 6, rankingPoints: 4120, formedAt: "2024-04-02", gender: "M" },
  { id: "q2", playerIds: ["p3","p4","p6","p8"], name: "Fênix Costeira", wins: 31, losses: 11, rankingPoints: 3680, formedAt: "2024-03-18", gender: "F" },
  { id: "q3", playerIds: ["p1","p3","p5","p8"], name: "Brisa Atlântica", wins: 27, losses: 13, rankingPoints: 3410, formedAt: "2024-05-09", gender: "X" },
  { id: "q4", playerIds: ["p2","p4","p6","p7"], name: "Ondas do Sul", wins: 22, losses: 17, rankingPoints: 2980, formedAt: "2024-05-22", gender: "X" },
  { id: "q5", playerIds: ["p2","p7","p5","p1"], name: "Sol Tropical", wins: 42, losses: 18, rankingPoints: 4040, formedAt: "2024-06-09", gender: "M" },
  { id: "q6", playerIds: ["p1","p2","p5","p7"], name: "Areia do Mar", wins: 58, losses: 10, rankingPoints: 4268, formedAt: "2024-03-03", gender: "M" },
  { id: "q7", playerIds: ["p1","p2","p5","p7"], name: "Trovão Veloz", wins: 58, losses: 8, rankingPoints: 4155, formedAt: "2024-08-18", gender: "M" },
  { id: "q8", playerIds: ["p1","p2","p5","p7"], name: "Mar do Mar", wins: 37, losses: 24, rankingPoints: 4033, formedAt: "2024-08-04", gender: "M" },
  { id: "q9", playerIds: ["p1","p2","p5","p7"], name: "Coqueiros Tropical", wins: 29, losses: 10, rankingPoints: 3231, formedAt: "2024-06-06", gender: "M" },
  { id: "q10", playerIds: ["p7","p5","p2","p1"], name: "Norte Tropical", wins: 24, losses: 26, rankingPoints: 3279, formedAt: "2024-10-03", gender: "M" },
  { id: "q11", playerIds: ["p2","p1","p7","p5"], name: "Mar da Praia", wins: 58, losses: 12, rankingPoints: 3439, formedAt: "2024-04-09", gender: "M" },
  { id: "q12", playerIds: ["p1","p7","p2","p5"], name: "Sol Atlântico", wins: 15, losses: 28, rankingPoints: 4139, formedAt: "2024-06-20", gender: "M" },
  { id: "q13", playerIds: ["p1","p2","p7","p5"], name: "Furacão da Praia", wins: 11, losses: 11, rankingPoints: 2871, formedAt: "2024-08-07", gender: "M" },
  { id: "q14", playerIds: ["p1","p7","p2","p5"], name: "Mar Tropical", wins: 19, losses: 15, rankingPoints: 3965, formedAt: "2024-02-15", gender: "M" },
  { id: "q15", playerIds: ["p5","p2","p7","p1"], name: "Onda da Praia", wins: 14, losses: 25, rankingPoints: 3617, formedAt: "2024-08-07", gender: "M" },
  { id: "q16", playerIds: ["p5","p7","p2","p1"], name: "Tropical Imbatível", wins: 36, losses: 26, rankingPoints: 2993, formedAt: "2024-02-11", gender: "M" },
  { id: "q17", playerIds: ["p1","p2","p5","p7"], name: "Mar Tropical", wins: 16, losses: 25, rankingPoints: 3857, formedAt: "2024-08-14", gender: "M" },
  { id: "q18", playerIds: ["p1","p5","p2","p7"], name: "Maré da Praia", wins: 23, losses: 6, rankingPoints: 2683, formedAt: "2024-03-03", gender: "M" },
  { id: "q19", playerIds: ["p1","p7","p2","p5"], name: "Brisa do Litoral", wins: 17, losses: 3, rankingPoints: 3753, formedAt: "2024-11-08", gender: "M" },
  { id: "q20", playerIds: ["p6","p4","p8","p3"], name: "Atlântico Atlântico", wins: 59, losses: 23, rankingPoints: 4045, formedAt: "2024-01-12", gender: "F" },
  { id: "q21", playerIds: ["p3","p8","p6","p4"], name: "Norte Atlântico", wins: 33, losses: 25, rankingPoints: 4483, formedAt: "2024-05-20", gender: "F" },
  { id: "q22", playerIds: ["p6","p3","p8","p4"], name: "Norte do Litoral", wins: 52, losses: 23, rankingPoints: 2097, formedAt: "2024-04-03", gender: "F" },
  { id: "q23", playerIds: ["p3","p4","p6","p8"], name: "Praia Costeiro", wins: 18, losses: 3, rankingPoints: 3370, formedAt: "2024-08-26", gender: "F" },
  { id: "q24", playerIds: ["p8","p3","p4","p6"], name: "Mar Imbatível", wins: 48, losses: 16, rankingPoints: 4162, formedAt: "2024-07-01", gender: "F" },
  { id: "q25", playerIds: ["p6","p4","p8","p3"], name: "Onda Atlântico", wins: 10, losses: 14, rankingPoints: 2253, formedAt: "2024-11-16", gender: "F" },
  { id: "q26", playerIds: ["p3","p4","p6","p8"], name: "Mar Atlântico", wins: 35, losses: 17, rankingPoints: 3680, formedAt: "2024-04-06", gender: "F" },
  { id: "q27", playerIds: ["p3","p4","p8","p6"], name: "Trovão do Litoral", wins: 26, losses: 9, rankingPoints: 2035, formedAt: "2024-01-03", gender: "F" },
  { id: "q28", playerIds: ["p3","p8","p4","p6"], name: "Sol da Praia", wins: 52, losses: 11, rankingPoints: 3760, formedAt: "2024-01-05", gender: "F" },
  { id: "q29", playerIds: ["p3","p4","p6","p8"], name: "Sol do Mar", wins: 17, losses: 3, rankingPoints: 4405, formedAt: "2024-11-04", gender: "F" },
  { id: "q30", playerIds: ["p3","p8","p4","p6"], name: "Estrela do Mar", wins: 10, losses: 18, rankingPoints: 2552, formedAt: "2024-09-20", gender: "F" },
  { id: "q31", playerIds: ["p4","p6","p3","p8"], name: "Sul Imbatível", wins: 34, losses: 13, rankingPoints: 3066, formedAt: "2024-09-02", gender: "F" },
  { id: "q32", playerIds: ["p4","p6","p3","p8"], name: "Onda do Litoral", wins: 23, losses: 18, rankingPoints: 2154, formedAt: "2024-11-23", gender: "F" },
  { id: "q33", playerIds: ["p8","p6","p4","p3"], name: "Norte do Litoral", wins: 18, losses: 11, rankingPoints: 4024, formedAt: "2024-03-02", gender: "F" },
  { id: "q34", playerIds: ["p8","p3","p4","p6"], name: "Onda Selvagem", wins: 56, losses: 28, rankingPoints: 2915, formedAt: "2024-09-15", gender: "F" },
  { id: "q35", playerIds: ["p1","p5","p4","p3"], name: "Tubarões Atlântico", wins: 25, losses: 24, rankingPoints: 3642, formedAt: "2024-03-23", gender: "X" },
  { id: "q36", playerIds: ["p7","p2","p4","p8"], name: "Tubarões da Areia", wins: 33, losses: 20, rankingPoints: 2717, formedAt: "2024-06-25", gender: "X" },
  { id: "q37", playerIds: ["p5","p2","p6","p4"], name: "Costa Imbatível", wins: 44, losses: 12, rankingPoints: 3691, formedAt: "2024-06-21", gender: "X" },
  { id: "q38", playerIds: ["p2","p5","p4","p3"], name: "Onda do Litoral", wins: 23, losses: 25, rankingPoints: 3865, formedAt: "2024-09-04", gender: "X" },
  { id: "q39", playerIds: ["p2","p5","p8","p3"], name: "Litoral da Areia", wins: 20, losses: 5, rankingPoints: 3163, formedAt: "2024-05-14", gender: "X" },
  { id: "q40", playerIds: ["p2","p7","p4","p8"], name: "Águias da Areia", wins: 58, losses: 31, rankingPoints: 2415, formedAt: "2024-03-09", gender: "X" },
  { id: "q41", playerIds: ["p1","p7","p6","p4"], name: "Litoral Selvagem", wins: 37, losses: 15, rankingPoints: 2609, formedAt: "2024-02-07", gender: "X" },
  { id: "q42", playerIds: ["p5","p2","p4","p8"], name: "Vento Atlântico", wins: 14, losses: 6, rankingPoints: 2233, formedAt: "2024-05-18", gender: "X" },
  { id: "q43", playerIds: ["p5","p7","p3","p8"], name: "Águias da Praia", wins: 16, losses: 26, rankingPoints: 2280, formedAt: "2024-10-11", gender: "X" },
  { id: "q44", playerIds: ["p1","p5","p3","p8"], name: "Estrela Tropical", wins: 42, losses: 16, rankingPoints: 3587, formedAt: "2024-04-06", gender: "X" },
  { id: "q45", playerIds: ["p1","p5","p8","p4"], name: "Tubarões Veloz", wins: 38, losses: 18, rankingPoints: 2743, formedAt: "2024-02-01", gender: "X" },
  { id: "q46", playerIds: ["p2","p7","p3","p6"], name: "Trovão Costeiro", wins: 47, losses: 26, rankingPoints: 4113, formedAt: "2024-06-15", gender: "X" },
  { id: "q47", playerIds: ["p7","p5","p6","p8"], name: "Atlântico Imbatível", wins: 40, losses: 6, rankingPoints: 3541, formedAt: "2024-11-02", gender: "X" },
  { id: "q48", playerIds: ["p7","p2","p4","p3"], name: "Costa Costeiro", wins: 16, losses: 22, rankingPoints: 3266, formedAt: "2024-02-15", gender: "X" },
  { id: "q49", playerIds: ["p7","p5","p6","p8"], name: "Tropical Selvagem", wins: 13, losses: 22, rankingPoints: 2259, formedAt: "2024-08-07", gender: "X" },
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

// ===== Ranking Individual (agregado a partir de Duplas e Quartetos) =====

export type ModalityCategory = "M" | "F" | "X";
export type ModalityLabel =
  | "Dupla Masculina"
  | "Dupla Feminina"
  | "Dupla Mista"
  | "Quarteto Masculino"
  | "Quarteto Feminino"
  | "Quarteto Misto";

export interface IndividualRankingRow {
  player: Player;
  points: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
  winRate: number; // 0..1
  modalities: ModalityLabel[];
}

const duplaLabel: Record<ModalityCategory, ModalityLabel> = {
  M: "Dupla Masculina",
  F: "Dupla Feminina",
  X: "Dupla Mista",
};
const quartetoLabel: Record<ModalityCategory, ModalityLabel> = {
  M: "Quarteto Masculino",
  F: "Quarteto Feminino",
  X: "Quarteto Misto",
};

export function computeIndividualRanking(
  filter: "M" | "F" | "X",
): IndividualRankingRow[] {
  const acc = new Map<string, IndividualRankingRow>();

  const ensure = (player: Player): IndividualRankingRow => {
    const existing = acc.get(player.id);
    if (existing) return existing;
    const row: IndividualRankingRow = {
      player,
      points: 0,
      wins: 0,
      losses: 0,
      matchesPlayed: 0,
      winRate: 0,
      modalities: [],
    };
    acc.set(player.id, row);
    return row;
  };

  const addModality = (row: IndividualRankingRow, label: ModalityLabel) => {
    if (!row.modalities.includes(label)) row.modalities.push(label);
  };

  const shouldInclude = (playerGender: "M" | "F", teamGender: ModalityCategory) => {
    if (filter === "X") return true; // ranking geral
    if (teamGender === filter) return true; // mesma categoria
    if (teamGender === "X" && playerGender === filter) return true; // misto, mas jogador é do gênero filtrado
    return false;
  };

  for (const d of duplas) {
    const ids = [d.player1Id, d.player2Id];
    for (const pid of ids) {
      const p = getPlayer(pid);
      if (!p) continue;
      if (!shouldInclude(p.gender, d.gender)) continue;
      const row = ensure(p);
      row.points += d.rankingPoints;
      row.wins += d.wins;
      row.losses += d.losses;
      row.matchesPlayed += d.wins + d.losses;
      addModality(row, duplaLabel[d.gender]);
    }
  }

  for (const q of quartetos) {
    for (const pid of q.playerIds) {
      const p = getPlayer(pid);
      if (!p) continue;
      if (!shouldInclude(p.gender, q.gender)) continue;
      const row = ensure(p);
      row.points += q.rankingPoints;
      row.wins += q.wins;
      row.losses += q.losses;
      row.matchesPlayed += q.wins + q.losses;
      addModality(row, quartetoLabel[q.gender]);
    }
  }

  const rows = Array.from(acc.values()).map(r => ({
    ...r,
    winRate: r.matchesPlayed > 0 ? r.wins / r.matchesPlayed : 0,
  }));

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return a.player.name.localeCompare(b.player.name);
  });

  return rows;
}

