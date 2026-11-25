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
import WatchJourney from './WatchJourney'
import { getRoute, searchPlaces, type Place } from './routing'

const TEXT = {
  en: {
    tagline: 'Our Journey. Our Care.',
    email: 'Email',
    password: 'Password (6+ characters)',
    signUp: 'Sign up',
    signIn: 'Sign in',
    signOut: 'Sign out',
    signedInAs: 'Signed in as',
    startJourney: 'Start journey',
    whereGoing: 'Where are you going?',
    searchPlaceholder: 'Search destination',
    search: 'Search',
    searching: 'Searching...',
    selected: 'Selected:',
    confirm: 'Confirm and go',
    cancel: 'Cancel',
    journeyTo: 'Journey to:',
    route: (km: number, min: number) => `Route: ${km} km, about ${min} min`,
    lastSent: 'Last location sent:',
    waiting: 'waiting...',
    endJourney: 'End journey',
    settings: 'Settings',
    language: 'Language',
    close: 'Close',
  },
  ta: {
    tagline: 'நம் பயணம். நம் அக்கறை.',
    email: 'மின்னஞ்சல்',
    password: 'கடவுச்சொல் (6+ எழுத்துகள்)',
    signUp: 'பதிவு செய்',
    signIn: 'உள்நுழை',
    signOut: 'வெளியேறு',
    signedInAs: 'உள்நுழைந்தவர்:',
    startJourney: 'பயணத்தைத் தொடங்கு',
    whereGoing: 'நீங்கள் எங்கே செல்கிறீர்கள்?',
    searchPlaceholder: 'இலக்கைத் தேடுங்கள்',
    search: 'தேடு',
    searching: 'தேடுகிறது...',
    selected: 'தேர்ந்தெடுத்தது:',
    confirm: 'உறுதிசெய்து செல்',
    cancel: 'ரத்துசெய்',
    journeyTo: 'பயண இலக்கு:',
    route: (km: number, min: number) => `பாதை: ${km} கி.மீ, சுமார் ${min} நிமிடம்`,
    lastSent: 'கடைசியாக அனுப்பிய இடம்:',
    waiting: 'காத்திருக்கிறது...',
    endJourney: 'பயணத்தை முடி',
    settings: 'அமைப்புகள்',
    language: 'மொழி',
    close: 'மூடு',
  },
  hi: {
    tagline: 'हमारी यात्रा। हमारी देखभाल।',
    email: 'ईमेल',
    password: 'पासवर्ड (6+ अक्षर)',
    signUp: 'साइन अप करें',
    signIn: 'साइन इन करें',
    signOut: 'साइन आउट',
    signedInAs: 'साइन इन किया हुआ:',
    startJourney: 'यात्रा शुरू करें',
    whereGoing: 'आप कहाँ जा रहे हैं?',
    searchPlaceholder: 'गंतव्य खोजें',
    search: 'खोजें',
    searching: 'खोज रहे हैं...',
    selected: 'चुना गया:',
    confirm: 'पुष्टि करें और चलें',
    cancel: 'रद्द करें',
    journeyTo: 'यात्रा का गंतव्य:',
    route: (km: number, min: number) => `मार्ग: ${km} किमी, लगभग ${min} मिनट`,
    lastSent: 'अंतिम भेजी गई लोकेशन:',
    waiting: 'प्रतीक्षा कर रहे हैं...',
    endJourney: 'यात्रा समाप्त करें',
    settings: 'सेटिंग्स',
    language: 'भाषा',
    close: 'बंद करें',
  },
}

type Lang = keyof typeof TEXT

const LANG_NAMES: Record<Lang, string> = {
  en: 'English',
  ta: 'தமிழ்',
  hi: 'हिन्दी',
}

function loadLang(): Lang {
  try {
    const saved = localStorage.getItem('nr-lang')
    return saved === 'ta' || saved === 'hi' ? saved : 'en'
  } catch {
    return 'en'
  }
}

