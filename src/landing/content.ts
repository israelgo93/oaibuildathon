export const LANDING_LINKS = {
  event: 'https://luma.com/buildathon.porto',
  global: 'https://openai.com/build-week/',
  gpt: 'https://openai.com/index/gpt-5-6/',
  registration: '/registro',
  buildersWhatsapp: 'https://chat.whatsapp.com/GNoZ7SDOWMhIW6a2tbZypy',
} as const

export const SUBMISSION_DEADLINE_FALLBACK = '2026-07-21T16:00:00-05:00'
export const HERO_VIDEO_RANGE = 0.72

export const EVENT_DETAILS = {
  year: '2026',
  location: 'Portoviejo / Ecuador',
  dateShort: '21 de julio',
  dateLong: 'Martes 21 de julio de 2026',
  modelLaunchDate: '09.07.2026',
} as const

export const PRIZE_TOTAL_CREDITS = 8_500
export const PRIZE_TOTAL_DISPLAY = '8.500'

export const LANDING_ASSETS = {
  hero: {
    small: '/assets/hero-1280.webp',
    medium: '/assets/hero-2560.webp',
    large: '/assets/hero-3840.webp',
    video: '/assets/video-orbital.mp4',
  },
  deepSpace: '/assets/deep-space-1600.webp',
  poster: '/assets/portoviejo-poster-1200.webp',
  globalOrbit: {
    small: '/assets/global-orbit-1280.webp',
    medium: '/assets/global-orbit-2560.webp',
    large: '/assets/global-orbit-3840.webp',
  },
  solarLimb: {
    small: '/assets/solar-limb-1280.webp',
    medium: '/assets/solar-limb-2560.webp',
    large: '/assets/solar-limb-3840.webp',
  },
  lunarHorizon: {
    small: '/assets/lunar-horizon-1280.webp',
    medium: '/assets/lunar-horizon-2560.webp',
    large: '/assets/lunar-horizon-3840.webp',
  },
} as const

export const LANDING_SCENE_IDS = [
  'top',
  'experiencia',
  'contexto',
  'modelos',
  'agenda',
  'premios',
  'final',
] as const

export type LandingSceneId = (typeof LANDING_SCENE_IDS)[number]

export const LANDING_VISUAL_SCENE_IDS = [
  'top',
  'experiencia',
  'contexto',
  'modelos',
  'agenda',
  'premios',
  'aprendizajes',
  'vitrina',
  'final',
  'comunidades',
] as const

export type LandingVisualSceneId = (typeof LANDING_VISUAL_SCENE_IDS)[number]

export interface SceneNavigationItem {
  id: LandingSceneId
  shortLabel: string
  label: string
}

export const sceneNavigation: readonly SceneNavigationItem[] = [
  { id: 'top', shortLabel: '00', label: 'Inicio' },
  { id: 'experiencia', shortLabel: '01', label: 'Portoviejo' },
  { id: 'contexto', shortLabel: '02', label: 'Mundo' },
  { id: 'modelos', shortLabel: '03', label: 'Sistema' },
  { id: 'agenda', shortLabel: '04', label: 'Agenda' },
  { id: 'premios', shortLabel: '05', label: 'Premios' },
  { id: 'final', shortLabel: '06', label: 'Participar' },
]

export interface AgendaItem {
  time: string
  title: string
  description: string
}

export const agenda: readonly AgendaItem[] = [
  {
    time: '10:00—10:30',
    title: 'Registro y bienvenida',
    description: 'Acreditación, contexto de OpenAI Build Week e introducción a Codex.',
  },
  {
    time: '10:30—11:00',
    title: 'Equipos en órbita',
    description: 'Presentación de la dinámica y conformación de equipos de trabajo.',
  },
  {
    time: '11:30—13:00',
    title: 'Workshop técnico y retos',
    description: 'Tecnologías, experiencias y prácticas para construir con Codex. El bloque cierra con el lanzamiento oficial de los retos y el inicio de la construcción.',
  },
  {
    time: '13:00—14:00',
    title: 'Coffee break',
    description: 'Pausa para conectar, contrastar ideas y recargar energía.',
  },
  {
    time: '14:00—16:00',
    title: 'Sprint de construcción',
    description: 'Codex, código, iteración y mentoría para llevar el prototipo a una versión demostrable.',
  },
  {
    time: '16:00—16:30',
    title: 'Demos y evaluación',
    description: 'Cada equipo presenta lo que construyó ante la comunidad y el jurado.',
  },
  {
    time: '16:30—17:00',
    title: 'Premiación y cierre',
    description: 'Resultados, reconocimientos y el siguiente paso para seguir construyendo.',
  },
]

