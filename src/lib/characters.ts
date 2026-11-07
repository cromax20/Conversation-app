// Données et logique des personnages, partagées entre le navigateur et le serveur.

export type Language = {
  code: string; // code ISO 639-1 (ou proche), utilisé pour la voix
  fr: string;
  native: string;
  region?: string;
  cities: string[];
  names: string[];
};

const CORE: Language[] = [
  { code: "en", fr: "Anglais", native: "English", cities: ["Londres", "Manchester", "New York", "Toronto", "Sydney", "Dublin", "Chicago"], names: ["Emma", "Jack", "Olivia", "Liam", "Grace", "Noah", "Chloe"] },
  { code: "zh", fr: "Chinois mandarin", native: "普通话", cities: ["Pékin", "Shanghai", "Chengdu", "Taipei", "Hangzhou", "Xi'an"], names: ["Li Wei", "Wang Fang", "Zhang Min", "Chen Jie", "Liu Yang", "Zhao Lei"] },
  { code: "hi", fr: "Hindi", native: "हिन्दी", cities: ["Delhi", "Jaipur", "Lucknow", "Varanasi", "Bhopal", "Mumbai"], names: ["Priya", "Arjun", "Ananya", "Rohan", "Kavita", "Vikram"] },
  { code: "es", fr: "Espagnol", native: "Español", cities: ["Madrid", "Séville", "Mexico", "Buenos Aires", "Bogota", "Lima"], names: ["Lucía", "Mateo", "Sofía", "Diego", "Carmen", "Javier"] },
  { code: "ar", fr: "Arabe", native: "العربية", cities: ["Le Caire", "Casablanca", "Beyrouth", "Amman", "Tunis", "Dubaï"], names: ["Yasmine", "Omar", "Layla", "Karim", "Nour", "Samir"] },
  { code: "fr", fr: "Français", native: "Français", cities: ["Lyon", "Marseille", "Bruxelles", "Montréal", "Dakar", "Genève"], names: ["Camille", "Lucas", "Inès", "Hugo", "Fatou", "Julien"] },
  { code: "bn", fr: "Bengali", native: "বাংলা", cities: ["Dacca", "Calcutta", "Chittagong", "Sylhet", "Khulna"], names: ["Rina", "Arif", "Tania", "Sabbir", "Mitu", "Rahim"] },
  { code: "pt", fr: "Portugais", native: "Português", cities: ["Lisbonne", "Porto", "São Paulo", "Rio de Janeiro", "Salvador", "Luanda"], names: ["Beatriz", "João", "Mariana", "Pedro", "Ana", "Tiago"] },
  { code: "ru", fr: "Russe", native: "Русский", cities: ["Moscou", "Saint-Pétersbourg", "Kazan", "Novossibirsk", "Sotchi"], names: ["Natalia", "Dmitri", "Olga", "Sergueï", "Irina", "Pavel"] },
  { code: "id", fr: "Indonésien", native: "Bahasa Indonesia", cities: ["Jakarta", "Bandung", "Yogyakarta", "Surabaya", "Denpasar"], names: ["Putri", "Budi", "Dewi", "Agus", "Sari", "Rizky"] },
  { code: "ur", fr: "Ourdou", native: "اردو", cities: ["Lahore", "Karachi", "Islamabad", "Peshawar", "Hyderabad"], names: ["Ayesha", "Bilal", "Sana", "Hamza", "Zainab", "Usman"] },
  { code: "de", fr: "Allemand", native: "Deutsch", cities: ["Berlin", "Munich", "Hambourg", "Vienne", "Zurich", "Cologne"], names: ["Lena", "Jonas", "Hannah", "Felix", "Mia", "Lukas"] },
  { code: "ja", fr: "Japonais", native: "日本語", cities: ["Tokyo", "Osaka", "Kyoto", "Fukuoka", "Sapporo", "Nagoya"], names: ["Yuki", "Haruto", "Aiko", "Kenji", "Sakura", "Takumi"] },
  { code: "pcm", fr: "Pidgin nigérian", native: "Naijá", cities: ["Lagos", "Port Harcourt", "Benin City", "Abuja", "Warri"], names: ["Chioma", "Emeka", "Blessing", "Tunde", "Ngozi", "Femi"] },
  { code: "mr", fr: "Marathi", native: "मराठी", cities: ["Pune", "Mumbai", "Nagpur", "Nashik", "Kolhapur"], names: ["Sneha", "Aditya", "Pooja", "Omkar", "Rutuja", "Sagar"] },
  { code: "vi", fr: "Vietnamien", native: "Tiếng Việt", cities: ["Hanoï", "Hô-Chi-Minh-Ville", "Da Nang", "Hué", "Hoi An"], names: ["Linh", "Minh", "Thảo", "Tuấn", "Hương", "Nam"] },
  { code: "te", fr: "Télougou", native: "తెలుగు", cities: ["Hyderabad", "Vijayawada", "Visakhapatnam", "Tirupati", "Warangal"], names: ["Lakshmi", "Ravi", "Divya", "Srinivas", "Keerthi", "Kiran"] },
  { code: "ha", fr: "Haoussa", native: "Hausa", cities: ["Kano", "Kaduna", "Zaria", "Niamey", "Sokoto"], names: ["Aisha", "Musa", "Hauwa", "Ibrahim", "Zainab", "Sani"] },
  { code: "tr", fr: "Turc", native: "Türkçe", cities: ["Istanbul", "Izmir", "Ankara", "Antalya", "Trabzon"], names: ["Elif", "Mehmet", "Zeynep", "Emre", "Ayşe", "Burak"] },
  { code: "ta", fr: "Tamoul", native: "தமிழ்", cities: ["Chennai", "Madurai", "Coimbatore", "Pondichéry", "Jaffna"], names: ["Meena", "Karthik", "Lakshmi", "Arun", "Divya", "Senthil"] },
];

