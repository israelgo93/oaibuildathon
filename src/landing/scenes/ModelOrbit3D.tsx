import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { MotionValue } from 'framer-motion'

interface ModelOrbit3DProps {
  progress: MotionValue<number>
}

const ORBIT_RADIUS = 0.76
const ORBIT_PROGRESS_START = 0.05
const ORBIT_PROGRESS_END = 0.92
const ORBIT_TURN_RADIANS = THREE.MathUtils.degToRad(300)

const BODY_BASE_ANGLES = {
  sol: Math.PI / 2,
  terra: (Math.PI * 7) / 6,
  luna: -Math.PI / 6,
} as const

function orbitRotationFor(progressValue: number): number {
  const normalized = THREE.MathUtils.clamp(
    (progressValue - ORBIT_PROGRESS_START) / (ORBIT_PROGRESS_END - ORBIT_PROGRESS_START),
    0,
    1,
  )
  return normalized * ORBIT_TURN_RADIANS
}

function createBodyTexture(
  paint: (context: CanvasRenderingContext2D, size: number) => void,
): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (context) paint(context, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.anisotropy = 2
  return texture
}

function paintWrappedBlob(
  context: CanvasRenderingContext2D,
  size: number,
  x: number,
  y: number,
  radius: number,
  fill: string,
) {
  context.fillStyle = fill
  for (const offset of [-size, 0, size]) {
    context.beginPath()
    context.ellipse(x + offset, y, radius, radius * (0.55 + Math.random() * 0.45), Math.random() * Math.PI, 0, Math.PI * 2)
    context.fill()
  }
}

function paintSunTexture(context: CanvasRenderingContext2D, size: number) {
  const gradient = context.createLinearGradient(0, 0, 0, size)
  gradient.addColorStop(0, '#ffc55e')
  gradient.addColorStop(0.55, '#ffab33')
  gradient.addColorStop(1, '#f07f1d')
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)

  context.globalAlpha = 0.14
  for (let index = 0; index < 130; index += 1) {
    const bright = index % 2 === 0
    paintWrappedBlob(
      context,
      size,
      Math.random() * size,
      Math.random() * size,
      6 + Math.random() * 30,
      bright ? '#ffe1a0' : '#d95f12',
    )
  }
  context.globalAlpha = 1
}

function paintTerraTexture(context: CanvasRenderingContext2D, size: number) {
  const gradient = context.createLinearGradient(0, 0, 0, size)
  gradient.addColorStop(0, '#3d94d2')
  gradient.addColorStop(1, '#1d5e97')
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)

  context.globalAlpha = 0.3
  for (let index = 0; index < 26; index += 1) {
    paintWrappedBlob(context, size, Math.random() * size, Math.random() * size, 22 + Math.random() * 60, '#14487a')
  }
  context.globalAlpha = 0.22
  for (let index = 0; index < 22; index += 1) {
    paintWrappedBlob(context, size, Math.random() * size, Math.random() * size, 12 + Math.random() * 34, '#7bc0e8')
  }
  context.globalAlpha = 0.16
  for (let index = 0; index < 30; index += 1) {
    paintWrappedBlob(context, size, Math.random() * size, Math.random() * size, 10 + Math.random() * 42, '#f2f7fb')
  }
  context.globalAlpha = 1
}

function paintLunaTexture(context: CanvasRenderingContext2D, size: number) {
  const gradient = context.createLinearGradient(0, 0, 0, size)
  gradient.addColorStop(0, '#c3c7cd')
  gradient.addColorStop(1, '#a3a8b0')
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)

  context.globalAlpha = 0.28
  for (let index = 0; index < 34; index += 1) {
    paintWrappedBlob(context, size, Math.random() * size, Math.random() * size, 14 + Math.random() * 46, '#8e939b')
  }
  context.globalAlpha = 0.5
  for (let index = 0; index < 60; index += 1) {
    const x = Math.random() * size
    const y = Math.random() * size
    const radius = 3 + Math.random() * 12
    paintWrappedBlob(context, size, x, y, radius, '#7d828b')
    context.globalAlpha = 0.24
    paintWrappedBlob(context, size, x - radius * 0.28, y - radius * 0.28, radius * 0.55, '#d7dae0')
    context.globalAlpha = 0.5
  }
  context.globalAlpha = 1
}

function createGlowTexture(inner: string, outer: string): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')

  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, inner)
    gradient.addColorStop(0.4, outer)
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)
  }

  return new THREE.CanvasTexture(canvas)
}

function OrbitFallback() {
  return (
    <>
      <span className="body-orbit-ring" />
      <span className="body-orb body-orb-sol" />
      <span className="body-orb body-orb-terra" />
      <span className="body-orb body-orb-luna" />
    </>
  )
}

