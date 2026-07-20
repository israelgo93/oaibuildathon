import { useEffect, useState } from 'react'
import { LANDING_VISUAL_SCENE_IDS, type LandingVisualSceneId } from './content'

function isLandingVisualSceneId(id: string): id is LandingVisualSceneId {
  return LANDING_VISUAL_SCENE_IDS.some((sceneId) => sceneId === id)
}

export function useActiveScene(): LandingVisualSceneId {
  const [activeScene, setActiveScene] = useState<LandingVisualSceneId>('top')

  useEffect(() => {
    let frameId = 0

    const measure = () => {
      frameId = 0
      const anchor = window.innerHeight * 0.5
      let current: LandingVisualSceneId = 'top'

      for (const id of LANDING_VISUAL_SCENE_IDS) {
        const section = document.getElementById(id)
        if (!section || !isLandingVisualSceneId(section.id)) continue
        if (section.getBoundingClientRect().top <= anchor) current = section.id
      }

      setActiveScene((previous) => previous === current ? previous : current)
    }

    const schedule = () => {
      if (frameId === 0) frameId = window.requestAnimationFrame(measure)
    }

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    measure()

    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frameId !== 0) window.cancelAnimationFrame(frameId)
    }
  }, [])

  return activeScene
}
