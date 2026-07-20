import { useEffect, useState } from 'react'
import { countdownUntil, type CountdownValue } from '@/lib/countdown'

export function useCountdown(deadline: string): CountdownValue {
  const [countdown, setCountdown] = useState<CountdownValue>(() => countdownUntil(deadline))

  useEffect(() => {
    const currentCountdown = countdownUntil(deadline)
    setCountdown(currentCountdown)

    if (currentCountdown.isComplete) return undefined

    const intervalId = window.setInterval(() => {
      const nextCountdown = countdownUntil(deadline)
      setCountdown(nextCountdown)
      if (nextCountdown.isComplete) window.clearInterval(intervalId)
    }, 1_000)
    return () => window.clearInterval(intervalId)
  }, [deadline])

  return countdown
}
