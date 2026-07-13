import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { ShowcaseSection } from './components/ShowcaseSection'

const SpaceField = lazy(() =>
  import('./components/SpaceField').then(({ SpaceField: SpaceFieldComponent }) => ({
    default: SpaceFieldComponent,
  })),
)

const EVENT_URL = 'https://luma.com/buildathon.manta'
const GLOBAL_URL = 'https://openai.com/build-week/'
const GPT_URL = 'https://openai.com/index/gpt-5-6/'
const COMMUNITY_URL = 'https://chat.whatsapp.com/GNoZ7SDOWMhIW6a2tbZypy'
const EVENT_TIMESTAMP = new Date('2026-07-15T10:00:00-05:00').getTime()
const HERO_IMAGE = '/assets/hero-2560.webp'
const HERO_IMAGE_SMALL = '/assets/hero-1280.webp'
const HERO_IMAGE_4K = '/assets/hero-3840.webp'
const HERO_VIDEO = '/assets/video-orbital.mp4'
const DEEP_SPACE_IMAGE = '/assets/deep-space-1600.webp'
const POSTER_IMAGE = '/assets/manta-poster-1200.webp'
const GLOBAL_ORBIT_IMAGE = '/assets/global-orbit-2560.webp'
const GLOBAL_ORBIT_IMAGE_SMALL = '/assets/global-orbit-1280.webp'
const GLOBAL_ORBIT_IMAGE_4K = '/assets/global-orbit-3840.webp'
const SOLAR_LIMB_IMAGE = '/assets/solar-limb-2560.webp'
const SOLAR_LIMB_IMAGE_SMALL = '/assets/solar-limb-1280.webp'
const SOLAR_LIMB_IMAGE_4K = '/assets/solar-limb-3840.webp'
const LUNAR_HORIZON_IMAGE = '/assets/lunar-horizon-2560.webp'
const LUNAR_HORIZON_IMAGE_SMALL = '/assets/lunar-horizon-1280.webp'
const LUNAR_HORIZON_IMAGE_4K = '/assets/lunar-horizon-3840.webp'

interface CountdownValue {
  days: number
  hours: number
  minutes: number
  seconds: number
  isComplete: boolean
}

interface AgendaItem {
  time: string
  title: string
  description: string
}

interface ModelItem {
  name: 'Sol' | 'Terra' | 'Luna'
  code: string
  role: string
  description: string
  className: string
}

interface CountdownUnitValue {
  value: number
  label: string
  singularLabel: string
  pluralLabel: string
}

const MATRIX_DIGITS: Record<string, string> = {
  '0': ['11111', '10001', '10001', '10001', '10001', '10001', '11111'].join(''),
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '11111'].join(''),
  '2': ['11111', '00001', '00001', '11111', '10000', '10000', '11111'].join(''),
  '3': ['11111', '00001', '00001', '01111', '00001', '00001', '11111'].join(''),
  '4': ['10001', '10001', '10001', '11111', '00001', '00001', '00001'].join(''),
  '5': ['11111', '10000', '10000', '11111', '00001', '00001', '11111'].join(''),
  '6': ['11111', '10000', '10000', '11111', '10001', '10001', '11111'].join(''),
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'].join(''),
  '8': ['11111', '10001', '10001', '11111', '10001', '10001', '11111'].join(''),
  '9': ['11111', '10001', '10001', '11111', '00001', '00001', '11111'].join(''),
}

const agenda: AgendaItem[] = [
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
    title: 'Workshop y retos',
    description: 'Tecnologías, desafíos y acompañamiento para despegar con una dirección clara.',
  },
  {
    time: '13:00—14:00',
    title: 'Coffee break',
    description: 'Pausa para conectar, contrastar ideas y recargar energía.',
  },
  {
    time: '14:00—15:00',
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

const models: ModelItem[] = [
  {
    name: 'Sol',
    code: 'GPT-5.6 / 01',
    role: 'Inteligencia de frontera',
    description: 'El modelo insignia de la familia, creado para el trabajo más exigente en coding, conocimiento, ciencia y seguridad.',
    className: 'model-sol',
  },
  {
    name: 'Terra',
    code: 'GPT-5.6 / 02',
    role: 'Equilibrio cotidiano',
    description: 'Capacidad y eficiencia en balance para construir, analizar e iterar en el trabajo de todos los días.',
    className: 'model-terra',
  },
  {
    name: 'Luna',
    code: 'GPT-5.6 / 03',
    role: 'Eficiencia a escala',
    description: 'El modelo más eficiente en costo de la familia, listo para hacer la inteligencia más accesible y abundante.',
    className: 'model-luna',
  },
]

function getCountdownValue(): CountdownValue {
  const difference = EVENT_TIMESTAMP - Date.now()

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isComplete: true }
  }

  return {
    days: Math.floor(difference / 86_400_000),
    hours: Math.floor((difference / 3_600_000) % 24),
    minutes: Math.floor((difference / 60_000) % 60),
    seconds: Math.floor((difference / 1_000) % 60),
    isComplete: false,
  }
}

