import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type Props = { lat: number; lng: number }

export default function JourneyMap({ lat, lng }: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.CircleMarker | null>(null)

  useEffect(() => {
    if (!divRef.current || mapRef.current) return
    const map = L.map(divRef.current).setView([lat, lng], 15)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
    markerRef.current = L.circleMarker([lat, lng], {
      radius: 9,
      color: '#ffffff',
      weight: 3,
      fillColor: '#c0392b',
      fillOpacity: 1,
    }).addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    mapRef.current?.setView([lat, lng])
    markerRef.current?.setLatLng([lat, lng])
  }, [lat, lng])

  return (
    <div
      ref={divRef}
      style={{ height: '320px', width: '100%', maxWidth: '600px', margin: '16px auto' }}
    />
  )
}