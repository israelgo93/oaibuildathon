import { useRef } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { LANDING_ASSETS, LANDING_LINKS } from '../content'
import { ExternalIcon } from '../icons'

interface GlobalSceneProps {
  cinematic: boolean
}

export function GlobalScene({ cinematic }: GlobalSceneProps) {
  const sceneRef = useRef<HTMLElement>(null)
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
  const imageClip = useTransform(progress, [0, 0.18, 1], ['inset(42% 0% 42% 0%)', 'inset(0% 0% 0% 0%)', 'inset(0% 0% 0% 0%)'])
  const imageY = useTransform(progress, [0, 1], ['-5vh', '5vh'])
  const imageScale = useTransform(progress, [0, 0.5, 1], [1.08, 1.02, 1.06])
  const contentY = useTransform(progress, [0, 0.22, 0.78, 1], ['9vh', '0vh', '0vh', '-8vh'])
  const sceneOpacity = useTransform(progress, [0, 0.08, 0.84, 1], [0.7, 1, 1, 0.22])

  return (
    <section className="cinematic-scene global-scene" id="contexto" aria-labelledby="global-title" ref={sceneRef}>
      <div className="cinematic-stage global-stage">
        <motion.div className="global-orbit-window" style={cinematic ? { clipPath: imageClip, opacity: sceneOpacity } : undefined}>
          <motion.img
            src={LANDING_ASSETS.globalOrbit.medium}
            srcSet={`${LANDING_ASSETS.globalOrbit.small} 1280w, ${LANDING_ASSETS.globalOrbit.medium} 2560w, ${LANDING_ASSETS.globalOrbit.large} 3840w`}
            sizes="(max-width: 959px) 100vw, 58vw"
            alt="Sudamérica iluminada desde la órbita, con la Luna y el amanecer al fondo"
            loading="lazy"
            style={cinematic ? { y: imageY, scale: imageScale } : undefined}
          />
        </motion.div>

        <div className="global-number" aria-hidden="true">
          <span>13</span>
          <i>→</i>
          <span>21</span>
        </div>

        <motion.div className="cinematic-shell global-copy" style={cinematic ? { y: contentY } : undefined}>
          <div>
            <p className="scene-label">13—21 de julio · en todo el mundo</p>
            <h2 id="global-title">El mundo construye en paralelo. Portoviejo entra en órbita.</h2>
          </div>
          <div className="global-detail">
            <p>OpenAI Build Week conecta sesiones en vivo, eventos de comunidad y un reto global. Del 13 al 21 de julio, cada demo suma una nueva posibilidad.</p>
            <a className="cinematic-text-link" href={LANDING_LINKS.global} target="_blank" rel="noreferrer">
              Ver la iniciativa global
              <ExternalIcon />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