function useCountdown() {
  const [countdown, setCountdown] = useState<CountdownValue>(getCountdownValue)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const nextValue = getCountdownValue()
      setCountdown(nextValue)

      if (nextValue.isComplete) {
        window.clearInterval(intervalId)
      }
    }, 1_000)

    return () => window.clearInterval(intervalId)
  }, [])

  return countdown
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 5l5 5-5 5" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M7 5h8v8M15 5 6 14M14 11v4H5V6h4" />
    </svg>
  )
}

function DotMatrixDigit({ value }: { value: string }) {
  const pattern = MATRIX_DIGITS[value]

  if (!pattern) {
    return null
  }

  return (
    <span className="matrix-digit" aria-hidden="true">
      {Array.from(pattern).map((cell, index) => (
        <span
          className={cell === '1' ? 'matrix-dot matrix-dot-active' : 'matrix-dot'}
          key={`${value}-${index}`}
        />
      ))}
    </span>
  )
}

function DotMatrixNumber({ value }: { value: number }) {
  const digits = String(value).padStart(2, '0').slice(-2)

  return (
    <span className="matrix-number" aria-hidden="true">
      {Array.from(digits).map((digit, index) => (
        <DotMatrixDigit value={digit} key={`${digit}-${index}`} />
      ))}
    </span>
  )
}

