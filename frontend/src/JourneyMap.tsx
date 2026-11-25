import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type Props = {
  lat: number
  lng: number
  routeJson?: string
  destLat?: number
  destLng?: number
}

export default function JourneyMap({ lat, lng, routeJson, destLat, destLng }: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.CircleMarker | null>(null)
  const routeRef = useRef<L.FeatureGroup | null>(null)

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
      routeRef.current = null
    }
  }, [])

  useEffect(() => {
    markerRef.current?.setLatLng([lat, lng])
    if (!routeRef.current) mapRef.current?.setView([lat, lng])
  }, [lat, lng])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    routeRef.current?.remove()
    routeRef.current = null
    if (!routeJson) return
    const points = JSON.parse(routeJson) as [number, number][]
    if (points.length < 2) return
    const group = L.featureGroup()
    const line = L.polyline(points, { color: '#2563eb', weight: 5, opacity: 0.85 })
    group.addLayer(line)
    if (destLat !== undefined && destLng !== undefined) {
      group.addLayer(
        L.circleMarker([destLat, destLng], {
          radius: 9,
          color: '#ffffff',
          weight: 3,
          fillColor: '#16a34a',
          fillOpacity: 1,
        }),
      )
    }
    group.addTo(map)
    markerRef.current?.bringToFront()
    routeRef.current = group
    map.fitBounds(line.getBounds(), { padding: [30, 30] })
  }, [routeJson, destLat, destLng])

  return (
    <div
      ref={divRef}
      style={{ height: '320px', width: '100%', maxWidth: '600px', margin: '16px auto' }}
    />
  )
}