// Langues et dialectes supplémentaires : « code|nom français|nom natif|région|prénoms|villes ».
// Le code sert d'indice de langue pour la voix quand il est reconnu (sinon détection automatique).
const MORE = `
it|Italien|Italiano|Europe|Giulia,Marco,Chiara,Luca,Francesca,Matteo|Rome,Milan,Naples,Florence,Turin,Bologne
scn|Sicilien|Sicilianu|Europe|Turiddu,Rosalia,Salvo,Concetta,Totò,Agata|Palerme,Catane,Messine,Syracuse
nap|Napolitain|Napulitano|Europe|Gennaro,Assunta,Ciro,Nunzia,Peppe,Carmela|Naples,Pouzzoles,Salerne,Caserte
ca|Catalan|Català|Europe|Jordi,Montserrat,Pau,Núria,Oriol,Laia|Barcelone,Gérone,Valence,Palma,Perpignan
eu|Basque|Euskara|Europe|Aitor,Ane,Iker,Maialen,Unai,Itziar|Bilbao,Saint-Sébastien,Bayonne,Vitoria
gl|Galicien|Galego|Europe|Xoán,Uxía,Brais,Antía,Breixo,Iria|Saint-Jacques-de-Compostelle,Vigo,La Corogne,Lugo
br|Breton|Brezhoneg|Europe|Yann,Maïwenn,Erwan,Gwenaëlle,Loïc,Nolwenn|Quimper,Brest,Lorient,Morlaix,Carhaix
oc|Occitan|Occitan|Europe|Joan,Mirèlha,Pèire,Alienòr,Guilhèm,Rosa|Toulouse,Montpellier,Nîmes,Pau,Nice
co|Corse|Corsu|Europe|Ghjuvanni,Maria,Petru,Ghjulia,Paulu,Santa|Ajaccio,Bastia,Corte,Calvi,Porto-Vecchio
gsw-FR|Alsacien|Elsässisch|Europe|Seppi,Mathilde,Fritz,Odile,Hans,Marie-Jeanne|Strasbourg,Colmar,Mulhouse,Haguenau
gsw-CH|Suisse allemand|Schwiizerdütsch|Europe|Urs,Vreni,Beat,Regula,Reto,Barbara|Zurich,Berne,Bâle,Lucerne
lb|Luxembourgeois|Lëtzebuergesch|Europe|Jang,Mady,Pit,Josée,Lucien,Nathalie|Luxembourg,Esch-sur-Alzette,Ettelbruck,Diekirch
nl|Néerlandais|Nederlands|Europe|Sanne,Daan,Lotte,Bram,Fleur,Thijs|Amsterdam,Rotterdam,Utrecht,La Haye
vls|Flamand|Vlaams|Europe|Wout,Lien,Jef,Fien,Stijn,Ine|Gand,Anvers,Bruges,Louvain,Courtrai
wa|Wallon|Walon|Europe|Djôsef,Marîye,Tchåle,Djèni,Françwès,Lîne|Liège,Namur,Charleroi,Verviers
pl|Polonais|Polski|Europe|Agnieszka,Piotr,Kasia,Tomasz,Magda,Kuba|Varsovie,Cracovie,Gdańsk,Wrocław,Łódź
uk|Ukrainien|Українська|Europe|Oksana,Taras,Iryna,Andriy,Olena,Bohdan|Kyiv,Lviv,Odessa,Kharkiv,Dnipro
ro|Roumain|Română|Europe|Ioana,Andrei,Elena,Mihai,Ana,Radu|Bucarest,Cluj-Napoca,Iași,Timișoara,Chișinău
el|Grec|Ελληνικά|Europe|Eleni,Giorgos,Maria,Nikos,Katerina,Kostas|Athènes,Thessalonique,Héraklion,Patras,Nicosie
sq|Albanais|Shqip|Europe|Arta,Besnik,Elira,Dritan,Jonida,Arben|Tirana,Durrës,Shkodër,Pristina,Vlorë
sr|Serbe|Српски|Europe|Milica,Nikola,Jelena,Marko,Ana,Stefan|Belgrade,Novi Sad,Niš,Kragujevac
hr|Croate|Hrvatski|Europe|Ivana,Luka,Petra,Ivan,Marija,Josip|Zagreb,Split,Rijeka,Dubrovnik,Zadar
bs|Bosnien|Bosanski|Europe|Amra,Emir,Lejla,Adnan,Selma,Haris|Sarajevo,Mostar,Tuzla,Banja Luka
bg|Bulgare|Български|Europe|Petya,Georgi,Desislava,Ivan,Mariya,Dimitar|Sofia,Plovdiv,Varna,Bourgas
cs|Tchèque|Čeština|Europe|Tereza,Jakub,Lucie,Ondřej,Klára,Tomáš|Prague,Brno,Ostrava,Plzeň
sk|Slovaque|Slovenčina|Europe|Zuzana,Martin,Katarína,Peter,Lucia,Juraj|Bratislava,Košice,Žilina,Nitra
hu|Hongrois|Magyar|Europe|Eszter,Bence,Réka,Gábor,Anna,Levente|Budapest,Debrecen,Szeged,Pécs
sv|Suédois|Svenska|Europe|Astrid,Erik,Maja,Oskar,Elsa,Lars|Stockholm,Göteborg,Malmö,Uppsala
no|Norvégien|Norsk|Europe|Ingrid,Ola,Sigrid,Magnus,Nora,Henrik|Oslo,Bergen,Trondheim,Tromsø
da|Danois|Dansk|Europe|Freja,Mads,Ida,Rasmus,Sofie,Frederik|Copenhague,Aarhus,Odense,Aalborg
fi|Finnois|Suomi|Europe|Aino,Mikko,Emilia,Juha,Siiri,Ville|Helsinki,Tampere,Turku,Oulu
is|Islandais|Íslenska|Europe|Guðrún,Jón,Sigríður,Gunnar,Katrín,Einar|Reykjavik,Akureyri,Ísafjörður
ga|Irlandais|Gaeilge|Europe|Aoife,Seán,Siobhán,Cian,Niamh,Pádraig|Galway,Dublin,Cork,Donegal
cy|Gallois|Cymraeg|Europe|Cerys,Dafydd,Megan,Rhys,Seren,Gethin|Cardiff,Swansea,Bangor,Aberystwyth
gd|Gaélique écossais|Gàidhlig|Europe|Mairi,Calum,Seonaid,Ruairidh,Ealasaid,Iain|Stornoway,Inverness,Glasgow,Portree
lt|Lituanien|Lietuvių|Europe|Rūta,Mantas,Gintarė,Tomas,Eglė,Jonas|Vilnius,Kaunas,Klaipėda
lv|Letton|Latviešu|Europe|Līga,Jānis,Ilze,Mārtiņš,Anna,Kārlis|Riga,Daugavpils,Liepāja
et|Estonien|Eesti|Europe|Kadri,Mart,Liis,Andres,Triin,Rasmus|Tallinn,Tartu,Pärnu
pt-BR|Portugais brésilien|Português do Brasil|Amériques|Larissa,Gabriel,Camila,Rafael,Juliana,Thiago|São Paulo,Rio de Janeiro,Recife,Belo Horizonte,Porto Alegre
es-AR|Espagnol argentin (rioplatense)|Castellano rioplatense|Amériques|Valentina,Facundo,Agustina,Nicolás,Florencia,Martín|Buenos Aires,Córdoba,Rosario,Mendoza,Montevideo
es-MX|Espagnol mexicain|Español mexicano|Amériques|Guadalupe,José Luis,Ximena,Alejandro,Fernanda,Emiliano|Mexico,Guadalajara,Oaxaca,Monterrey,Puebla
es-CU|Espagnol cubain|Español cubano|Amériques|Yanelis,Yoandri,Marisleidy,Osmany,Daylin,Reinier|La Havane,Santiago de Cuba,Trinidad,Cienfuegos
ht|Créole haïtien|Kreyòl ayisyen|Amériques|Fabiola,Jean-Robert,Nadège,Wilner,Mirlande,Ricardo|Port-au-Prince,Cap-Haïtien,Jacmel,Les Cayes,Gonaïves
gcf|Créole guadeloupéen / martiniquais|Kréyòl|Amériques|Ludivine,Joël,Manuella,Fred,Sully,Nadia|Pointe-à-Pitre,Fort-de-France,Basse-Terre,Le Lamentin,Sainte-Anne
qu|Quechua|Runasimi|Amériques|Wayra,Inti,Killa,Amaru,Sisa,Yupanqui|Cuzco,Ayacucho,Puno,Cochabamba,Huancayo
gn|Guarani|Avañe'ẽ|Amériques|Jasy,Arami,Tupã,Yeruti,Ñandu,Mbarete|Asunción,Encarnación,Ciudad del Este,Concepción
nah|Nahuatl|Nāhuatl|Amériques|Citlali,Tonatiuh,Xochitl,Cuauhtémoc,Itzel,Tlaloc|Milpa Alta,Cuetzalan,Tlaxcala,Huejutla
ary|Arabe marocain (darija)|الدارجة|Afrique|Khadija,Youssef,Salma,Hamza,Meryem,Mehdi|Casablanca,Fès,Marrakech,Tanger,Agadir
arq|Arabe algérien (darja)|الدارجة الجزائرية|Afrique|Amina,Karim,Lynda,Sofiane,Nesrine,Walid|Alger,Oran,Constantine,Annaba,Tlemcen
aeb|Arabe tunisien (derja)|تونسي|Afrique|Ines,Skander,Rim,Aymen,Sarra,Hedi|Tunis,Sfax,Sousse,Bizerte,Djerba
arz|Arabe égyptien|مصري|Afrique|Mona,Ahmed,Dina,Mahmoud,Heba,Mostafa|Le Caire,Alexandrie,Louxor,Assouan
apc|Arabe levantin (libanais, syrien)|شامي|Asie|Rana,Fadi,Maya,Ziad,Lina,Rami|Beyrouth,Damas,Alep,Tripoli,Amman
afb|Arabe du Golfe|خليجي|Asie|Noura,Faisal,Mariam,Khalid,Hessa,Saeed|Dubaï,Koweït City,Doha,Manama,Riyad
kab|Kabyle|Taqbaylit|Afrique|Lounès,Tassadit,Idir,Djedjiga,Massinissa,Thiziri|Tizi Ouzou,Béjaïa,Bouira,Azazga,Larbaâ Nath Irathen
shi|Chleuh (tachelhit)|Taclḥiyt|Afrique|Brahim,Itto,Lahcen,Fadma,Moha,Tafraout|Agadir,Tiznit,Taroudant,Tafraout,Ouarzazate
tzm|Amazigh du Moyen Atlas|Tamaziɣt|Afrique|Hmad,Itto,Mimoun,Touda,Aksel,Tilelli|Khénifra,Azrou,Midelt,Ifrane
wo|Wolof|Wolof|Afrique|Awa,Moussa,Fatou,Mamadou,Ndeye,Cheikh|Dakar,Saint-Louis,Thiès,Touba,Banjul
bm|Bambara|Bamanankan|Afrique|Aminata,Seydou,Kadiatou,Bakary,Mariam,Oumar|Bamako,Ségou,Sikasso,Mopti
ff|Peul (pulaar)|Pulaar|Afrique|Hawa,Amadou,Kadija,Abdoulaye,Mariama,Oumarou|Labé,Podor,Maroua,Mopti,Kaédi
snk|Soninké|Sooninkanxanne|Afrique|Hawa,Samba,Coumba,Demba,Fanta,Bakary|Kayes,Bakel,Sélibaby,Nioro du Sahel
ln|Lingala|Lingála|Afrique|Grâce,Patrick,Mireille,Christian,Nadège,Junior|Kinshasa,Brazzaville,Mbandaka,Kisangani
kg|Kikongo|Kikongo|Afrique|Nsimba,Kiese,Makiadi,Nzuzi,Luzolo,Mbemba|Matadi,Pointe-Noire,Mbanza-Ngungu,Boma
sw|Swahili|Kiswahili|Afrique|Amani,Juma,Neema,Baraka,Zawadi,Hamisi|Dar es Salam,Zanzibar,Mombasa,Nairobi,Arusha
yo|Yoruba|Yorùbá|Afrique|Adeola,Babatunde,Funmilayo,Olumide,Yetunde,Segun|Ibadan,Lagos,Abeokuta,Ilé-Ifẹ̀,Cotonou
ig|Igbo|Asụsụ Igbo|Afrique|Adaeze,Chinedu,Ifeoma,Obinna,Nneka,Ikenna|Enugu,Onitsha,Owerri,Aba
am|Amharique|አማርኛ|Afrique|Selam,Dawit,Hiwot,Yonas,Meron,Abebe|Addis-Abeba,Gondar,Bahir Dar,Lalibela
ti|Tigrigna|ትግርኛ|Afrique|Helen,Yonas,Saba,Filmon,Luwam,Tesfay|Asmara,Mekele,Keren,Adigrat
so|Somali|Soomaali|Afrique|Hodan,Abdi,Fadumo,Mohamed,Sahra,Ahmed|Mogadiscio,Hargeisa,Djibouti,Kismayo
mg|Malgache|Malagasy|Afrique|Hery,Voahangy,Rivo,Lalao,Tiana,Fanja|Antananarivo,Toamasina,Fianarantsoa,Mahajanga
rw|Kinyarwanda|Ikinyarwanda|Afrique|Aline,Eric,Ange,Olivier,Divine,Jean-Paul|Kigali,Huye,Musanze,Rubavu
zu|Zoulou|isiZulu|Afrique|Thandiwe,Sipho,Nomvula,Themba,Zanele,Bongani|Durban,Johannesburg,Pietermaritzburg,Soweto
xh|Xhosa|isiXhosa|Afrique|Nomsa,Lwazi,Ayanda,Siya,Zintle,Luvo|Le Cap,East London,Mthatha,Gqeberha
tw|Twi (akan)|Twi|Afrique|Akosua,Kwame,Ama,Kofi,Abena,Yaw|Kumasi,Accra,Koforidua,Cape Coast
ee|Éwé|Eʋegbe|Afrique|Edem,Senam,Kossi,Afi,Mawuli,Dzifa|Lomé,Ho,Kpalimé,Aflao
fon|Fon|Fɔngbè|Afrique|Sèna,Codjo,Houéfa,Mahougnon,Akossiwa,Dossou|Cotonou,Abomey,Porto-Novo,Ouidah
kea|Créole cap-verdien|Kriolu|Afrique|Djénifer,Nelson,Lurdes,Toi,Mirtes,Djon|Praia,Mindelo,Santa Maria,Assomada
rcf|Créole réunionnais|Kréol rénioné|Afrique|Mélissa,Jean-Hugues,Nathalie,Teddy,Vanessa,Ludovic|Saint-Denis,Saint-Pierre,Le Tampon,Saint-Paul,Cilaos
mfe|Créole mauricien|Kreol morisien|Afrique|Priya,Jean-Marc,Anoushka,Kevin,Shabnam,Dev|Port-Louis,Curepipe,Mahébourg,Rose-Hill
zdj|Comorien (shikomori)|Shikomori|Afrique|Zaïnaba,Said,Fatima,Ali,Mariama,Ahmed|Moroni,Mutsamudu,Fomboni,Mamoudzou
fa|Persan|فارسی|Asie|Shirin,Reza,Maryam,Arash,Leila,Dariush|Téhéran,Ispahan,Chiraz,Tabriz,Mashhad
prs|Dari|دری|Asie|Mursal,Ahmad,Farishta,Wahid,Zarghuna,Hamid|Kaboul,Hérat,Mazar-i-Sharif,Bamiyan
ps|Pachto|پښتو|Asie|Malalai,Gulalai,Zarmina,Wais,Khan,Asad|Kandahar,Peshawar,Jalalabad,Quetta
ckb|Kurde (sorani)|کوردی|Asie|Shilan,Karwan,Nazdar,Hiwa,Rezan,Aram|Erbil,Souleimaniye,Kirkouk,Sanandaj
kmr|Kurde (kurmandji)|Kurmancî|Asie|Berfîn,Rojhat,Dilan,Azad,Rojda,Şervan|Diyarbakır,Duhok,Qamichli,Van,Mardin
he|Hébreu|עברית|Asie|Noa,Itai,Tamar,Yonatan,Shira,Eitan|Tel Aviv,Jérusalem,Haïfa,Eilat
hy|Arménien|Հայերեն|Asie|Anahit,Aram,Lusine,Tigran,Nare,Armen|Erevan,Gyumri,Vanadzor,Stepanakert
ka|Géorgien|ქართული|Asie|Nino,Giorgi,Tamar,Levan,Mariam,Davit|Tbilissi,Batoumi,Koutaïssi,Telavi
az|Azéri|Azərbaycanca|Asie|Leyla,Elvin,Aysel,Rashad,Günay,Orxan|Bakou,Gandja,Sheki,Tabriz
uz|Ouzbek|Oʻzbekcha|Asie|Dilnoza,Bekzod,Malika,Jasur,Nigora,Sardor|Tachkent,Samarcande,Boukhara,Khiva
kk|Kazakh|Қазақша|Asie|Aigerim,Nurlan,Dana,Yerlan,Madina,Daulet|Almaty,Astana,Chymkent,Turkestan
ky|Kirghize|Кыргызча|Asie|Aizada,Bakyt,Nurzhan,Aibek,Cholpon,Emil|Bichkek,Och,Karakol
mn|Mongol|Монгол|Asie|Saraa,Bat-Erdene,Oyuunaa,Temuujin,Enkhjin,Ganbold|Oulan-Bator,Erdenet,Kharkhorin
ko|Coréen|한국어|Asie|Ji-woo,Min-jun,Seo-yeon,Do-hyun,Ha-eun,Ji-ho|Séoul,Busan,Daegu,Jeju,Gwangju
yue|Cantonais|廣東話|Asie|Ka-yan,Wai-lun,Mei-ling,Chi-keung,Wing-sze,Ho-yin|Hong Kong,Canton,Macao,Foshan
nan|Hokkien / taïwanais|閩南語|Asie|A-hua,A-ming,Siok-ling,Chhun-bo,Bi-hun,Kim-tsui|Tainan,Kaohsiung,Taipei,Xiamen,Penang
wuu|Shanghaïen (wu)|上海话|Asie|Xiaomei,Ahua,Lili,Agen,Meifang,Jianguo|Shanghai,Suzhou,Ningbo,Hangzhou
th|Thaï|ภาษาไทย|Asie|Ploy,Somchai,Nong,Anan,Malee,Krit|Bangkok,Chiang Mai,Phuket,Ayutthaya
lo|Lao|ພາສາລາວ|Asie|Souk,Khamla,Noy,Bounmy,Vanh,Phet|Vientiane,Luang Prabang,Pakse,Savannakhet
km|Khmer|ភាសាខ្មែរ|Asie|Sokha,Dara,Sreymom,Vuthy,Chanthy,Rithy|Phnom Penh,Siem Reap,Battambang,Kampot
my|Birman|မြန်မာ|Asie|Thiri,Aung,Hnin,Kyaw,Su,Min|Rangoun,Mandalay,Bagan,Naypyidaw
tl|Tagalog / filipino|Tagalog|Asie|Maria,Jose,Angelica,Mark,Joy,Paolo|Manille,Quezon City,Cebu,Davao
ms|Malais|Bahasa Melayu|Asie|Nur Aisyah,Hafiz,Siti,Amir,Farah,Danial|Kuala Lumpur,Malacca,Penang,Kota Kinabalu
jv|Javanais|Basa Jawa|Asie|Sri,Bambang,Wulan,Joko,Ayu,Teguh|Yogyakarta,Solo,Semarang,Malang
pa|Pendjabi|ਪੰਜਾਬੀ|Asie|Harpreet,Gurpreet,Simran,Jaspal,Manpreet,Arjun|Amritsar,Lahore,Ludhiana,Chandigarh
gu|Gujarati|ગુજરાતી|Asie|Hetal,Jignesh,Krupa,Parth,Riya,Nirav|Ahmedabad,Surat,Vadodara,Rajkot
kn|Kannada|ಕನ್ನಡ|Asie|Kavya,Prajwal,Sahana,Darshan,Nandini,Kiran|Bangalore,Mysore,Mangalore,Hubli
ml|Malayalam|മലയാളം|Asie|Anjali,Arjun,Lakshmi,Vishnu,Meera,Rahul|Kochi,Trivandrum,Kozhikode,Thrissur
ne|Népalais|नेपाली|Asie|Sita,Ramesh,Anjali,Bikash,Sunita,Prakash|Katmandou,Pokhara,Lalitpur,Bhaktapur
si|Cinghalais|සිංහල|Asie|Nadeesha,Kasun,Dilini,Chamara,Ishara,Nuwan|Colombo,Kandy,Galle,Anuradhapura
mi|Maori|Te Reo Māori|Océanie|Aroha,Tama,Mere,Wiremu,Hinemoa,Rawiri|Rotorua,Auckland,Wellington,Gisborne
haw|Hawaïen|ʻŌlelo Hawaiʻi|Océanie|Leilani,Kai,Malia,Keoni,Noelani,Makoa|Honolulu,Hilo,Lahaina,Kailua
ty|Tahitien|Reo Tahiti|Océanie|Hinano,Teva,Vaimiti,Manua,Heiata,Tamatea|Papeete,Faa'a,Moorea,Bora-Bora
yi|Yiddish|ייִדיש|Europe|Rivke,Moyshe,Sore,Yankl,Khaye,Shmuel|Anvers,New York,Jérusalem,Montréal
lad|Judéo-espagnol (ladino)|Djudeo-espanyol|Europe|Rachel,Avram,Sultana,Yosef,Luna,Behor|Istanbul,Salonique,Izmir,Jérusalem
rom|Romani|Romani čhib|Europe|Esmeralda,Django,Tsura,Mircea,Florica,Luludja|Skopje,Košice,Bucarest,Perpignan
`;