export default function ModelOrbit3D({ progress }: ModelOrbit3DProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [webglFailed, setWebglFailed] = useState(false)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || webglFailed) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
    } catch {
      setWebglFailed(true)
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearAlpha(0)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
    camera.position.z = 4

    scene.add(new THREE.AmbientLight(0xd6e0ec, 0.85))
    const fillLight = new THREE.DirectionalLight(0xe8f0f8, 0.6)
    fillLight.position.set(1.4, 1.8, 3)
    scene.add(fillLight)

    const sunLight = new THREE.PointLight(0xfff3e0, 3.2, 0, 0.6)
    scene.add(sunLight)

    const ringGeometry = new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 129 }, (_, index) => {
        const angle = (index / 128) * Math.PI * 2
        return new THREE.Vector3(Math.cos(angle) * ORBIT_RADIUS, Math.sin(angle) * ORBIT_RADIUS, -0.4)
      }),
    )
    const ringMaterial = new THREE.LineBasicMaterial({ color: 0x7fc4ff, transparent: true, opacity: 0.42 })
    scene.add(new THREE.LineLoop(ringGeometry, ringMaterial))

    const sunTexture = createBodyTexture(paintSunTexture)
    const terraTexture = createBodyTexture(paintTerraTexture)
    const lunaTexture = createBodyTexture(paintLunaTexture)
    const sunGlowTexture = createGlowTexture('rgba(255, 196, 110, 0.85)', 'rgba(255, 150, 46, 0.32)')
    const terraGlowTexture = createGlowTexture('rgba(126, 196, 255, 0.4)', 'rgba(66, 138, 202, 0.16)')

    const sunMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a1404,
      emissive: 0xffffff,
      emissiveMap: sunTexture,
      emissiveIntensity: 1,
    })
    const terraMaterial = new THREE.MeshStandardMaterial({ map: terraTexture, roughness: 0.68, metalness: 0.04 })
    const lunaMaterial = new THREE.MeshStandardMaterial({ map: lunaTexture, roughness: 0.96, metalness: 0 })

    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.155, 56, 40), sunMaterial)
    const terra = new THREE.Mesh(new THREE.SphereGeometry(0.125, 56, 40), terraMaterial)
    const luna = new THREE.Mesh(new THREE.SphereGeometry(0.1, 48, 32), lunaMaterial)
    terra.rotation.z = 0.32
    scene.add(sun, terra, luna)

    const sunGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: sunGlowTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    )
    sunGlow.scale.setScalar(0.72)
    const terraGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: terraGlowTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    )
    terraGlow.scale.setScalar(0.4)
    scene.add(sunGlow, terraGlow)

    let orbitRotation = orbitRotationFor(progress.get())
    let frameId = 0
    let isIntersecting = false

    const placeBodies = () => {
      const solAngle = BODY_BASE_ANGLES.sol + orbitRotation
      const terraAngle = BODY_BASE_ANGLES.terra + orbitRotation
      const lunaAngle = BODY_BASE_ANGLES.luna + orbitRotation

      sun.position.set(Math.cos(solAngle) * ORBIT_RADIUS, Math.sin(solAngle) * ORBIT_RADIUS, 0)
      terra.position.set(Math.cos(terraAngle) * ORBIT_RADIUS, Math.sin(terraAngle) * ORBIT_RADIUS, 0)
      luna.position.set(Math.cos(lunaAngle) * ORBIT_RADIUS, Math.sin(lunaAngle) * ORBIT_RADIUS, 0)
      sunGlow.position.copy(sun.position)
      terraGlow.position.copy(terra.position)
      sunLight.position.set(sun.position.x, sun.position.y, 1.4)
    }

    const renderFrame = () => {
      sun.rotation.y += 0.0016
      terra.rotation.y += 0.0022
      luna.rotation.y += 0.0018
      placeBodies()
      renderer.render(scene, camera)
      frameId = window.requestAnimationFrame(renderFrame)
    }

    const stopAnimation = () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId)
        frameId = 0
      }
    }

    const updateAnimation = () => {
      if (isIntersecting && !document.hidden && frameId === 0) {
        frameId = window.requestAnimationFrame(renderFrame)
      } else if (!isIntersecting || document.hidden) {
        stopAnimation()
      }
    }

    const unsubscribeProgress = progress.on('change', (value) => {
      orbitRotation = orbitRotationFor(value)
    })

    const observer = new IntersectionObserver(
      (entries) => {
        isIntersecting = entries[0]?.isIntersecting ?? false
        updateAnimation()
      },
      { rootMargin: '160px 0px' },
    )

    const resize = () => {
      const edge = Math.max(1, Math.min(mount.clientWidth, mount.clientHeight))
      renderer.setSize(edge, edge, false)
    }
    const resizeObserver = new ResizeObserver(resize)

    const onVisibilityChange = () => updateAnimation()

    resize()
    placeBodies()
    renderer.render(scene, camera)
    resizeObserver.observe(mount)
    observer.observe(mount)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      unsubscribeProgress()
      observer.disconnect()
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      stopAnimation()
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineLoop) {
          object.geometry.dispose()
        }
      })
      for (const material of [sunMaterial, terraMaterial, lunaMaterial, ringMaterial, sunGlow.material, terraGlow.material]) {
        material.dispose()
      }
      for (const texture of [sunTexture, terraTexture, lunaTexture, sunGlowTexture, terraGlowTexture]) {
        texture.dispose()
      }
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [progress, webglFailed])

  if (webglFailed) return <OrbitFallback />

  return <div ref={mountRef} className="body-orbit-3d" aria-hidden="true" />
}
