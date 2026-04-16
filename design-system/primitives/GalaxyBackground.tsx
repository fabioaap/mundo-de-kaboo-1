import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'

interface Star {
  x: number
  y: number
  size: number
  opacity: number
  twinkleDelay: number
}

export interface GalaxyBackgroundProps {
  className?: string
  density?: number
}

const CACHE_VERSION = 1
const CACHE_KEY_PREFIX = 'galaxy_stars_v'
const MEMORY_CACHE: Map<string, Star[]> = new Map()
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000

const generateCacheKey = (w: number, h: number, density: number, isMobile: boolean, isLowPerf: boolean) => {
  const rw = Math.round(w / 100) * 100
  const rh = Math.round(h / 100) * 100
  return `${CACHE_KEY_PREFIX}${CACHE_VERSION}_${rw}x${rh}_d${density.toFixed(2)}_m${isMobile ? '1' : '0'}_p${isLowPerf ? '1' : '0'}`
}

const loadStarsFromCache = (key: string): Star[] | null => {
  try {
    if (MEMORY_CACHE.has(key)) return MEMORY_CACHE.get(key)!
    const cached = localStorage.getItem(key)
    if (!cached) return null
    const parsed = JSON.parse(cached)
    if (parsed.timestamp && Date.now() - parsed.timestamp > MAX_CACHE_AGE) {
      localStorage.removeItem(key)
      return null
    }
    if (parsed.stars) { MEMORY_CACHE.set(key, parsed.stars); return parsed.stars }
    return null
  } catch { return null }
}

const saveStarsToCache = (key: string, stars: Star[]): void => {
  try {
    MEMORY_CACHE.set(key, stars)
    localStorage.setItem(key, JSON.stringify({ stars, timestamp: Date.now(), version: CACHE_VERSION }))
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY_PREFIX))
    if (allKeys.length > 5) {
      const sorted = allKeys.map(k => {
        try { return { key: k, timestamp: JSON.parse(localStorage.getItem(k) || '{}').timestamp || 0 } }
        catch { return { key: k, timestamp: 0 } }
      }).sort((a, b) => a.timestamp - b.timestamp)
      sorted.slice(0, allKeys.length - 5).forEach(({ key: k }) => { localStorage.removeItem(k); MEMORY_CACHE.delete(k) })
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      try {
        Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY_PREFIX)).forEach(k => localStorage.removeItem(k))
        MEMORY_CACHE.clear()
      } catch { /* ignore */ }
    }
  }
}

const detectLowPerformance = (): boolean => {
  if (typeof navigator === 'undefined') return false
  return (navigator.hardwareConcurrency || 2) <= 2 || ((navigator as any).deviceMemory || 4) <= 2
}

export const GalaxyBackground: React.FC<GalaxyBackgroundProps> = ({ className = '', density = 0.4 }) => {
  const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
  const isLowPerformance = useMemo(() => detectLowPerformance(), [])

  const effectiveDensity = useMemo(() => {
    if (isLowPerformance) return density * 0.3
    if (isMobile) return density * 0.5
    return density
  }, [density, isMobile, isLowPerformance])

  const [stars] = useState<Star[]>(() => {
    const initLowPerf = detectLowPerformance()
    const initMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    let initDensity = density
    if (initLowPerf) initDensity = density * 0.3
    else if (initMobile) initDensity = density * 0.5

    const cacheKey = generateCacheKey(window.innerWidth, window.innerHeight, initDensity, initMobile, initLowPerf)
    const cached = loadStarsFromCache(cacheKey)
    if (cached && cached.length > 0) return cached

    const maxStars = initMobile ? 80 : initLowPerf ? 100 : 150
    const count = Math.min(Math.floor((window.innerWidth * window.innerHeight) / 15000 * initDensity), maxStars)
    const newStars: Star[] = Array.from({ length: count }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 1,
      opacity: Math.random() * 0.6 + 0.2,
      twinkleDelay: Math.random() * 2,
    }))
    saveStarsToCache(cacheKey, newStars)
    return newStars
  })

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const galaxyRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const rotationRef = useRef(0)
  const mouseThrottleRef = useRef(0)

  useEffect(() => {
    const animate = () => {
      rotationRef.current += 0.08
      if (galaxyRef.current) galaxyRef.current.style.transform = `rotate(${rotationRef.current}deg)`
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    animationFrameRef.current = requestAnimationFrame(animate)
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current) }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!galaxyRef.current || isMobile || isLowPerformance) return
    const now = Date.now()
    if (now - mouseThrottleRef.current < 50) return
    mouseThrottleRef.current = now
    const rect = galaxyRef.current.getBoundingClientRect()
    setMousePos({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 })
  }, [isMobile, isLowPerformance])

  const starElements = useMemo(() => stars.map((star, index) => {
    let offsetX = 0, offsetY = 0
    if (!isMobile && !isLowPerformance) {
      const dx = star.x - mousePos.x, dy = star.y - mousePos.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < 15) {
        const force = (1 - distance / 15) * 1.5
        offsetX = (dx / distance) * force
        offsetY = (dy / distance) * force
      }
    }
    return (
      <div
        key={index}
        className="galaxy-star"
        style={{
          left: `calc(${star.x}% + ${offsetX}px)`,
          top: `calc(${star.y}% + ${offsetY}px)`,
          width: `${star.size}px`,
          height: `${star.size}px`,
          opacity: star.opacity * 0.25,
          animationDelay: `${star.twinkleDelay}s`,
          transform: 'translate(-50%, -50%)',
          willChange: 'transform, opacity',
        }}
      />
    )
  }), [stars, mousePos, isMobile, isLowPerformance])

  return (
    <>
      <style>{`
        @keyframes galaxyTwinkle {
          0%, 100% { opacity: 0.2; box-shadow: 0 0 2px 1px rgba(255,255,255,0.3); }
          50% { opacity: 0.6; box-shadow: 0 0 4px 2px rgba(255,255,255,0.5); }
        }
        .galaxy-star {
          position: absolute;
          border-radius: 50%;
          background: white;
          animation: galaxyTwinkle 3s ease-in-out infinite;
          pointer-events: none;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform: translateZ(0);
        }
      `}</style>
      <div
        ref={galaxyRef}
        className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
        style={{ transformOrigin: 'center center', zIndex: 1, willChange: 'transform' }}
        onMouseMove={handleMouseMove}
      >
        {starElements}
      </div>
    </>
  )
}