function Countdown() {
  const countdown = useCountdown()
  const units: CountdownUnitValue[] = [
    { value: countdown.days, label: 'días', singularLabel: 'día', pluralLabel: 'días' },
    { value: countdown.hours, label: 'horas', singularLabel: 'hora', pluralLabel: 'horas' },
    { value: countdown.minutes, label: 'min', singularLabel: 'minuto', pluralLabel: 'minutos' },
    { value: countdown.seconds, label: 'seg', singularLabel: 'segundo', pluralLabel: 'segundos' },
  ]
  const accessibleCountdown = units
    .map((unit) => `${unit.value} ${unit.value === 1 ? unit.singularLabel : unit.pluralLabel}`)
    .join(', ')

  if (countdown.isComplete) {
    return (
      <div className="countdown-matrix countdown-complete" role="timer">
        La Buildathon está en marcha
      </div>
    )
  }

  return (
    <div
      className="countdown-matrix"
      role="timer"
      aria-live="off"
      aria-label={`${accessibleCountdown} para el evento`}
    >
      {units.map((unit, index) => (
        <div className="countdown-segment" key={unit.label}>
          <div className="countdown-unit">
            <DotMatrixNumber value={unit.value} />
            <small>{unit.label}</small>
          </div>
          {index < units.length - 1 ? (
            <span className="matrix-separator" aria-hidden="true">
              <i />
              <i />
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function App() {
  const reduceMotion = useReducedMotion() === true
  const heroRef = useRef<HTMLElement>(null)
  const heroVideoRef = useRef<HTMLVideoElement>(null)
  const storyRef = useRef<HTMLElement>(null)
  const globalRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll()
  const { scrollYProgress: heroProgressRaw } = useScroll({
    target: heroRef,
    offset: ['start start', 'end end'],
  })
  const { scrollYProgress: storyProgressRaw } = useScroll({
    target: storyRef,
    offset: ['start start', 'end end'],
  })
  const { scrollYProgress: globalProgressRaw } = useScroll({
    target: globalRef,
    offset: ['start end', 'end start'],
  })
  const heroProgress = useSpring(heroProgressRaw, { stiffness: 120, damping: 30, mass: 0.35, skipInitialAnimation: true })
  const storyProgress = useSpring(storyProgressRaw, { stiffness: 110, damping: 30, mass: 0.38, skipInitialAnimation: true })
  const globalProgress = useSpring(globalProgressRaw, { stiffness: 105, damping: 30, mass: 0.4, skipInitialAnimation: true })
  const countdownY = useTransform(heroProgress, [0, 0.78, 1], [0, 0, -40])
  const countdownScale = useTransform(heroProgress, [0, 0.78, 1], [1, 1, 0.96])
  const countdownOpacity = useTransform(heroProgress, [0, 0.82, 1], [1, 1, 0])
  const posterY = useTransform(storyProgress, [0, 0.46, 1], [120, 0, -72])
  const posterScale = useTransform(storyProgress, [0, 0.48, 1], [0.9, 1, 1.025])
  const posterRotate = useTransform(storyProgress, [0, 0.55, 1], [-1.5, 0, 0.75])
  const posterClip = useTransform(storyProgress, [0, 0.42, 1], ['inset(8% 8%)', 'inset(0% 0%)', 'inset(0% 0%)'])
  const storyCopyY = useTransform(storyProgress, [0, 0.44, 1], [84, 0, -44])
  const storyOrbitRotate = useTransform(storyProgress, [0, 1], [-24, 18])
  const globalImageY = useTransform(globalProgress, [0, 1], [-72, 72])
  const globalImageScale = useTransform(globalProgress, [0, 0.5, 1], [1.1, 1.04, 1.08])
  const globalCopyY = useTransform(globalProgress, [0, 1], [44, -34])

  useEffect(() => {
    if (reduceMotion) {
      return
    }

    const video = heroVideoRef.current
    const hero = heroRef.current

    if (!video || !hero) {
      return
    }

    let frameId = 0
    let isActive = true
    let targetProgress = heroProgressRaw.get()

    const seekToTarget = () => {
      frameId = 0

      if (
        !isActive
        || video.seeking
        || video.readyState < HTMLMediaElement.HAVE_METADATA
        || !Number.isFinite(video.duration)
        || video.duration <= 0
      ) {
        return
      }

      const maxTime = Math.max(0, video.duration - 0.05)
      const targetTime = Math.min(maxTime, Math.max(0, targetProgress * maxTime))

      if (video.seekable.length > 0) {
        const seekableStart = video.seekable.start(0)
        const seekableEnd = video.seekable.end(video.seekable.length - 1)

        if (targetTime < seekableStart || targetTime > seekableEnd) {
          return
        }
      }

      if (Math.abs(video.currentTime - targetTime) >= 1 / 24) {
        video.currentTime = targetTime
      }
    }

    const scheduleSeek = () => {
      if (frameId === 0 && isActive) {
        frameId = window.requestAnimationFrame(seekToTarget)
      }
    }
    const onMediaReady = () => {
      video.pause()
      scheduleSeek()
    }
    const onSeeked = () => scheduleSeek()
    const onProgress = () => scheduleSeek()
    const unsubscribe = heroProgressRaw.on('change', (latestProgress) => {
      targetProgress = latestProgress
      scheduleSeek()
    })
    const observer = new IntersectionObserver(([entry]) => {
      isActive = entry?.isIntersecting ?? false

      if (isActive) {
        scheduleSeek()
      } else {
        video.pause()
      }
    }, { rootMargin: '20% 0px' })

    video.addEventListener('loadedmetadata', onMediaReady)
    video.addEventListener('loadeddata', onMediaReady)
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('progress', onProgress)
    observer.observe(hero)

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      onMediaReady()
    }

    return () => {
      unsubscribe()
      observer.disconnect()
      video.removeEventListener('loadedmetadata', onMediaReady)
      video.removeEventListener('loadeddata', onMediaReady)
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('progress', onProgress)

      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId)
      }

      video.pause()
    }
  }, [heroProgressRaw, reduceMotion])

  return (
    <>
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>

      <motion.div
        className="page-progress"
        style={{ scaleX: scrollYProgress }}
        aria-hidden="true"
      />

      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="OpenAI Build Week Manta, inicio">
          <span className="wordmark-orbit" aria-hidden="true" />
          <span>
            OpenAI Build Week
            <small>Manta / Ecuador</small>
          </span>
        </a>

        <nav aria-label="Navegación principal">
          <a href="#experiencia">Experiencia</a>
          <a href="#agenda">Agenda</a>
          <a href="#premios">Premios</a>
        </nav>

        <a className="nav-cta" href="/registro">
          Registra tu equipo
          <ArrowIcon />
        </a>
      </header>

      <main id="main-content">
        <section className="hero" id="top" aria-labelledby="hero-title" ref={heroRef}>
          <div className="hero-stage">
            <div className="hero-visual">
              <img
                src={HERO_IMAGE}
                srcSet={`${HERO_IMAGE_SMALL} 1280w, ${HERO_IMAGE} 2560w, ${HERO_IMAGE_4K} 3840w`}
                sizes="100vw"
                alt="La Tierra iluminada por el amanecer vista desde el espacio, con la Luna y la Vía Láctea al fondo"
                fetchPriority="high"
              />
              {!reduceMotion ? (
                <video
                  ref={heroVideoRef}
                  className="hero-video"
                  src={HERO_VIDEO}
                  poster={HERO_IMAGE}
                  muted
                  playsInline
                  preload="auto"
                  aria-hidden="true"
                />
              ) : null}
            </div>
            <div className="hero-shade" aria-hidden="true" />

            <motion.div
              className="countdown-stage page-shell"
              style={{
                y: reduceMotion ? 0 : countdownY,
                scale: reduceMotion ? 1 : countdownScale,
                opacity: reduceMotion ? 1 : countdownOpacity,
              }}
            >
              <h1 className="sr-only" id="hero-title">OpenAI Build Week Community Buildathon Manta</h1>
              <Countdown />
              <div className="countdown-actions">
                <a className="launch-cta" href={EVENT_URL} target="_blank" rel="noreferrer">
                  <span>Reservar mi lugar</span>
                  <span className="launch-cta-icon" aria-hidden="true">
                    <ArrowIcon />
                  </span>
                </a>
                <a className="agenda-cta" href="#agenda">
                  Ver itinerario
                  <span aria-hidden="true">↓</span>
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="manifesto section" id="experiencia" ref={storyRef}>
          <div className="manifesto-sticky">
            <motion.div
              className="manifesto-orbit"
              style={{ rotate: reduceMotion ? 0 : storyOrbitRotate }}
              aria-hidden="true"
            />
            <div className="page-shell manifesto-grid">
              <motion.div
                className="manifesto-copy"
                style={{ y: reduceMotion ? 0 : storyCopyY }}
              >
                <p className="section-mark">Manta entra en la historia</p>
                <h2>
                  Una ciudad del Pacífico. Un día para lanzar <span>algo real.</span>
                </h2>
                <p className="manifesto-lead">
                  Por primera vez, un evento oficial de OpenAI reúne en Ecuador a quienes quieren pasar de la posibilidad a la prueba.
                </p>
                <p>
                  Desarrolladores, estudiantes y fundadores formarán equipo para planificar, programar, depurar y presentar con Codex un prototipo que funciona.
                </p>

                <div className="coordinate-line">
                  <span>00.9661° S</span>
                  <span className="coordinate-track" aria-hidden="true">
                    <motion.b
                      className="coordinate-progress"
                      style={{ scaleX: reduceMotion ? 1 : storyProgress }}
                    />
                    <i />
                  </span>
                  <span>80.7127° O</span>
                </div>
              </motion.div>

              <motion.figure
                className="poster-frame"
                style={{
                  y: reduceMotion ? 0 : posterY,
                  scale: reduceMotion ? 1 : posterScale,
                  rotate: reduceMotion ? 0 : posterRotate,
                }}
              >
                <motion.div
                  className="poster-media"
                  style={{ clipPath: reduceMotion ? 'inset(0% 0%)' : posterClip }}
                >
                  <img
                    src={POSTER_IMAGE}
                    alt="Póster oficial de OpenAI Build Week Community Event en Manta, Ecuador"
                    width="1200"
                    height="1200"
                    loading="lazy"
                  />
                </motion.div>
                <figcaption>
                  Comunidad local,
                  <br />ambición planetaria.
                </figcaption>
              </motion.figure>
            </div>
          </div>
        </section>

        <section className="global-window" aria-labelledby="global-title" ref={globalRef}>
          <motion.img
            className="global-window-image"
            src={GLOBAL_ORBIT_IMAGE}
            srcSet={`${GLOBAL_ORBIT_IMAGE_SMALL} 1280w, ${GLOBAL_ORBIT_IMAGE} 2560w, ${GLOBAL_ORBIT_IMAGE_4K} 3840w`}
            sizes="100vw"
            alt="Sudamérica iluminada desde la órbita, con la Luna y el amanecer al fondo"
            loading="lazy"
            style={{
              y: reduceMotion ? 0 : globalImageY,
              scale: reduceMotion ? 1.04 : globalImageScale,
            }}
          />
          <div className="global-window-overlay" aria-hidden="true" />
          <motion.div
            className="page-shell global-window-content"
            style={{ y: reduceMotion ? 0 : globalCopyY }}
          >
            <div>
              <p className="section-mark">13—21 de julio · en todo el mundo</p>
              <h2 id="global-title">El mundo construye en paralelo. Manta entra en órbita.</h2>
            </div>
            <div className="global-facts">
              <p>
                OpenAI Build Week conecta sesiones en vivo, eventos de comunidad y un reto global. Del 13 al 21 de julio, cada demo suma una nueva posibilidad.
              </p>
              <a className="button button-light" href={GLOBAL_URL} target="_blank" rel="noreferrer">
                Ver la iniciativa global
                <ExternalIcon />
              </a>
            </div>
          </motion.div>
        </section>

        <section className="models-section section" aria-labelledby="models-title">
          <img className="models-bg" src={DEEP_SPACE_IMAGE} alt="" loading="lazy" />
          <div className="models-glow" aria-hidden="true" />
          <div className="page-shell models-layout">
            <div className="models-intro">
              <p className="section-mark">Lanzamiento · 09.07.2026</p>
              <h2 id="models-title">Tres cuerpos. Una nueva frontera.</h2>
              <p>
                Build Week llega pocos días después del lanzamiento de GPT‑5.6: una familia diseñada para obtener más trabajo útil de cada token.
              </p>
              <a className="text-link light-link" href={GPT_URL} target="_blank" rel="noreferrer">
                Conocer GPT‑5.6
                <ExternalIcon />
              </a>
            </div>

            <div className="model-system" role="list" aria-label="Modelos de la familia GPT-5.6">
              <div className="orbit-line orbit-line-one" aria-hidden="true" />
              <div className="orbit-line orbit-line-two" aria-hidden="true" />
              {models.map((model) => (
                <motion.article
                  className={`model-node ${model.className}`}
                  key={model.name}
                  role="listitem"
                  whileHover={reduceMotion ? undefined : { y: -8 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="model-orb" aria-hidden="true"><span /></div>
                  <div className="model-copy">
                    <small>{model.code}</small>
                    <h3>{model.name}</h3>
                    <strong>{model.role}</strong>
                    <p>{model.description}</p>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="agenda-section section" id="agenda" aria-labelledby="agenda-title">
          <div className="page-shell agenda-heading">
            <div>
              <p className="section-mark">15 de julio · Manta</p>
              <h2 id="agenda-title">De cero a demo, en una jornada.</h2>
            </div>
            <p>
              No vienes solo a escuchar. Vienes a formar equipo, tomar una idea, ponerla a prueba y mostrar lo que construiste.
            </p>
          </div>

          <div className="page-shell agenda-list">
            {agenda.map((item, index) => (
              <article className="agenda-item" key={`${item.time}-${item.title}`}>
                <time>{item.time}</time>
                <div className="agenda-path" aria-hidden="true">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                </div>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="prizes-section section" id="premios" aria-labelledby="prizes-title">
          <img
            className="prizes-bg"
            src={SOLAR_LIMB_IMAGE}
            srcSet={`${SOLAR_LIMB_IMAGE_SMALL} 1280w, ${SOLAR_LIMB_IMAGE} 2560w, ${SOLAR_LIMB_IMAGE_4K} 3840w`}
            sizes="100vw"
            alt=""
            loading="lazy"
          />
          <div className="page-shell prizes-heading">
            <p className="section-mark">Premios previstos para quienes despegan</p>
            <h2 id="prizes-title">Hasta US$ 8.500 en créditos para la API de OpenAI.</h2>
            <p>
              Los reconocimientos anunciados para esta edición darán a los equipos destacados combustible para llevar su prototipo más lejos.
            </p>
          </div>

          <div className="page-shell podium" role="list" aria-label="Premios previstos del evento">
            <article className="prize prize-first" role="listitem">
              <span>Primer lugar</span>
              <strong><small>US$</small>5.000</strong>
              <p>en créditos para la API de OpenAI</p>
            </article>
            <article className="prize prize-second" role="listitem">
              <span>Segundo lugar</span>
              <strong><small>US$</small>2.500</strong>
              <p>en créditos para la API de OpenAI</p>
            </article>
            <article className="prize prize-third" role="listitem">
              <span>Tercer lugar</span>
              <strong><small>US$</small>1.000</strong>
              <p>en créditos para la API de OpenAI</p>
            </article>
          </div>
        </section>

        <section className="takeaway-section section" aria-labelledby="takeaway-title">
          <div className="page-shell takeaway-layout">
            <div>
              <p className="section-mark">Lo que te llevas</p>
              <h2 id="takeaway-title">Más que código. Momentum.</h2>
            </div>
            <div className="takeaway-list">
              <article>
                <span>Construir</span>
                <h3>Un prototipo demostrable</h3>
                <p>Termina la jornada con algo funcional que puedas enseñar, probar y seguir desarrollando.</p>
              </article>
              <article>
                <span>Aprender</span>
                <h3>Flujos de trabajo con Codex</h3>
                <p>Usa IA para planificar, programar, depurar y elevar la calidad de una solución en tiempo limitado.</p>
              </article>
              <article>
                <span>Conectar</span>
                <h3>La comunidad que construye</h3>
                <p>Conoce desarrolladores, estudiantes, emprendedores y líderes de la comunidad tecnológica local.</p>
              </article>
            </div>
          </div>
        </section>

        <ShowcaseSection />

        <section className="final-cta" aria-labelledby="final-title">
          <div className="final-cta-image" aria-hidden="true">
            <img
              src={LUNAR_HORIZON_IMAGE}
              srcSet={`${LUNAR_HORIZON_IMAGE_SMALL} 1280w, ${LUNAR_HORIZON_IMAGE} 2560w, ${LUNAR_HORIZON_IMAGE_4K} 3840w`}
              sizes="100vw"
              alt=""
              loading="lazy"
            />
          </div>
          <Suspense fallback={null}>
            <SpaceField className="space-field final-space-field" />
          </Suspense>
          <div className="page-shell final-cta-content">
            <p className="section-mark">Tu lugar en la misión</p>
            <h2 id="final-title">La próxima idea puede empezar en Manta.</h2>
            <p>
              Miércoles 15 de julio de 2026. Trae tu laptop, tu curiosidad y las ganas de convertir una posibilidad en algo real.
            </p>
            <div className="final-actions">
              <a className="button button-primary" href={EVENT_URL} target="_blank" rel="noreferrer">
                Registrarme en Luma
                <ArrowIcon />
              </a>
              <a className="button button-ghost" href={COMMUNITY_URL} target="_blank" rel="noreferrer">
                Unirme a The Builders
                <ExternalIcon />
              </a>
            </div>
            <p className="host-line">
              Organizado por Codex Community mediante el programa Codex Ambassadors, junto a The Builders y Club IA ULEAM.
            </p>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="page-shell footer-grid">
          <div className="wordmark footer-wordmark">
            <span className="wordmark-orbit" aria-hidden="true" />
            <span>
              OpenAI Build Week
              <small>Manta / Ecuador · 2026</small>
            </span>
          </div>
          <div className="footer-links">
            <a href={EVENT_URL} target="_blank" rel="noreferrer">Evento en Luma</a>
            <a href={GLOBAL_URL} target="_blank" rel="noreferrer">Build Week global</a>
            <a href={COMMUNITY_URL} target="_blank" rel="noreferrer">The Builders</a>
          </div>
          <p>Construido para quienes convierten ideas en realidad.</p>
        </div>
      </footer>
    </>
  )
}

export default App
