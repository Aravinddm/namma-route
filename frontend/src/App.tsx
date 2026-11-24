import { useEffect, useState } from 'react'

function App() {
  const [status, setStatus] = useState('Checking...')

  useEffect(() => {
    fetch('http://127.0.0.1:8000/health')
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('Backend not reachable'))
  }, [])

  return (
    <main>
      <h1>Namma Route</h1>
      <p>Our Journey. Our Care.</p>
      <p>Backend status: {status}</p>
    </main>
  )
}

export default App