export interface ModelItem {
  name: 'Sol' | 'Terra' | 'Luna'
  code: string
  role: string
  description: string
  className: string
}

export const models: readonly ModelItem[] = [
  {
    name: 'Sol',
    code: 'GPT-5.6 / 01',
    role: 'Inteligencia de frontera',
    description: 'El modelo insignia de la familia, creado para el trabajo más exigente en coding, conocimiento, ciencia y seguridad.',
    className: 'body-sol',
  },
  {
    name: 'Terra',
    code: 'GPT-5.6 / 02',
    role: 'Equilibrio cotidiano',
    description: 'Capacidad y eficiencia en balance para construir, analizar e iterar en el trabajo de todos los días.',
    className: 'body-terra',
  },
  {
    name: 'Luna',
    code: 'GPT-5.6 / 03',
    role: 'Eficiencia a escala',
    description: 'El modelo más eficiente en costo de la familia, listo para hacer la inteligencia más accesible y abundante.',
    className: 'body-luna',
  },
]

export interface PrizeItem {
  place: string
  amount: number
  className: string
}

export const prizes: readonly PrizeItem[] = [
  { place: 'Primer lugar', amount: 5_000, className: 'prize-first' },
  { place: 'Segundo lugar', amount: 2_500, className: 'prize-second' },
  { place: 'Tercer lugar', amount: 1_000, className: 'prize-third' },
]

export interface TakeawayItem {
  verb: string
  title: string
  description: string
}

export const takeaways: readonly TakeawayItem[] = [
  {
    verb: 'Construir',
    title: 'Un prototipo demostrable',
    description: 'Termina la jornada con algo funcional que puedas enseñar, probar y seguir desarrollando.',
  },
  {
    verb: 'Aprender',
    title: 'Flujos de trabajo con Codex',
    description: 'Usa IA para planificar, programar, depurar y elevar la calidad de una solución en tiempo limitado.',
  },
  {
    verb: 'Conectar',
    title: 'La comunidad que construye',
    description: 'Conoce desarrolladores, estudiantes, emprendedores y líderes de la comunidad tecnológica local.',
  },
]

export interface CommunityLink {
  label: string
  url: string
}

export interface CommunityPartner {
  name: string
  description: string
  logo: string
  logoClassName: string
  logoWidth: number
  logoHeight: number
  links: readonly CommunityLink[]
}

export const officialSponsor: CommunityPartner = {
  name: 'OpenAI',
  description: 'Sponsor oficial de OpenAI Build Week en Ecuador.',
  logo: '/assets/community-openai.webp',
  logoClassName: 'community-logo-openai',
  logoWidth: 512,
  logoHeight: 139,
  links: [],
}

export const organizingCommunity: CommunityPartner = {
  name: 'The Builders',
  description: 'Builders ecuatorianos que convierten ideas de IA en productos y aprendizaje compartido.',
  logo: '/assets/community-the-builders.webp',
  logoClassName: 'community-logo-builders',
  logoWidth: 480,
  logoHeight: 441,
  links: [
    { label: 'Instagram', url: 'https://www.instagram.com/thebuilders.ia' },
    { label: 'WhatsApp', url: LANDING_LINKS.buildersWhatsapp },
  ],
}

export const coorganizingCommunities: readonly CommunityPartner[] = [
  {
    name: 'Kriuu',
    description: 'Tecnología, creatividad y comunidad conectadas desde Ecuador.',
    logo: '/assets/community-kriuu.webp',
    logoClassName: 'community-logo-kriuu',
    logoWidth: 79,
    logoHeight: 79,
    links: [
      { label: 'Sitio web', url: 'https://kriuu.com/' },
      { label: 'Instagram', url: 'https://www.instagram.com/kriuu.ec/' },
    ],
  },
  {
    name: 'Club IA ULEAM',
    description: 'Talento universitario que aprende, experimenta y construye con inteligencia artificial.',
    logo: '/assets/community-club-ia-uleam.webp',
    logoClassName: 'community-logo-club',
    logoWidth: 480,
    logoHeight: 487,
    links: [
      { label: 'Sitio web', url: 'https://iauleam.club' },
      { label: 'Instagram', url: 'https://www.instagram.com/club.ia.uleam' },
    ],
  },
]

export const venuePartner: CommunityPartner = {
  name: 'PUCE Manabí',
  description: 'Sede de OpenAI Build Week.',
  logo: '/assets/community-puce-manabi.webp',
  logoClassName: 'community-logo-puce',
  logoWidth: 800,
  logoHeight: 192,
  links: [],
}
