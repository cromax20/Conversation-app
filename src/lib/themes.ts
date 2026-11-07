// Thème d'immersion de chaque langue pour le parcours : paysage, couleurs, monuments et plats.
import type { Avatar } from "./avatar";
import { languageByCode } from "./characters";

export type Sticker = { emoji: string; label: string };
export type Theme = {
  scenery: Avatar["scenery"];
  time: Avatar["time"];
  colors: [string, string, string]; // couleurs principales (inspirées du drapeau ou de la culture)
  landmarks: Sticker[];
  dishes: Sticker[];
};

const T = (scenery: Theme["scenery"], time: Theme["time"], colors: Theme["colors"], landmarks: string, dishes: string): Theme => ({
  scenery, time, colors,
  landmarks: landmarks.split(";").map((x) => { const [emoji, label] = x.split("|"); return { emoji, label }; }),
  dishes: dishes.split(";").map((x) => { const [emoji, label] = x.split("|"); return { emoji, label }; }),
});

const THEMES: Record<string, Theme> = {
  es: T("sea", "sunset", ["#c60b1e", "#ffc400", "#7a1f1f"], "⛪|Sagrada Família;🏰|Alhambra;🐂|Plaza de toros;🎨|Museo del Prado", "🥘|Paella;🍩|Churros;🍤|Tapas;🫒|Aceitunas"),
  "es-MX": T("desert", "day", ["#006847", "#ce1126", "#f4c430"], "🛕|Chichén Itzá;🌵|Desierto de Sonora;💀|Día de Muertos;🌋|Popocatépetl", "🌮|Tacos;🫔|Tamales;🥑|Guacamole;🌶️|Mole"),
  "es-AR": T("mountains", "day", ["#74acdf", "#ffffff", "#f6b40e"], "🏔️|Aconcagua;💃|Tango de San Telmo;🌊|Chutes d'Iguazú;🐧|Patagonie", "🥩|Asado;🥟|Empanadas;🧉|Maté;🍮|Dulce de leche"),
  "es-CU": T("tropical", "sunset", ["#002a8f", "#cf142b", "#ffffff"], "🚗|Vieilles voitures de La Havane;🏛️|Capitolio;🌴|Viñales;🎺|Son cubano", "🍛|Ropa vieja;🥪|Cubano;🍹|Mojito;🍌|Tostones"),
  fr: T("countryside", "day", ["#0055a4", "#ffffff", "#ef4135"], "🗼|Tour Eiffel;🏰|Mont-Saint-Michel;⛪|Notre-Dame;🍇|Vignobles", "🥐|Croissant;🧀|Fromages;🥖|Baguette;🍮|Crème brûlée"),
  en: T("city", "day", ["#012169", "#c8102e", "#ffffff"], "🎡|London Eye;🗽|Statue de la Liberté;🏰|Château d'Édimbourg;🌉|Golden Gate", "🫖|Afternoon tea;🐟|Fish and chips;🍔|Burger;🥧|Apple pie"),
  de: T("mountains", "morning", ["#000000", "#dd0000", "#ffce00"], "🏰|Neuschwanstein;🚪|Porte de Brandebourg;⛪|Cathédrale de Cologne;🌲|Forêt-Noire", "🥨|Bretzel;🌭|Bratwurst;🍰|Forêt-noire;🥔|Kartoffelsalat"),
  it: T("countryside", "sunset", ["#009246", "#ffffff", "#ce2b37"], "🏛️|Colisée;🗼|Tour de Pise;🛶|Venise;⛪|Duomo de Florence", "🍕|Pizza;🍝|Pasta;🍨|Gelato;☕|Espresso"),
  scn: T("sea", "day", ["#fcdd09", "#da121a", "#1f6fb2"], "🌋|Etna;🏛️|Vallée des Temples;⛪|Cathédrale de Monreale;🏖️|Cefalù", "🍙|Arancini;🧁|Cannoli;🍋|Granita;🐟|Pasta con le sarde"),
  nap: T("sea", "sunset", ["#1f6fb2", "#e0a43a", "#ce2b37"], "🌋|Vésuve;🏛️|Pompéi;🏖️|Côte amalfitaine;🎭|Pulcinella", "🍕|Pizza napolitaine;🥐|Sfogliatella;🍋|Limoncello;☕|Caffè"),
  pt: T("sea", "sunset", ["#006600", "#ff0000", "#ffcc00"], "🚋|Tram 28 de Lisbonne;🏰|Tour de Belém;🌉|Ponte Dom Luís;🎶|Fado", "🥧|Pastel de nata;🐟|Bacalhau;🍷|Vin de Porto;🥪|Francesinha"),
  "pt-BR": T("tropical", "day", ["#009c3b", "#ffdf00", "#002776"], "⛰️|Pain de Sucre;🙏|Christ Rédempteur;🌳|Amazonie;🎉|Carnaval de Rio", "🍲|Feijoada;🧀|Pão de queijo;🍹|Caipirinha;🫐|Açaí"),
  ar: T("desert", "sunset", ["#007a3d", "#ce1126", "#c8a45a"], "🕌|Mosquée;🏜️|Désert;🏛️|Pétra;🌴|Oasis", "🧆|Falafel;🫓|Pain pita;🍢|Kebab;🍯|Baklava"),
  ary: T("desert", "sunset", ["#c1272d", "#006233", "#e0a43a"], "🕌|Mosquée Hassan II;🏜️|Merzouga;🏙️|Médina de Fès;🔵|Chefchaouen", "🍲|Tajine;🥣|Couscous;🍵|Thé à la menthe;🥧|Pastilla"),
  arq: T("desert", "day", ["#006233", "#ffffff", "#d21034"], "🕌|Casbah d'Alger;⛪|Notre-Dame d'Afrique;🏜️|Tassili n'Ajjer;🌉|Ponts de Constantine", "🥣|Couscous;🫓|Kesra;🍲|Chorba;🍬|Makrout"),
  aeb: T("sea", "day", ["#e70013", "#ffffff", "#1f6fb2"], "🏛️|Carthage;🔵|Sidi Bou Saïd;🏟️|Amphithéâtre d'El Jem;🏜️|Douz", "🥣|Couscous;🥚|Brik;🌶️|Harissa;🍲|Lablabi"),
  arz: T("desert", "day", ["#ce1126", "#ffffff", "#c09300"], "🔺|Pyramides de Gizeh;🦁|Sphinx;⛵|Felouques sur le Nil;🏛️|Louxor", "🍛|Koshari;🧆|Ta'meya;🫘|Ful medames;🍮|Om Ali"),
  apc: T("mountains", "sunset", ["#ee161f", "#00a651", "#ffffff"], "🌲|Cèdres du Liban;🏛️|Baalbek;🕌|Mosquée des Omeyyades;🌊|Corniche de Beyrouth", "🥗|Taboulé;🫓|Man'ouché;🥙|Chawarma;🍮|Knafeh"),
  afb: T("desert", "night", ["#00732f", "#ffffff", "#ce1126"], "🏙️|Burj Khalifa;🕌|Grande Mosquée;🐪|Dunes;⛵|Boutres", "🍚|Machboos;🥛|Laban;🌴|Dattes;☕|Gahwa"),
  kab: T("mountains", "morning", ["#0072c6", "#5aa02c", "#fcd116"], "⛰️|Djurdjura;🏘️|Villages perchés;🫒|Oliviers;🏺|Poterie kabyle", "🥣|Seksu;🫒|Huile d'olive;🫓|Aghrum;🍯|Miel de montagne"),
  shi: T("mountains", "sunset", ["#0072c6", "#5aa02c", "#fcd116"], "🏔️|Anti-Atlas;🏘️|Ksar;🌳|Arganiers;🌸|Vallée des roses", "🍲|Tajine;🌰|Amlou;🍵|Thé;🫓|Tafarnout"),
  tzm: T("mountains", "day", ["#0072c6", "#5aa02c", "#fcd116"], "🌲|Forêt de cèdres;🐒|Singes magots;⛰️|Moyen Atlas;🏘️|Ifrane", "🥣|Couscous;🍲|Tajine;🍵|Thé;🍯|Miel"),
  wo: T("sea", "sunset", ["#00853f", "#fdef42", "#e31b23"], "🗿|Monument de la Renaissance;🏝️|Île de Gorée;🌊|Lac Rose;🛶|Pirogues", "🍚|Thiéboudienne;🍗|Yassa;🥜|Mafé;🌺|Bissap"),
  sw: T("countryside", "sunset", ["#1eb53a", "#fcd116", "#00a3dd"], "🏔️|Kilimandjaro;🦁|Serengeti;🏝️|Zanzibar;🦒|Safari", "🍚|Pilau;🫓|Chapati;🍢|Nyama choma;🥥|Mandazi"),
  yo: T("tropical", "day", ["#008751", "#ffffff", "#e0a43a"], "🗿|Bronzes d'Ifé;⛰️|Rocher d'Olumo;🥁|Tambours parlants;🏙️|Lagos", "🍚|Jollof rice;🍠|Ìyán;🍌|Dodo;🥣|Egusi"),
  pcm: T("city", "day", ["#008751", "#ffffff", "#e0a43a"], "🏙️|Lagos Island;🎶|Afrobeat;🏖️|Elegushi Beach;🛺|Danfo", "🍚|Jollof rice;🍌|Plantain;🍢|Suya;🥣|Pepper soup"),
  ht: T("tropical", "sunset", ["#00209f", "#d21034", "#ffffff"], "🏰|Citadelle Laferrière;🌊|Bassin Bleu;🎨|Art naïf;🥁|Rara", "🍖|Griot;🍚|Diri ak pwa;🍌|Bannann peze;🥣|Soup joumou"),
  gcf: T("tropical", "day", ["#0f8a8a", "#e0a43a", "#c8412e"], "🌋|La Soufrière;🏖️|Plages;🌺|Jardins créoles;⛵|Yoles rondes", "🍛|Colombo;🥟|Accras;🍹|Ti-punch;🥥|Blanc-manger coco"),
  rcf: T("mountains", "morning", ["#0f8a8a", "#e0a43a", "#c8412e"], "🌋|Piton de la Fournaise;⛰️|Cirque de Cilaos;🏖️|Lagon;🌿|Vanille", "🍛|Rougail saucisse;🥟|Samoussas;🍚|Cari;🍹|Rhum arrangé"),
  zh: T("mountains", "morning", ["#de2910", "#ffde00", "#7a1f1f"], "🏯|Cité interdite;🧱|Grande Muraille;🐼|Pandas de Chengdu;⛰️|Monts Huang", "🥟|Raviolis;🦆|Canard laqué;🍜|Nouilles;🫖|Thé"),
  yue: T("city", "night", ["#de2910", "#ffffff", "#0f8a8a"], "🌃|Victoria Harbour;⛩️|Temple Man Mo;🚋|Tram de Hong Kong;⛴️|Star Ferry", "🥟|Dim sum;🍖|Char siu;🥚|Tartelette aux œufs;🍵|Milk tea"),
  ja: T("mountains", "morning", ["#bc002d", "#ffffff", "#2b2f3a"], "🗻|Mont Fuji;⛩️|Fushimi Inari;🏯|Château d'Himeji;🌸|Cerisiers", "🍣|Sushi;🍜|Ramen;🍙|Onigiri;🍵|Matcha"),
  ko: T("city", "night", ["#cd2e3a", "#0047a0", "#ffffff"], "🏯|Gyeongbokgung;🗼|N Seoul Tower;🏝️|Jeju;🎤|K-pop", "🍲|Kimchi jjigae;🍚|Bibimbap;🍗|Poulet frit;🍢|Tteokbokki"),
  hi: T("countryside", "sunset", ["#ff9933", "#ffffff", "#138808"], "🕌|Taj Mahal;🏰|Palais des vents;🛕|Varanasi;🐘|Éléphants", "🍛|Curry;🫓|Naan;🍚|Biryani;☕|Masala chai"),
  ta: T("tropical", "day", ["#ff9933", "#138808", "#7a1f1f"], "🛕|Temple de Madurai;🏖️|Marina Beach;🌴|Backwaters;🐘|Festival", "🥞|Dosa;🍚|Idli;🍛|Sambar;☕|Filter coffee"),
  ru: T("snow", "day", ["#ffffff", "#0039a6", "#d52b1e"], "🕌|Basilique Saint-Basile;🏛️|Ermitage;🚂|Transsibérien;🩰|Ballet", "🥟|Pelmeni;🥣|Bortsch;🥞|Blinis;🫖|Samovar"),
  uk: T("countryside", "day", ["#0057b7", "#ffd700", "#ffffff"], "⛪|Laure de Kyiv;🏰|Lviv;🌻|Champs de tournesols;⛰️|Carpates", "🥣|Bortsch;🥟|Varenyky;🍞|Pampouchky;🍯|Medivnyk"),
  tr: T("sea", "sunset", ["#e30a17", "#ffffff", "#1f6fb2"], "🕌|Sainte-Sophie;🎈|Cappadoce;🌉|Bosphore;🏛️|Éphèse", "🥙|Döner;🍬|Loukoum;☕|Café turc;🥯|Simit"),
  el: T("sea", "day", ["#0d5eaf", "#ffffff", "#e0a43a"], "🏛️|Acropole;🔵|Santorin;⛪|Météores;🏺|Delphes", "🥗|Salade grecque;🥙|Gyros;🧀|Feta;🍯|Baklava"),
  fa: T("desert", "sunset", ["#239f40", "#ffffff", "#da0000"], "🕌|Place Naghsh-e Jahan;🏛️|Persépolis;🌹|Jardins persans;🏔️|Damavand", "🍚|Tahdig;🍢|Kebab koobideh;🍲|Ghormeh sabzi;🍵|Thé"),
  he: T("desert", "day", ["#0038b8", "#ffffff", "#e0a43a"], "🧱|Mur occidental;🌊|Mer Morte;🏰|Massada;🏖️|Tel Aviv", "🧆|Falafel;🥙|Shakshuka;🫓|Pita;🥗|Houmous"),
  vi: T("tropical", "morning", ["#da251d", "#ffff00", "#1f7a4d"], "⛰️|Baie d'Along;🏮|Hoi An;🛶|Delta du Mékong;🌾|Rizières de Sapa", "🍜|Phở;🥖|Bánh mì;🥢|Rouleaux de printemps;☕|Cà phê sữa đá"),
  th: T("tropical", "sunset", ["#a51931", "#f4f5f8", "#2d2a4a"], "🛕|Wat Arun;🏝️|Phi Phi;🐘|Chiang Mai;🛶|Marché flottant", "🍜|Pad thaï;🍲|Tom yum;🥭|Riz gluant à la mangue;🥥|Curry vert"),
  id: T("tropical", "morning", ["#ce1126", "#ffffff", "#1f7a4d"], "🛕|Borobudur;🌋|Bromo;🏝️|Bali;🌾|Rizières en terrasses", "🍚|Nasi goreng;🍢|Satay;🥗|Gado-gado;🍜|Mie ayam"),
  tl: T("tropical", "day", ["#0038a8", "#ce1126", "#fcd116"], "🏝️|Palawan;⛰️|Collines de chocolat;🌾|Rizières de Banaue;🚙|Jeepney", "🍗|Adobo;🍲|Sinigang;🍧|Halo-halo;🥟|Lumpia"),
  ka: T("mountains", "day", ["#ffffff", "#ff0000", "#7a1f1f"], "⛪|Gergeti;🏰|Vieux Tbilissi;🏔️|Caucase;🍇|Kakhétie", "🧀|Khachapuri;🥟|Khinkali;🍇|Churchkhela;🍷|Vin en qvevri"),
  hy: T("mountains", "morning", ["#d90012", "#0033a0", "#f2a800"], "🏔️|Mont Ararat;⛪|Khor Virap;🏛️|Garni;🍑|Abricotiers", "🫓|Lavash;🍢|Khorovats;🥟|Dolma;🍑|Abricots"),
  qu: T("mountains", "day", ["#e0a43a", "#c8412e", "#1f7a4d"], "🏔️|Machu Picchu;🦙|Lamas;🌈|Montagne arc-en-ciel;🏛️|Cuzco", "🌽|Choclo;🥔|Pommes de terre;🐟|Ceviche;🥣|Quinoa"),
  br: T("sea", "day", ["#000000", "#ffffff", "#1f6fb2"], "🗿|Alignements de Carnac;🌊|Pointe du Raz;⛪|Calvaires;🎶|Fest-noz", "🥞|Crêpes et galettes;🧈|Kouign-amann;🍎|Cidre;🦪|Huîtres"),
  ca: T("sea", "sunset", ["#fcdd09", "#da121a", "#1f6fb2"], "⛪|Sagrada Família;🏞️|Montserrat;🦎|Park Güell;🏖️|Costa Brava", "🍅|Pa amb tomàquet;🧅|Calçots;🍮|Crema catalana;🥘|Fideuà"),
  eu: T("mountains", "day", ["#d52b1e", "#009b48", "#ffffff"], "🏛️|Guggenheim;🏖️|La Concha;⛰️|Gaztelugatxe;🌳|Arbre de Gernika", "🍢|Pintxos;🐟|Bacalao al pil-pil;🍰|Gâteau basque;🍷|Txakoli"),
  "gsw-FR": T("village", "day", ["#c8412e", "#ffffff", "#1f7a4d"], "⛪|Cathédrale de Strasbourg;🏘️|Petite France;🏰|Haut-Kœnigsbourg;🎄|Marchés de Noël", "🥨|Bretzel;🥬|Choucroute;🍰|Kouglof;🔥|Tarte flambée"),
  co: T("mountains", "sunset", ["#000000", "#ffffff", "#1f6fb2"], "🏖️|Bonifacio;⛰️|GR20;🏘️|Calvi;🌊|Calanques de Piana", "🧀|Brocciu;🌰|Farine de châtaigne;🥩|Figatellu;🍰|Fiadone"),
  pl: T("countryside", "morning", ["#ffffff", "#dc143c", "#7a1f1f"], "🏰|Wawel;🏙️|Vieille ville de Varsovie;⛰️|Tatras;⛏️|Mine de sel", "🥟|Pierogi;🥣|Żurek;🍩|Pączki;🌭|Kiełbasa"),
  nl: T("countryside", "day", ["#ae1c28", "#ffffff", "#21468b"], "🌷|Champs de tulipes;🌬️|Moulins;🚲|Canaux d'Amsterdam;🎨|Rijksmuseum", "🧀|Gouda;🍪|Stroopwafel;🐟|Hareng;🍟|Frites"),
  ga: T("countryside", "morning", ["#169b62", "#ffffff", "#ff883e"], "🌊|Falaises de Moher;🏰|Rocher de Cashel;🍀|Connemara;🎻|Pubs et musique", "🍲|Irish stew;🍞|Soda bread;🥔|Colcannon;☕|Irish coffee"),
};

