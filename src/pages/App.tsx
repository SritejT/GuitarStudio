import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { getAuth, onAuthStateChanged, signOut, User } from 'firebase/auth'
import Metronome from './Metronome'
import Login from './Login'
import Signup from './Signup'
import Profile from './Profile'
import HomePage from './HomePage'
import Recordings from './Recordings'
import { app } from '../firebase/config'
import '../styles/App.css'

const PageTitle = () => {
  const location = useLocation();
  const [title, setTitle] = useState('');

  useEffect(() => {
    const path = location.pathname;
    switch (path) {
      case '/':
        setTitle('Home');
        break;
      case '/login':
        setTitle('Login');
        break;
      case '/signup':
        setTitle('Sign Up');
        break;
      case '/profile':
        setTitle('Profile');
        break;
      case '/tools/metronome':
        setTitle('Metronome');
        break;
      case '/recordings':
        setTitle('Recordings');
        break;
      default:
        setTitle('');
    }
  }, [location]);

  return title ? <span className="page-title">| {title}</span> : null;
};

const AppContent = () => {
  const [scrollY, setScrollY] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const auth = getAuth(app);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollOpacity = Math.max(0.3, 1 - scrollY / 300);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, [auth]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="app-container">
      <nav>
        <div className="nav-left">
          <Link to="/" className="logo">GuitarStudio <PageTitle /></Link>
        </div>
        <div className="nav-right">
          <Link to="/tools/metronome">Metronome</Link>
          {user && <Link to="/recordings">Recordings</Link>}
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
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/tools/metronome" element={<Metronome />} />
        <Route path="/recordings" element={<Recordings />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;