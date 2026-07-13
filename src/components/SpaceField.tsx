import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

interface SpaceFieldProps {
  className?: string
}

export function SpaceField({ className }: SpaceFieldProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [shouldInitialize, setShouldInitialize] = useState(false)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    if (!('IntersectionObserver' in window)) {
      setShouldInitialize(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldInitialize(true)
          observer.disconnect()
        }
      },
      { rootMargin: '180px 0px' },
    )

    observer.observe(mount)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!shouldInitialize) return

    const mount = mountRef.current
    if (!mount) return

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reduceMotion = motionQuery.matches
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100)
    camera.position.z = 3.4

    let renderer: THREE.WebGLRenderer

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance',
      })
    } catch {
      mount.dataset.webgl = 'unavailable'
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6))
    renderer.setClearAlpha(0)
    mount.appendChild(renderer.domElement)

    const starCount = window.innerWidth < 720 ? 260 : 520
    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)
    const sizes = new Float32Array(starCount)
    const phases = new Float32Array(starCount)
    const cool = new THREE.Color(0.42, 0.68, 1)
    const warm = new THREE.Color(1, 0.62, 0.3)
    const white = new THREE.Color(0.88, 0.94, 1)

    for (let index = 0; index < starCount; index += 1) {
      const positionIndex = index * 3
      positions[positionIndex] = (Math.random() - 0.5) * 10
      positions[positionIndex + 1] = (Math.random() - 0.5) * 6
      positions[positionIndex + 2] = (Math.random() - 0.5) * 4

      const color = index % 17 === 0 ? warm : index % 5 === 0 ? cool : white
      colors[positionIndex] = color.r
      colors[positionIndex + 1] = color.g
      colors[positionIndex + 2] = color.b
      sizes[index] = 0.025 + Math.random() * 0.045
      phases[index] = Math.random() * Math.PI * 2
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float uTime;
        attribute vec3 color;
        attribute float aSize;
        attribute float aPhase;
        varying vec3 vColor;
        varying float vOpacity;

        void main() {
          vColor = color;
          float twinkle = 0.84 + sin((uTime * 0.7) + aPhase) * 0.16;
          vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
          float perspective = 120.0 / max(1.0, -viewPosition.z);
          gl_PointSize = clamp(aSize * perspective * twinkle, 0.85, 3.1);
          gl_Position = projectionMatrix * viewPosition;
          vOpacity = twinkle;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;

        void main() {
          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          float halo = 1.0 - smoothstep(0.1, 0.5, distanceToCenter);
          float core = 1.0 - smoothstep(0.0, 0.16, distanceToCenter);
          float alpha = ((halo * 0.48) + (core * 0.52)) * vOpacity * 0.76;

          if (alpha < 0.02) discard;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
    })
    const stars = new THREE.Points(geometry, material)
    stars.rotation.z = -0.12
    scene.add(stars)

    let pointerX = 0
    let pointerY = 0
    let frameId = 0
    let isIntersecting = false
    let pointerListening = false

    const resize = () => {
      const { clientWidth, clientHeight } = mount
      renderer.setSize(clientWidth, clientHeight, false)
      camera.aspect = clientWidth / Math.max(clientHeight, 1)
      camera.updateProjectionMatrix()
    }

    const onPointerMove = (event: PointerEvent) => {
      pointerX = (event.clientX / window.innerWidth - 0.5) * 0.16
      pointerY = (event.clientY / window.innerHeight - 0.5) * 0.1
    }

    const setPointerListening = (shouldListen: boolean) => {
      if (shouldListen === pointerListening) return

      if (shouldListen) {
        window.addEventListener('pointermove', onPointerMove, { passive: true })
      } else {
        window.removeEventListener('pointermove', onPointerMove)
      }

      pointerListening = shouldListen
    }

    const renderFrame = () => {
      material.uniforms.uTime.value = window.performance.now() * 0.001
      stars.rotation.y += 0.00028
      stars.rotation.x += (pointerY - stars.rotation.x) * 0.018
      stars.position.x += (pointerX - stars.position.x) * 0.014
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
      const shouldAnimate = !reduceMotion && isIntersecting && !document.hidden
      setPointerListening(shouldAnimate)

      if (shouldAnimate && frameId === 0) {
        frameId = window.requestAnimationFrame(renderFrame)
      } else if (!shouldAnimate) {
        stopAnimation()
        renderer.render(scene, camera)
      }
    }

    const onMotionPreferenceChange = (event: MediaQueryListEvent) => {
      reduceMotion = event.matches
      updateAnimation()
    }

    const onVisibilityChange = () => updateAnimation()

    const observer = new IntersectionObserver(
      (entries) => {
        isIntersecting = entries[0]?.isIntersecting ?? false
        updateAnimation()
      },
      { rootMargin: '120px 0px' },
    )

    resize()
    renderer.render(scene, camera)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibilityChange)
    motionQuery.addEventListener('change', onMotionPreferenceChange)
    observer.observe(mount)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', resize)
      setPointerListening(false)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      motionQuery.removeEventListener('change', onMotionPreferenceChange)
      stopAnimation()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [shouldInitialize])

  return <div ref={mountRef} className={className} aria-hidden="true" />
}