const CORE_REGION: Record<string, string> = {
  en: "Monde", zh: "Asie", hi: "Asie", es: "Monde", ar: "Monde", fr: "Monde", bn: "Asie", pt: "Monde", ru: "Europe",
  id: "Asie", ur: "Asie", de: "Europe", ja: "Asie", pcm: "Afrique", mr: "Asie", vi: "Asie", te: "Asie", ha: "Afrique", tr: "Europe", ta: "Asie",
};
for (const l of CORE) l.region = CORE_REGION[l.code] ?? "Monde";

export const LANGUAGES: Language[] = [
  ...CORE,
  ...MORE.trim().split("\n").map((line) => {
    const [code, fr, native, region, names, cities] = line.split("|");
    return { code, fr, native, region, names: names.split(","), cities: cities.split(",") };
  }),
];

export const REGIONS = ["Monde", "Europe", "Afrique", "Amériques", "Asie", "Océanie"];

export const JOBS = ["boulanger·ère", "chauffeur·se de taxi", "infirmier·ère", "vendeur·se au marché", "étudiant·e en architecture", "guide touristique", "barista", "professeur·e de musique", "mécanicien·ne", "pharmacien·ne", "réceptionniste d'hôtel", "fleuriste", "cuisinier·ère de rue", "libraire", "coiffeur·se", "agent·e immobilier·ère", "retraité·e passionné·e de jardinage", "photographe", "agriculteur·rice", "développeur·se web"];
export const TRAITS = ["chaleureux·se et bavard·e", "calme et très patient·e", "drôle et un peu taquin·e", "curieux·se, pose beaucoup de questions", "direct·e mais bienveillant·e", "enthousiaste, adore partager sa culture", "un peu timide au début", "nostalgique, aime raconter des souvenirs", "pressé·e mais serviable", "philosophe, aime les grandes questions"];
export const HOBBIES = ["la cuisine familiale", "le football", "les séries", "la randonnée", "la musique traditionnelle", "les jeux vidéo", "la photographie", "le cinéma", "les voyages", "le jardinage", "la danse", "la lecture"];
export const SCENES: [string, string][] = [
  ["Au marché", "l'élève veut acheter des fruits et négocier le prix"],
  ["Au café", "l'élève commande une boisson et engage la conversation"],
  ["Chez le médecin", "l'élève explique ses symptômes"],
  ["Demander son chemin", "l'élève est perdu·e et cherche une adresse"],
  ["À l'hôtel", "l'élève fait son check-in et a un problème avec la chambre"],
  ["Nouveau voisin", "l'élève vient d'emménager et se présente"],
  ["Entretien d'embauche", "l'élève passe un entretien pour un petit emploi"],
  ["Au restaurant", "l'élève commande un repas et pose des questions sur les plats"],
  ["Dans le taxi", "l'élève discute pendant le trajet"],
  ["À la gare", "l'élève achète un billet et se renseigne sur les horaires"],
  ["Soirée entre amis", "l'élève rencontre des gens à une fête"],
  ["Au téléphone", "l'élève appelle pour prendre un rendez-vous"],
  ["Magasin de vêtements", "l'élève cherche une taille et veut échanger un article"],
  ["Visite touristique", "l'élève découvre un lieu célèbre de la ville"],
  ["Petite discussion", "l'élève parle de sa journée, de sa famille et de ses loisirs"],
  ["À la banque", "l'élève veut ouvrir un compte et comprendre les frais"],
  ["Visite d'appartement", "l'élève visite un appartement à louer"],
  ["Premier jour au travail", "l'élève rencontre ses nouveaux collègues"],
  ["À la pharmacie", "l'élève cherche un médicament sans ordonnance"],
  ["Premier rendez-vous", "l'élève discute lors d'un premier rendez-vous"],
];
export const LEVELS = {
  A1: "phrases très courtes, mots du quotidien, parle lentement",
  A2: "phrases courtes, vocabulaire courant, présent et passé simple",
  B1: "phrases naturelles, quelques expressions idiomatiques",
  B2: "rythme naturel, expressions courantes, humour léger",
  C1: "langue authentique et nuancée, argot et références culturelles",
  C2: "comme avec un·e natif·ve : registre soutenu ou familier, jeux de mots, sous-entendus",
} as const;
export type Level = keyof typeof LEVELS;
export const LEVEL_LABELS: Record<Level, string> = { A1: "A1 · débutant", A2: "A2 · élémentaire", B1: "B1 · intermédiaire", B2: "B2 · avancé", C1: "C1 · autonome", C2: "C2 · maîtrise" };
export const LEVEL_ORDER: Level[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
// Langues de l'élève proposées (codes BCP 47). Le nom affiché vient de Intl.DisplayNames.
export const NATIVE_CODES = ["fr", "en", "es", "pt", "ar", "de", "it", "nl", "tr", "pl", "ro", "ru", "uk", "zh", "ja", "ko", "hi", "vi", "fa", "sw", "wo", "ln", "ber", "ht"];
export const AGES = [19, 23, 27, 31, 34, 38, 42, 47, 53, 58, 64, 71];
export const MAX_CONTEXT_LENGTH = 300;

export type Character = { name: string; age: number; city: string; job: string; trait: string; hobby: string };

/** Valeur spéciale de `language` : langue ou dialecte saisi librement. */
export const CUSTOM = "custom";
export const MAX_FIELD_LENGTH = 60;

export type ConversationSetup = {
  language: string; // code d'une langue de la liste, ou CUSTOM
  customLanguage?: string; // ex. « kabyle de Tizi Ouzou », si language = CUSTOM
  level: Level;
  nativeLang: string;
  character: Character; // name / city peuvent être vides : le personnage les choisit
  sceneIndex: number | null; // index dans SCENES, ou null si situation libre / discussion libre
  context: string; // situation libre (vide si scène prédéfinie)
  freeTalk?: boolean; // discussion libre : aucun scénario, on parle de tout
};

const pick = <T,>(a: readonly T[], rand: () => number = Math.random): T => a[Math.floor(rand() * a.length)];

export function languageByCode(code: string): Language | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

/** Nom affiché de la langue, ex. « Kabyle » ou la saisie libre. */
export function languageName(setup: Pick<ConversationSetup, "language" | "customLanguage">): string {
  if (setup.language === CUSTOM) return (setup.customLanguage ?? "").trim();
  return languageByCode(setup.language)?.fr ?? setup.language;
}

/** Clé de progression : une par langue (les saisies libres sont normalisées). */
export function progressKey(setup: Pick<ConversationSetup, "language" | "customLanguage">): string {
  if (setup.language !== CUSTOM) return setup.language;
  return "custom:" + (setup.customLanguage ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
}

export function randomCharacter(lang: Language | null, rand: () => number = Math.random): Character {
  return {
    name: lang ? pick(lang.names, rand) : "",
    age: pick(AGES, rand),
    city: lang ? pick(lang.cities, rand) : "",
    job: pick(JOBS, rand),
    trait: pick(TRAITS, rand),
    hobby: pick(HOBBIES, rand),
  };
}

export function randomSceneIndex(rand: () => number = Math.random): number {
  return Math.floor(rand() * SCENES.length);
}

/** Vérifie les réglages envoyés par le navigateur (nom et ville sont libres). */
export function isValidSetup(setup: ConversationSetup): boolean {
  const c = setup.character;
  if (setup.language === CUSTOM) {
    const n = (setup.customLanguage ?? "").trim();
    if (n.length < 2 || n.length > MAX_FIELD_LENGTH) return false;
  } else if (!languageByCode(setup.language)) return false;
  return (
    c.name.length <= MAX_FIELD_LENGTH && c.city.length <= MAX_FIELD_LENGTH &&
    Number.isInteger(c.age) && c.age >= 16 && c.age <= 99 &&
    JOBS.includes(c.job) && TRAITS.includes(c.trait) && HOBBIES.includes(c.hobby)
  );
}

export function describeScene(setup: Pick<ConversationSetup, "sceneIndex" | "context" | "freeTalk">): { title: string; description: string } {
  const own = setup.context.trim();
  if (own) return { title: "Votre situation", description: own };
  if (setup.freeTalk) return { title: "Discussion libre", description: "on parle de tout et de rien, au fil de la conversation" };
  const s = SCENES[setup.sceneIndex ?? 0];
  return { title: s[0], description: s[1] };
}

export function languageLine(setup: Pick<ConversationSetup, "language" | "customLanguage">): string {
  if (setup.language === CUSTOM) {
    const name = languageName(setup);
    return `Tu parles uniquement ${name}, tel qu'on le parle vraiment au quotidien (vocabulaire, prononciation et tournures locales). Si c'est un dialecte ou une langue peu documentée, reste au plus près de l'usage réel ; si tu n'es pas sûr·e d'un mot, préfère une tournure simple et courante dans cette variété plutôt que d'emprunter à une langue voisine.`;
  }
  const lang = languageByCode(setup.language)!;
  return `Tu parles uniquement ${lang.fr.toLowerCase()} (${lang.native}).`;
}

/** Consigne système donnée au personnage (même base que l'artifact d'origine). */
export function buildSystemPrompt(setup: ConversationSetup): string {
  const { name, age, city, job, trait, hobby } = setup.character;
  const nat = setup.nativeLang;
  const own = setup.context.trim();
  const scene = describeScene(setup);
  const free = !own && setup.freeTalk;
  const ctx = own ? own : `${scene.title.toLowerCase()} — ${scene.description}`;
  const who = name.trim() ? `Tu es ${name.trim()}, ${age} ans` : `Tu es un personnage de ${age} ans dont tu choisis toi-même le prénom, typique de la région`;
  const where = city.trim() ? ` à ${city.trim()}` : ` dans une ville ou un village typique où l'on parle cette langue`;
  return `${who}, ${job}${where}. Tu es ${trait} et tu adores ${hobby}.
${languageLine(setup)} Niveau ${setup.level} : ${LEVELS[setup.level]}.
L'élève parle ${nat} et veut s'entraîner à la conversation.
${free
  ? `Pas de scénario : c'est une discussion libre et naturelle, comme entre deux personnes qui se parlent vraiment. L'élève peut parler de ce qu'il·elle veut : suis ses sujets, réagis sincèrement, partage aussi tes avis, tes souvenirs et ta vie, et laisse la conversation aller où elle va.`
  : `Contexte : ${ctx}.
Joue la scène de façon naturelle et réaliste. Si le contexte l'exige, adapte ton rôle (par exemple propriétaire, serveur ou collègue) tout en gardant ta personnalité.`}

Règles :
- ${free ? "Ouvre la conversation simplement, par une salutation chaleureuse" : "Commence la scène toi-même avec une première réplique"}${name.trim() ? "" : " (présente-toi avec ton prénom)"}.
- Réponds en 1 à 3 phrases, comme dans une vraie conversation.
- ${free ? "Relance la conversation quand elle s'essouffle, mais sans poser une question à chaque fois : réagis comme une vraie personne." : "Termine chaque réponse par une question pour relancer."}
- Si l'élève fait une erreur, reformule correctement sa phrase dans ta réponse, sans faire de leçon.
- Si l'écriture n'est pas latine, ajoute la transcription phonétique entre parenthèses.
- Si l'élève écrit "help", explique brièvement en ${nat}, puis reprends.
- Si l'élève écrit "stop", sors du personnage et donne en ${nat} : 3 conseils et 5 mots nouveaux avec leur traduction.`;
}

export function displayName(c: Character): string {
  return c.name.trim() || "Votre interlocuteur·rice";
}

export function conversationTitle(setup: ConversationSetup): string {
  return `${displayName(setup.character)} · ${describeScene(setup).title} · ${languageName(setup)}`;
}

/** Premier message envoyé à Claude pour qu'il ouvre la scène (jamais affiché). */
export const KICKOFF = "(Début de la scène. Ouvre la conversation.)";

// ---- Appel vidéo ----

export const EXPRESSIONS = ["neutre", "sourire", "rire", "surpris", "pensif", "inquiet"] as const;
export type Expression = (typeof EXPRESSIONS)[number];

/** Sépare la balise d'expression du début d'une réplique : « [sourire] Bonjour ! ». */
export function splitExpression(raw: string): { expression: Expression | null; text: string } {
  const m = raw.match(/^\s*\[([^\]]{1,20})\]\s*/);
  if (!m) return { expression: null, text: raw };
  const tag = m[1].trim().toLowerCase() as Expression;
  return { expression: EXPRESSIONS.includes(tag) ? tag : null, text: raw.slice(m[0].length) };
}

