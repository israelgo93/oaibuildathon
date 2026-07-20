import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { EVENT_DETAILS, LANDING_ASSETS, LANDING_LINKS } from '../content'
import { ArrowIcon } from '../icons'

const SpaceField = lazy(() =>
  import('@/components/SpaceField').then(({ SpaceField: SpaceFieldComponent }) => ({
    default: SpaceFieldComponent,
  })),
)

interface FinalSceneProps {
  cinematic: boolean
}

export function FinalScene({ cinematic }: FinalSceneProps) {
  const sceneRef = useRef<HTMLElement>(null)
  const [renderSpaceField, setRenderSpaceField] = useState(false)
  const { scrollYProgress: progressRaw } = useScroll({
    target: sceneRef,
    offset: ['start start', 'end end'],
  })
  const progress = useSpring(progressRaw, {
    stiffness: 150,
    damping: 32,
    mass: 0.3,
    skipInitialAnimation: true,
  })
  const imageClip = useTransform(progress, [0, 0.18, 1], ['inset(34% 0% 0% 0%)', 'inset(0% 0% 0% 0%)', 'inset(0% 0% 0% 0%)'])
  const imageScale = useTransform(progress, [0, 0.32, 1], [1.1, 1, 1.02])
  const contentX = useTransform(progress, [0, 0.2, 0.78, 1], ['5vw', '0vw', '0vw', '-3vw'])
  const contentOpacity = useTransform(progress, [0, 0.16], [0, 1])

  useEffect(() => {
    const scene = sceneRef.current
    if (!cinematic || !scene) return

    if (!('IntersectionObserver' in window)) {
      setRenderSpaceField(true)
      return
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return
      setRenderSpaceField(true)
      observer.disconnect()
    }, { rootMargin: '1200px 0px' })

    observer.observe(scene)
    return () => observer.disconnect()
  }, [cinematic])

  return (
    <section className="cinematic-scene final-scene-v2" id="final" aria-labelledby="final-title" ref={sceneRef}>
      <div className="cinematic-stage final-stage-v2">
        <motion.div className="final-lunar-window" style={cinematic ? { clipPath: imageClip, scale: imageScale } : undefined} aria-hidden="true">
          <img
            src={LANDING_ASSETS.lunarHorizon.medium}
            srcSet={`${LANDING_ASSETS.lunarHorizon.small} 1280w, ${LANDING_ASSETS.lunarHorizon.medium} 2560w, ${LANDING_ASSETS.lunarHorizon.large} 3840w`}
            sizes="100vw"
            alt=""
            loading="lazy"
          />
        </motion.div>
        {cinematic && renderSpaceField ? (
          <Suspense fallback={null}>
            <SpaceField className="space-field final-space-field-v2" />
          </Suspense>
        ) : null}

        <motion.div
          className="cinematic-shell final-content-v2"
          style={cinematic ? { x: contentX, opacity: contentOpacity } : undefined}
        >
          <div className="final-copy-v2">
            <p className="scene-label">Tu lugar en la misión</p>
            <h2 id="final-title">La próxima idea puede empezar en Portoviejo.</h2>
            <p>{EVENT_DETAILS.dateLong}. Trae tu laptop, tu curiosidad y las ganas de convertir una posibilidad en algo real.</p>
          </div>
          <div className="final-actions-v2">
            <a className="cinematic-button cinematic-button-primary" href={LANDING_LINKS.event} target="_blank" rel="noreferrer">
              Registrarme en Luma
              <ArrowIcon />
            </a>
            <a className="cinematic-button cinematic-button-line light" href="#comunidades">
              Conocer las comunidades
              <ArrowIcon />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
