import { useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth } from './firebase'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  async function handleSignUp() {
    try {
      await createUserWithEmailAndPassword(auth, email, password)
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

  if (user) {
    return (
      <main>
        <h1>Namma Route</h1>
        <p>Signed in as {user.email}</p>
        <button onClick={() => signOut(auth)}>Sign out</button>
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