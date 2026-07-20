import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

interface LandingMotionState {
  cinematic: boolean
  reduceMotion: boolean
}

function canUseCinematicMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(min-width: 960px) and (min-height: 700px) and (orientation: landscape)').matches
}

export function useLandingMotion(): LandingMotionState {
  const reduceMotion = useReducedMotion() === true
  const [cinematicViewport, setCinematicViewport] = useState(canUseCinematicMotion)

  useEffect(() => {
    const query = window.matchMedia('(min-width: 960px) and (min-height: 700px) and (orientation: landscape)')
    const updateViewport = () => setCinematicViewport(query.matches)
    query.addEventListener('change', updateViewport)
    updateViewport()

    return () => query.removeEventListener('change', updateViewport)
  }, [])

  return {
    cinematic: cinematicViewport && !reduceMotion,
    reduceMotion,
  }
}
