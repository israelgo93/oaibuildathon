import { motion, useScroll } from 'framer-motion'
import { ShowcaseSection } from '@/components/ShowcaseSection'
import { LandingFooter } from './LandingFooter'
import { LandingHeader } from './LandingHeader'
import { useActiveScene } from './useActiveScene'
import { useLandingMotion } from './useLandingMotion'
import { AgendaScene } from './scenes/AgendaScene'
import { CommunityScene } from './scenes/CommunityScene'
import { FinalScene } from './scenes/FinalScene'
import { GlobalScene } from './scenes/GlobalScene'
import { HeroScene } from './scenes/HeroScene'
import { MantaScene } from './scenes/MantaScene'
import { ModelsScene } from './scenes/ModelsScene'
import { PrizesScene } from './scenes/PrizesScene'
import { TakeawaysScene } from './scenes/TakeawaysScene'
import './landing-cinematic.css'

export function LandingPage() {
  const { scrollYProgress } = useScroll()
  const { cinematic, reduceMotion } = useLandingMotion()
  const activeScene = useActiveScene()

  return (
    <div
      className="cinematic-landing"
      data-motion={reduceMotion ? 'reduced' : cinematic ? 'cinematic' : 'linear'}
      data-scene={activeScene}
    >
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <motion.div className="page-progress cinematic-page-progress" style={{ scaleX: scrollYProgress }} aria-hidden="true" />
      <LandingHeader activeScene={activeScene} />

      <main id="main-content" className="cinematic-main" tabIndex={-1}>
        <HeroScene cinematic={cinematic} />
        <MantaScene cinematic={cinematic} />
        <GlobalScene cinematic={cinematic} />
        <ModelsScene cinematic={cinematic} />
        <AgendaScene />
        <PrizesScene cinematic={cinematic} />
        <TakeawaysScene />
        <div className="cinematic-showcase-slot" id="vitrina">
          <ShowcaseSection />
        </div>
        <FinalScene cinematic={cinematic} />
        <CommunityScene />
      </main>

      <LandingFooter />
    </div>
  )
}
