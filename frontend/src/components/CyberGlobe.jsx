import { useEffect, useState, useRef } from 'react'
import Globe from 'react-globe.gl'

export default function CyberGlobe({ logs }) {
  const globeRef = useRef()
  const [arcsData, setArcsData] = useState([])

  // Every time a new log comes in, draw a laser arc to the Enforcer Node
  useEffect(() => {
    if (logs.length > 0) {
      const latestLog = logs[0]
      // Generate a random origin location for the demo
      const newArc = {
        startLat: (Math.random() - 0.5) * 180,
        startLng: (Math.random() - 0.5) * 360,
        endLat: 37.7749, // Enforcer Node coordinates (e.g., San Francisco)
        endLng: -122.4194,
        color: latestLog.action_taken === 'BLOCKED' ? '#ef4444' : '#a855f7' // Red if blocked, purple if monitored
      }
      setArcsData(prev => [...prev, newArc].slice(-20)) // Keep last 20 arcs
    }
  }, [logs])

  useEffect(() => {
    // Keep it spinning slowly
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true
      globeRef.current.controls().autoRotateSpeed = 0.5
      globeRef.current.pointOfView({ altitude: 2.5 })
    }
  }, [])

  return (
    <div className="fixed inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen flex items-center justify-center">
      <Globe
        ref={globeRef}
        width={800}
        height={800}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        arcsData={arcsData}
        arcColor="color"
        arcDashLength={0.5}
        arcDashGap={0.2}
        arcDashAnimateTime={1500}
        arcAltitudeAutoScale={0.3}
      />
    </div>
  )
}