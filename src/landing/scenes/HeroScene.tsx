import { useRef, useState } from 'react'
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from 'framer-motion'
import { EVENT_DETAILS, LANDING_ASSETS, LANDING_LINKS } from '../content'
import { LandingCountdown } from '../LandingCountdown'
import { ArrowIcon } from '../icons'
import { useHeroVideoScrub } from '../useHeroVideoScrub'

interface HeroSceneProps {
  cinematic: boolean
}

export function HeroScene({ cinematic }: HeroSceneProps) {
  const heroRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [contentInteractive, setContentInteractive] = useState(true)
  const { scrollYProgress: progressRaw } = useScroll({
    target: heroRef,
    offset: ['start start', 'end end'],
  })
  const progress = useSpring(progressRaw, {
    stiffness: 150,
    damping: 32,
    mass: 0.3,
    skipInitialAnimation: true,
  })
  const contentY = useTransform(progress, [0, 0.55, 0.82, 1], ['0vh', '0vh', '-8vh', '-18vh'])
  const contentOpacity = useTransform(progress, [0, 0.62, 0.88, 1], [1, 1, 0.42, 0])
  const contentVisibility = useTransform(progress, (value): 'visible' | 'hidden' => (
    value < 0.995 ? 'visible' : 'hidden'
  ))
  const titleX = useTransform(progress, [0, 0.56, 1], ['0vw', '0vw', '-22vw'])
  const titleScale = useTransform(progress, [0, 0.58, 1], [1, 1, 1.16])
  const visualScale = useTransform(progress, [0, 1], [1, 1.035])

  useHeroVideoScrub({ enabled: cinematic, heroRef, progress, videoRef })
  useMotionValueEvent(progress, 'change', (value) => {
    const nextInteractive = value < 0.82
    setContentInteractive((current) => current === nextInteractive ? current : nextInteractive)
  })

  return (
    <section className="cinematic-scene hero-scene" id="top" aria-labelledby="hero-title" ref={heroRef}>
      <div className="cinematic-stage hero-stage-v2">
        <motion.div className="hero-media-v2" style={cinematic ? { scale: visualScale } : undefined}>
          <img
            src={LANDING_ASSETS.hero.medium}
            srcSet={`${LANDING_ASSETS.hero.small} 1280w, ${LANDING_ASSETS.hero.medium} 2560w, ${LANDING_ASSETS.hero.large} 3840w`}
            sizes="100vw"
            alt="La Tierra iluminada por el amanecer vista desde el espacio, con la Luna y la Vía Láctea al fondo"
            fetchPriority="high"
          />
          {cinematic ? (
            <video
              ref={videoRef}
              className="hero-video-v2"
              poster={LANDING_ASSETS.hero.medium}
              muted
              playsInline
              preload="auto"
              aria-hidden="true"
            >
              <source src={LANDING_ASSETS.hero.video} type="video/mp4" />
            </video>
          ) : null}
        </motion.div>
        <div className="hero-atmosphere" aria-hidden="true" />

        <motion.div
          className="hero-lockup"
          style={cinematic ? { x: titleX, scale: titleScale } : undefined}
        >
          <h1 id="hero-title">
            <span>OpenAI Build Week</span>
            <strong>Portoviejo</strong>
          </h1>
          <p>Community Buildathon / Ecuador / {EVENT_DETAILS.year}</p>
        </motion.div>

        <motion.div
          className="hero-countdown-shell"
          inert={cinematic && !contentInteractive ? true : undefined}
          style={cinematic ? { y: contentY, opacity: contentOpacity, visibility: contentVisibility } : undefined}
        >
          <LandingCountdown />
          <div className="hero-actions-v2">
            <a className="cinematic-button cinematic-button-primary" href={LANDING_LINKS.event} target="_blank" rel="noreferrer">
              Reservar mi lugar
              <ArrowIcon />
            </a>
            <a className="cinematic-button cinematic-button-line" href="#agenda">
              Ver itinerario
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        </motion.div>

        <div className="hero-scroll-cue" aria-hidden="true">
          <span>Desliza para entrar en órbita</span>
          <i />
        </div>
      </div>
    </section>
  )
}
