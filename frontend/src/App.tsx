import { useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import {
  addDoc,
  collection,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import JourneyMap from './JourneyMap'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [destination, setDestination] = useState('')
  const [journeyId, setJourneyId] = useState<string | null>(null)
  const [activeDestination, setActiveDestination] = useState('')
  const [lastSent, setLastSent] = useState('')
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u)
        setMessage('')
      }),
    [],
  )

  useEffect(() => {
    if (!journeyId) return

    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await updateDoc(doc(db, 'journeys', journeyId), {
              lastLocation: {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                heading: pos.coords.heading,
                accuracy: pos.coords.accuracy,
              },
              updatedAt: serverTimestamp(),
            })
            setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
            setLastSent(new Date().toLocaleTimeString())
            setMessage('')
          } catch (e) {
            setMessage((e as Error).message)
          }
        },
        (err) => setMessage('Location error: ' + err.message),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
      )
    }

    sendLocation()
    const timer = setInterval(sendLocation, 60000)
    return () => clearInterval(timer)
  }, [journeyId])

  async function handleSignUp() {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await setDoc(doc(db, 'users', cred.user.uid), {
        email: cred.user.email,
        createdAt: serverTimestamp(),
      })
      setMessage('')
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  async function handleSignIn() {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      setMessage('')
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  async function startJourney() {
    if (!user || !destination.trim()) return
    try {
      const ref = await addDoc(collection(db, 'journeys'), {
        ownerId: user.uid,
        destination: destination.trim(),
        status: 'started',
        startedAt: serverTimestamp(),
      })
      setJourneyId(ref.id)
      setActiveDestination(destination.trim())
      setDestination('')
      setMessage('')
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  async function endJourney() {
    if (!journeyId) return
    try {
      await updateDoc(doc(db, 'journeys', journeyId), {
        status: 'completed',
        endedAt: serverTimestamp(),
      })
      setJourneyId(null)
      setActiveDestination('')
      setLastSent('')
      setPosition(null)
      setMessage('')
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  if (user) {
    return (
      <main>
        <h1>Namma Route</h1>
        <p>Signed in as {user.email}</p>
        {journeyId ? (
          <>
            <p>Journey started to: {activeDestination}</p>
            <p>Last location sent: {lastSent || 'waiting...'}</p>
            {position && <JourneyMap lat={position.lat} lng={position.lng} />}
            <button onClick={endJourney}>End journey</button>
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="Destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
            <button onClick={startJourney}>Start journey</button>
          </>
        )}
        <button onClick={() => signOut(auth)}>Sign out</button>
        <p>{message}</p>
      </main>
    )
  }

  return (
    <main>
      <h1>Namma Route</h1>
      <p>Our Journey. Our Care.</p>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password (6+ characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleSignUp}>Sign up</button>
      <button onClick={handleSignIn}>Sign in</button>
      <p>{message}</p>
    </main>
  )
}

export default App