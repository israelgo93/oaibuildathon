import { useEffect, type RefObject } from 'react'
import type { MotionValue } from 'framer-motion'
import { HERO_VIDEO_RANGE } from './content'

interface UseHeroVideoScrubOptions {
  enabled: boolean
  heroRef: RefObject<HTMLElement | null>
  progress: MotionValue<number>
  videoRef: RefObject<HTMLVideoElement | null>
}

export function useHeroVideoScrub({ enabled, heroRef, progress, videoRef }: UseHeroVideoScrubOptions) {
  useEffect(() => {
    if (!enabled) return

    const video = videoRef.current
    const hero = heroRef.current
    if (!video || !hero) return

    let frameId = 0
    let isActive = true
    let targetProgress = progress.get()

    const seekToTarget = () => {
      frameId = 0
      if (
        !isActive
        || video.seeking
        || video.readyState < HTMLMediaElement.HAVE_METADATA
        || !Number.isFinite(video.duration)
        || video.duration <= 0
      ) {
        return
      }

      const maxTime = Math.max(0, video.duration - 0.05)
      const targetTime = Math.min(maxTime, Math.max(0, targetProgress * maxTime * HERO_VIDEO_RANGE))

      if (video.seekable.length > 0) {
        const seekableStart = video.seekable.start(0)
        const seekableEnd = video.seekable.end(video.seekable.length - 1)
        if (targetTime < seekableStart || targetTime > seekableEnd) return
      }

      if (Math.abs(video.currentTime - targetTime) >= 1 / 24) {
        video.currentTime = targetTime
      }
    }

    const scheduleSeek = () => {
      if (frameId === 0 && isActive) frameId = window.requestAnimationFrame(seekToTarget)
    }
    const onMediaReady = () => {
      video.pause()
      scheduleSeek()
    }
    const unsubscribe = progress.on('change', (latestProgress) => {
      targetProgress = latestProgress
      scheduleSeek()
    })
    const observer = new IntersectionObserver(([entry]) => {
      isActive = entry?.isIntersecting ?? false
      if (isActive) scheduleSeek()
      else video.pause()
    }, { rootMargin: '20% 0px' })

    video.addEventListener('loadedmetadata', onMediaReady)
    video.addEventListener('loadeddata', onMediaReady)
    video.addEventListener('seeked', scheduleSeek)
    video.addEventListener('progress', scheduleSeek)
    observer.observe(hero)

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) onMediaReady()

    return () => {
      unsubscribe()
      observer.disconnect()
      video.removeEventListener('loadedmetadata', onMediaReady)
      video.removeEventListener('loadeddata', onMediaReady)
      video.removeEventListener('seeked', scheduleSeek)
      video.removeEventListener('progress', scheduleSeek)
      if (frameId !== 0) window.cancelAnimationFrame(frameId)
      video.pause()
    }
  }, [enabled, heroRef, progress, videoRef])
}
