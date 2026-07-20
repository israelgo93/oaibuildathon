import { lazy, Suspense, useRef, useState } from 'react'
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { EVENT_DETAILS, LANDING_ASSETS, LANDING_LINKS, models, type ModelItem } from '../content'
import { ExternalIcon } from '../icons'

const ModelOrbit3D = lazy(() => import('./ModelOrbit3D'))

interface ModelsSceneProps {
  cinematic: boolean
}

interface ModelNarrativeProps {
  cinematic: boolean
  index: number
  model: ModelItem
  progress: MotionValue<number>
}

const MODEL_RANGES = [
  [0, 0.06, 0.27, 0.37],
  [0.25, 0.35, 0.58, 0.68],
  [0.56, 0.66, 0.9, 1],
] as const

function ModelNarrative({ cinematic, index, model, progress }: ModelNarrativeProps) {
  const range = MODEL_RANGES[index] ?? MODEL_RANGES[0]
  const opacity = useTransform(progress, [...range], [0, 1, 1, 0])
  const y = useTransform(progress, [...range], ['7vh', '0vh', '0vh', '-7vh'])
  const clipPath = useTransform(progress, [...range], ['inset(100% 0% 0% 0%)', 'inset(0% 0% 0% 0%)', 'inset(0% 0% 0% 0%)', 'inset(0% 0% 100% 0%)'])

  return (
    <motion.article
      className={`body-narrative ${model.className}`}
      role="listitem"
      style={cinematic ? { clipPath, opacity, y } : undefined}
    >
      <small>{model.code}</small>
      <h3>{model.name}</h3>
      <strong>{model.role}</strong>
      <p>{model.description}</p>
    </motion.article>
  )
}

export function ModelsScene({ cinematic }: ModelsSceneProps) {
  const sceneRef = useRef<HTMLElement>(null)
  const [introInteractive, setIntroInteractive] = useState(true)
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
  const nameTrackY = useTransform(progress, [0.05, 0.9], ['0%', '-66.666%'])
  const orbitOpacity = useTransform(progress, [0.88, 1], [1, 0.3])
  const compositionOpacity = useTransform(progress, [0.045, 0.12], [0, 1])
  const introOpacity = useTransform(progress, [0, 0.035, 0.1], [1, 1, 0])
  const introVisibility = useTransform(progress, (value): 'visible' | 'hidden' => (
    value < 0.1 ? 'visible' : 'hidden'
  ))

  useMotionValueEvent(progress, 'change', (value) => {
    const nextInteractive = value < 0.075
    setIntroInteractive((current) => current === nextInteractive ? current : nextInteractive)
  })

  return (
    <section className="cinematic-scene bodies-scene" id="modelos" aria-labelledby="models-title" ref={sceneRef}>
      <div className="cinematic-stage bodies-stage">
        <img className="bodies-background" src={LANDING_ASSETS.deepSpace} alt="" loading="lazy" />
        <div className="bodies-shade" aria-hidden="true" />

        <motion.div
          className="cinematic-shell bodies-intro"
          inert={cinematic && !introInteractive ? true : undefined}
          style={cinematic ? { opacity: introOpacity, visibility: introVisibility } : undefined}
        >
          <p className="scene-label">Lanzamiento · {EVENT_DETAILS.modelLaunchDate}</p>
          <h2 id="models-title">Tres cuerpos. Una nueva frontera.</h2>
          <p>Build Week llega pocos días después del lanzamiento de GPT‑5.6: una familia diseñada para obtener más trabajo útil de cada token.</p>
          <a className="cinematic-text-link light" href={LANDING_LINKS.gpt} target="_blank" rel="noreferrer">
            Conocer GPT‑5.6
            <ExternalIcon />
          </a>
        </motion.div>

        <motion.div
          className="bodies-composition"
          style={cinematic ? { opacity: compositionOpacity } : undefined}
        >
          <div className="body-name-viewport" aria-hidden="true">
            <motion.div className="body-name-track" style={cinematic ? { y: nameTrackY } : undefined}>
              {models.map((model) => <span key={model.name}>{model.name}</span>)}
            </motion.div>
          </div>

          <motion.div
            className="body-orbit-system"
            style={cinematic ? { opacity: orbitOpacity } : undefined}
            aria-hidden="true"
          >
            {cinematic ? (
              <Suspense fallback={null}>
                <ModelOrbit3D progress={progress} />
              </Suspense>
            ) : null}
          </motion.div>

          <div className="body-narratives" role="list" aria-label="Modelos de la familia GPT-5.6">
            {models.map((model, index) => (
              <ModelNarrative
                cinematic={cinematic}
                index={index}
                model={model}
                progress={progress}
                key={model.name}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
