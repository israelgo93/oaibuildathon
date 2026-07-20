import { useRef } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { LANDING_ASSETS, prizes, PRIZE_TOTAL_DISPLAY } from '../content'

interface PrizesSceneProps {
  cinematic: boolean
}

function formatPrize(amount: number): string {
  return new Intl.NumberFormat('es-EC').format(amount)
}

export function PrizesScene({ cinematic }: PrizesSceneProps) {
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
  const imageScale = useTransform(progress, [0, 1], [1.08, 1])
  const totalScale = useTransform(progress, [0, 0.3, 0.72, 1], [1.35, 1, 1, 0.92])
  const totalX = useTransform(progress, [0, 0.3, 1], ['8vw', '0vw', '-4vw'])
  const totalOpacity = useTransform(progress, [0, 0.2, 0.85, 1], [0, 1, 1, 0.4])
  const contentY = useTransform(progress, [0, 0.24, 0.82, 1], ['9vh', '0vh', '0vh', '-6vh'])

  return (
    <section className="cinematic-scene prizes-scene-v2" id="premios" aria-labelledby="prizes-title" ref={sceneRef}>
      <div className="cinematic-stage prizes-stage-v2">
        <motion.div className="prizes-solar-window" style={cinematic ? { scale: imageScale } : undefined}>
          <img
            src={LANDING_ASSETS.solarLimb.medium}
            srcSet={`${LANDING_ASSETS.solarLimb.small} 1280w, ${LANDING_ASSETS.solarLimb.medium} 2560w, ${LANDING_ASSETS.solarLimb.large} 3840w`}
            sizes="100vw"
            alt=""
            loading="lazy"
          />
        </motion.div>
        <motion.div
          className="prize-total-architecture"
          style={cinematic ? { opacity: totalOpacity, scale: totalScale, x: totalX } : undefined}
          aria-hidden="true"
        >
          {PRIZE_TOTAL_DISPLAY}
        </motion.div>

        <motion.div className="cinematic-shell prizes-content-v2" style={cinematic ? { y: contentY } : undefined}>
          <div className="prizes-heading-v2">
            <p className="scene-label">Premios previstos para quienes despegan</p>
            <h2 id="prizes-title">Hasta US$ {PRIZE_TOTAL_DISPLAY} en créditos para la API de OpenAI.</h2>
            <p>Los reconocimientos anunciados para esta edición darán a los equipos destacados combustible para llevar su prototipo más lejos.</p>
          </div>

          <div className="prize-lines" role="list" aria-label="Premios previstos del evento">
            {prizes.map((prize) => (
              <article className={`prize-line ${prize.className}`} role="listitem" key={prize.place}>
                <span>{prize.place}</span>
                <strong><small>US$</small>{formatPrize(prize.amount)}</strong>
                <p>en créditos para la API de OpenAI</p>
              </article>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
