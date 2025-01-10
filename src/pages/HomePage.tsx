import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { app } from '../firebase/config';

interface HomePageProps {
  scrollOpacity: number;
}

const HomePage = ({ scrollOpacity }: HomePageProps) => {
  const navigate = useNavigate();
  const auth = getAuth(app);

  useEffect(() => {
    document.title = 'GuitarStudio | Home';
    return () => {
      document.title = 'GuitarStudio';
    };
  }, []);

  const handleStartPractice = () => {
    if (auth.currentUser) {
      navigate('/recordings');
    } else {
      navigate('/login');
    }
  };

  return (
    <main>
      <section className="hero-section" style={{ opacity: scrollOpacity }}>
        <div className="hero-content">
          <h1>Master the Guitar</h1>
          <p>Your journey to becoming a guitarist starts here</p>
          <button className="cta-button" onClick={handleStartPractice}>Start Practice</button>
        </div>
      </section>

      <section className="features-section">
        <h2>Why Choose GuitarStudio?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Professional Metronome</h3>
            <p>Practice with our advanced metronome featuring multiple time signatures and visual beat indicators</p>
          </div>
          <div className="feature-card">
            <h3>Record & Analyze</h3>
            <p>Record your practice sessions and get AI-powered feedback on your guitar playing</p>
          </div>
          <div className="feature-card">
            <h3>Personal Library</h3>
            <p>Build your own library of recordings and track your progress over time</p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default HomePage;