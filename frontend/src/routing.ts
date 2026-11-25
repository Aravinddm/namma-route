export type Place = { name: string; lat: number; lng: number }
export type RouteInfo = {
  points: [number, number][]
  distanceKm: number
  durationMin: number
}

export async function searchPlaces(text: string, lang: string): Promise<Place[]> {
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in' +
    '&accept-language=' + lang +
    '&q=' + encodeURIComponent(text)
  const res = await fetch(url)
  if (!res.ok) throw new Error('Place search failed')
  const data = await res.json()
  return data.map((p: { display_name: string; lat: string; lon: string }) => ({
    name: p.display_name,
    lat: parseFloat(p.lat),
    lng: parseFloat(p.lon),
  }))
}

export async function getRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<RouteInfo> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Route request failed')
  const data = await res.json()
  const r = data.routes?.[0]
  if (!r) throw new Error('No route found')
  const all = r.geometry.coordinates as [number, number][]
  const step = Math.max(1, Math.ceil(all.length / 400))
  const points = all
    .filter((_, i) => i % step === 0 || i === all.length - 1)
    .map(([lng, lat]) => [lat, lng] as [number, number])
  return {
    points,
    distanceKm: Math.round(r.distance / 100) / 10,
    durationMin: Math.round(r.duration / 60),
  }
}