function App() {
  const [lang, setLang] = useState<Lang>(loadLang)
  const [showSettings, setShowSettings] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [planning, setPlanning] = useState(false)
  const [destination, setDestination] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [chosen, setChosen] = useState<Place | null>(null)
  const [searching, setSearching] = useState(false)
  const [journeyId, setJourneyId] = useState<string | null>(null)
  const [activeDestination, setActiveDestination] = useState('')
  const [lastSent, setLastSent] = useState('')
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [routeJson, setRouteJson] = useState<string | undefined>()
  const [destPos, setDestPos] = useState<{ lat: number; lng: number } | null>(null)
  const [routeStats, setRouteStats] = useState<{ km: number; min: number } | null>(null)

  const t = TEXT[lang]

  function changeLang(l: Lang) {
    setLang(l)
    setResults([])
    setChosen(null)
    try {
      localStorage.setItem('nr-lang', l)
    } catch {
      // ignore storage problems
    }
  }

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

  async function handleSearch() {
    if (!destination.trim()) return
    try {
      setSearching(true)
      const found = await searchPlaces(destination.trim(), lang)
      setResults(found)
      setChosen(null)
      setMessage(found.length ? '' : 'No places found')
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setSearching(false)
    }
  }

  function cancelPlanning() {
    setPlanning(false)
    setDestination('')
    setResults([])
    setChosen(null)
    setMessage('')
  }

  async function startJourney() {
    if (!user || !chosen) return
    try {
      setMessage('Starting journey...')
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 20000,
        }),
      )
      const from = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      let routeNote = ''
      let route = null
      try {
        route = await getRoute(from, chosen)
      } catch {
        routeNote = 'Route not available, journey started without it'
      }
      const ref = await addDoc(collection(db, 'journeys'), {
        ownerId: user.uid,
        destination: chosen.name,
        destinationLocation: { lat: chosen.lat, lng: chosen.lng },
        status: 'started',
        startedAt: serverTimestamp(),
        ...(route
          ? {
              routeJson: JSON.stringify(route.points),
              distanceKm: route.distanceKm,
              durationMin: route.durationMin,
            }
          : {}),
      })
      setJourneyId(ref.id)
      setActiveDestination(chosen.name)
      setPosition(from)
      setDestPos({ lat: chosen.lat, lng: chosen.lng })
      setRouteJson(route ? JSON.stringify(route.points) : undefined)
      setRouteStats(route ? { km: route.distanceKm, min: route.durationMin } : null)
      setPlanning(false)
      setDestination('')
      setResults([])
      setChosen(null)
      setMessage(routeNote)
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
      setRouteJson(undefined)
      setDestPos(null)
      setRouteStats(null)
      setMessage('')
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  const settingsPanel = (
    <>
      <button onClick={() => setShowSettings(!showSettings)}>{t.settings}</button>
      {showSettings && (
        <div>
          <p>{t.language}</p>
          {(Object.keys(TEXT) as Lang[]).map((l) => (
            <button key={l} onClick={() => changeLang(l)} disabled={lang === l}>
              {LANG_NAMES[l]}
            </button>
          ))}
          <button onClick={() => setShowSettings(false)}>{t.close}</button>
        </div>
      )}
    </>
  )

  if (user && window.location.hash === '#watch') {
    return (
      <main>
        <h1>Namma Route</h1>
        <p>Family view</p>
        <WatchJourney uid={user.uid} />
      </main>
    )
  }

  if (user) {
    return (
      <main>
        <h1>Namma Route</h1>
        <p>
          {t.signedInAs} {user.email}
        </p>
        {journeyId ? (
          <>
            <p>
              {t.journeyTo} {activeDestination}
            </p>
            {routeStats && <p>{t.route(routeStats.km, routeStats.min)}</p>}
            <p>
              {t.lastSent} {lastSent || t.waiting}
            </p>
            {position && (
              <JourneyMap
                lat={position.lat}
                lng={position.lng}
                routeJson={routeJson}
                destLat={destPos?.lat}
                destLng={destPos?.lng}
              />
            )}
            <button onClick={endJourney}>{t.endJourney}</button>
          </>
        ) : !planning ? (
          <button onClick={() => setPlanning(true)}>{t.startJourney}</button>
        ) : (
          <>
            <p>{t.whereGoing}</p>
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
            <button onClick={handleSearch} disabled={searching}>
              {searching ? t.searching : t.search}
            </button>
            {results.map((p) => (
              <p key={p.name + p.lat}>
                <button
                  onClick={() => {
                    setChosen(p)
                    setResults([])
                  }}
                >
                  {p.name}
                </button>
              </p>
            ))}
            {chosen && (
              <p>
                {t.selected} {chosen.name}
              </p>
            )}
            <button onClick={startJourney} disabled={!chosen}>
              {t.confirm}
            </button>
            <button onClick={cancelPlanning}>{t.cancel}</button>
          </>
        )}
        <button onClick={() => signOut(auth)}>{t.signOut}</button>
        {settingsPanel}
        <p>{message}</p>
      </main>
    )
  }

  return (
    <main>
      <h1>Namma Route</h1>
      <p>{t.tagline}</p>
      <input
        type="email"
        placeholder={t.email}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder={t.password}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleSignUp}>{t.signUp}</button>
      <button onClick={handleSignIn}>{t.signIn}</button>
      {settingsPanel}
      <p>{message}</p>
    </main>
  )
}

export default App