export function buildCallPrompt(opts: {
  language: string; customLanguage?: string; level: Level; nativeLang: string;
  name: string; age: number; place: string; topic: string;
}): string {
  const where = opts.place.trim() ? ` qui vit à ${opts.place.trim()}` : "";
  const topic = opts.topic.trim() ? `L'élève aimerait parler de : ${opts.topic.trim()}.` : "Parle de la vie de tous les jours, de ta région et de ce que l'élève a envie de raconter.";
  return `Tu es ${opts.name.trim() || "un personnage qui choisit lui-même un prénom typique de sa région"}, ${opts.age} ans${where}. Tu es en appel vidéo avec un·e élève qui apprend ta langue, comme un appel FaceTime entre amis.
${languageLine(opts)} Niveau ${opts.level} : ${LEVELS[opts.level]}.
L'élève parle ${opts.nativeLang}. ${topic}

Règles de l'appel :
- Commence CHAQUE réplique par une balise d'expression entre crochets, choisie parmi : [neutre] [sourire] [rire] [surpris] [pensif] [inquiet]. Exemple : « [sourire] … ». Choisis celle qui correspond à ton émotion.
- Tes répliques sont parlées : 1 ou 2 phrases courtes et naturelles, sans emoji, sans liste, sans mise en forme, sans transcription phonétique.
- Décroche toi-même avec une salutation chaleureuse et une question.
- Termine presque toujours par une question pour relancer.
- Si l'élève fait une erreur, reprends naturellement la bonne forme dans ta réponse, sans faire de leçon.
- Si l'élève écrit "help", aide-le en une phrase en ${opts.nativeLang}, puis reprends dans ta langue.`;
}