const REGION_THEMES: Record<string, Theme> = {
  Europe: T("countryside", "day", ["#2a4fbf", "#e0a43a", "#c8412e"], "🏰|Château;⛪|Cathédrale;🏛️|Vieille ville;🌉|Pont", "🥖|Pain;🧀|Fromage;🍲|Plat mijoté;🍰|Pâtisserie"),
  Afrique: T("countryside", "sunset", ["#1f7a4d", "#e0a43a", "#c8412e"], "🌳|Baobab;🏘️|Village;🦁|Savane;🥁|Tambours", "🍚|Riz épicé;🍌|Banane plantain;🥜|Sauce arachide;🫓|Galette"),
  "Amériques": T("tropical", "day", ["#1f7a4d", "#e0a43a", "#2a4fbf"], "🌋|Volcan;🌳|Forêt;🏛️|Ruines;🎉|Fête", "🌽|Maïs;🫘|Haricots;🌶️|Piments;🥭|Fruits tropicaux"),
  Asie: T("mountains", "morning", ["#c8412e", "#e0a43a", "#1f7a4d"], "🛕|Temple;⛰️|Montagnes;🌾|Rizières;🏮|Lanternes", "🍚|Riz;🍜|Nouilles;🥟|Raviolis;🍵|Thé"),
  "Océanie": T("sea", "day", ["#0f8a8a", "#e0a43a", "#2a4fbf"], "🏝️|Lagon;🌺|Fleurs;🌋|Volcan;🛶|Pirogue", "🥥|Coco;🐟|Poisson cru;🍍|Ananas;🍠|Taro"),
  Monde: T("city", "day", ["#2a4fbf", "#e0a43a", "#c8412e"], "🗺️|Carte;🏙️|Ville;🌉|Pont;🏛️|Musée", "🍲|Plat local;🥖|Pain;🍵|Boisson;🍰|Dessert"),
};

export function themeFor(code: string): Theme {
  const exact = THEMES[code];
  if (exact) return exact;
  const base = THEMES[code.split("-")[0]];
  if (base) return base;
  return REGION_THEMES[languageByCode(code)?.region ?? "Monde"] ?? REGION_THEMES.Monde;
}
