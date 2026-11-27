import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  query,
  where,
  type DocumentData,
} from 'firebase/firestore'
import { db } from './firebase'
import JourneyMap from './JourneyMap'

type Journey = {
  destination: string
  status: string
  lat?: number
  lng?: number
  updatedAtMs?: number
  arrivedAtMs?: number
  routeJson?: string
  destLat?: number
  destLng?: number
  distanceKm?: number
  durationMin?: number
}

function stamp(d: DocumentData): number {
  return (
    d.arrivedAt?.toMillis?.() ??
    d.updatedAt?.toMillis?.() ??
    d.startedAt?.toMillis?.() ??
    0
  )
}

export default function WatchJourney({ uid }: { uid: string }) {
  const [journey, setJourney] = useState<Journey | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const q = query(
      collection(db, 'journeys'),
      where('ownerId', '==', uid),
      where('status', 'in', ['started', 'near_destination', 'arrived']),
    )
    return onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setJourney(null)
          return
        }
        const docs = snap.docs.map((x) => x.data())
        docs.sort((a, b) => stamp(b) - stamp(a))
        const d = docs[0]
        setJourney({
          destination: d.destination,
          status: d.status,
          lat: d.lastLocation?.lat,
          lng: d.lastLocation?.lng,
          updatedAtMs: d.updatedAt?.toMillis?.(),
          arrivedAtMs: d.arrivedAt?.toMillis?.(),
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

  const statusText =
    journey.status === 'arrived'
      ? 'Arrived'
      : journey.status === 'near_destination'
        ? 'Near destination, arrival not confirmed'
        : 'On the way'

  return (
    <>
      <h2>{statusText}</h2>
      <p>Journey to: {journey.destination}</p>
      {journey.status === 'arrived' && journey.arrivedAtMs && (
        <p>Arrived at: {new Date(journey.arrivedAtMs).toLocaleTimeString()}</p>
      )}
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