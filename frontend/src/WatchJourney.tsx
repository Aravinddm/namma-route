import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from './firebase'
import JourneyMap from './JourneyMap'

type Journey = {
  destination: string
  lat?: number
  lng?: number
  updatedAtMs?: number
  routeJson?: string
  destLat?: number
  destLng?: number
  distanceKm?: number
  durationMin?: number
}

export default function WatchJourney({ uid }: { uid: string }) {
  const [journey, setJourney] = useState<Journey | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const q = query(
      collection(db, 'journeys'),
      where('ownerId', '==', uid),
      where('status', '==', 'started'),
    )
    return onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setJourney(null)
          return
        }
        const d = snap.docs[0].data()
        setJourney({
          destination: d.destination,
          lat: d.lastLocation?.lat,
          lng: d.lastLocation?.lng,
          updatedAtMs: d.updatedAt?.toMillis?.(),
          routeJson: d.routeJson,
          destLat: d.destinationLocation?.lat,
          destLng: d.destinationLocation?.lng,
          distanceKm: d.distanceKm,
          durationMin: d.durationMin,
        })
        setError('')
      },
      (e) => setError(e.message),
    )
  }, [uid])

  if (error) return <p>{error}</p>
  if (!journey) return <p>No active journey</p>

  return (
    <>
      <p>Journey to: {journey.destination}</p>
      {journey.distanceKm !== undefined && (
        <p>
          Route: {journey.distanceKm} km, about {journey.durationMin} min from the start
        </p>
      )}
      <p>
        Updated:{' '}
        {journey.updatedAtMs
          ? new Date(journey.updatedAtMs).toLocaleTimeString()
          : 'waiting for first location...'}
      </p>
      {journey.lat !== undefined && journey.lng !== undefined && (
        <JourneyMap
          lat={journey.lat}
          lng={journey.lng}
          routeJson={journey.routeJson}
          destLat={journey.destLat}
          destLng={journey.destLng}
        />
      )}
    </>
  )
}