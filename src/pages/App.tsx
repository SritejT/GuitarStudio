import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { getAuth, onAuthStateChanged, signOut, User } from 'firebase/auth'
import Metronome from './Metronome'
import Login from './Login'
import Signup from './Signup'
import Profile from './Profile'
import HomePage from './HomePage'
import Recordings from './Recordings'
import { app } from '../firebase/config'
import '../styles/App.css'

function App() {
  const [scrollOpacity, setScrollOpacity] = useState(1)
  const [user, setUser] = useState<User | null>(null);
  const auth = getAuth(app);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      const maxScroll = window.innerHeight
      const newOpacity = 1 - Math.min(scrollPosition / maxScroll, 1)
      setScrollOpacity(newOpacity)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, [auth]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };


  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          <div className="nav-brand-group">
            <Link to="/" className="nav-brand">GuitarStudio</Link>
            <Routes>
              <Route path="/tools/metronome" element={<span className="page-title">| <span className="highlight">Metronome</span></span>} />
            </Routes>
          </div>
          <div className="nav-links">
            <Link to="/about">About</Link>
            <div className="dropdown">
              <a href="#" className="dropdown-trigger">Practice Tools</a>
              <div className="dropdown-menu">
                <Link to="/tools/metronome">Metronome</Link>
                {user && <Link to="/recordings">Recordings</Link>}
              </div>
            </div>
            {user ? (
              <>
                <Link to="/profile">{user.displayName || 'Profile'}</Link>
                <button onClick={handleSignOut} className="signout-nav-btn">Sign Out</button>
              </>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/signup" className="signup-btn">Sign Up</Link>
              </>
            )}
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<HomePage scrollOpacity={scrollOpacity} />} />
          <Route path="/tools/metronome" element={<Metronome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/recordings" element={<Recordings />} />
        </Routes>
      </div>
    </Router>
  )
} 

export default App;