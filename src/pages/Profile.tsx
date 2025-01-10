import { useEffect, useState } from 'react';
import { onAuthStateChanged, User, getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { app } from '../firebase/config';
import '../styles/Profile.css';

const auth = getAuth(app);

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'GuitarStudio | Profile';
    return () => {
      document.title = 'GuitarStudio';
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h2>Hello, {user.displayName || 'User'}</h2>
        <div className="profile-info">
          <p>Email: {user.email}</p>
        </div>
      </div>
    </div>
  );
};

export default Profile; 