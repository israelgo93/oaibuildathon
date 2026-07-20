import { useRef } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { LANDING_ASSETS } from '../content'

interface MantaSceneProps {
  cinematic: boolean
}

export function MantaScene({ cinematic }: MantaSceneProps) {
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
  const copyY = useTransform(progress, [0, 0.2, 0.78, 1], ['8vh', '0vh', '0vh', '-6vh'])
  const posterY = useTransform(progress, [0, 0.24, 0.78, 1], ['9vh', '0vh', '0vh', '-4vh'])
  const posterScale = useTransform(progress, [0, 0.26, 0.78, 1], [0.94, 1, 1, 0.97])
  const posterOpacity = useTransform(progress, [0, 0.2], [0.25, 1])
  const posterRotate = useTransform(progress, [0, 0.32, 1], [-1.2, 0, 0.8])
  const coordinateScale = useTransform(progress, [0, 0.36, 1], [0.08, 1, 1])

  return (
    <section className="cinematic-scene manta-scene" id="experiencia" aria-labelledby="manta-title" ref={sceneRef}>
      <div className="cinematic-stage manta-stage">
        <div className="manta-coordinate-field" aria-hidden="true">PORTOVIEJO / 01.0546° S / 80.4544° O</div>
        <div className="cinematic-shell manta-layout">
          <motion.div className="manta-copy" style={cinematic ? { y: copyY } : undefined}>
            <p className="scene-label">De Manta a Portoviejo</p>
            <h2 id="manta-title">La capital de Manabí. Un día para lanzar <span>algo real.</span></h2>
            <p className="scene-lead">El 15 de julio, Manta abrió el camino con la primera Buildathon oficial de OpenAI en Ecuador. El 21, la misión continúa en Portoviejo.</p>
            <p>Desarrolladores, estudiantes y fundadores formarán equipo para planificar, programar, depurar y presentar con Codex un prototipo que funciona.</p>

            <div className="manta-coordinates">
              <span>01.0546° S</span>
              <span className="manta-coordinate-line" aria-hidden="true">
                <motion.i style={cinematic ? { scaleX: coordinateScale } : undefined} />
                <b />
              </span>
              <span>80.4544° O</span>
            </div>
          </motion.div>

          <motion.figure
            className="manta-poster"
            style={cinematic ? { y: posterY, scale: posterScale, rotate: posterRotate, opacity: posterOpacity } : undefined}
          >
            <div className="manta-poster-media">
              <img
                src={LANDING_ASSETS.poster}
                alt="Póster oficial de la edición inaugural de OpenAI Build Week Community Event en Manta, Ecuador"
                width="1200"
                height="1200"
                loading="lazy"
              />
            </div>
            <figcaption>Manta, 15 de julio.<br />La edición inaugural.</figcaption>
          </motion.figure>
        </div>
      </div>
    </section>
  )
}
