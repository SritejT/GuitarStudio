interface HomePageProps {
  scrollOpacity: number;
}

const HomePage = ({ scrollOpacity }: HomePageProps) => (
  <main>
    <section className="hero-section" style={{ opacity: scrollOpacity }}>
      <div className="hero-content">
        <h1>Master the Guitar</h1>
        <p>Your journey to becoming a guitarist starts here</p>
        <button className="cta-button">Start Practice</button>
      </div>
    </section>

    <section className="features-section">
      <h2>Why Choose GuitarStudio?</h2>
      <div className="features-grid">
        <div className="feature-card">
          <h3>Structured Learning</h3>
          <p>Follow our carefully crafted curriculum</p>
        </div>
        <div className="feature-card">
          <h3>Practice Tools</h3>
          <p>Access to professional metronome</p>
        </div>
        <div className="feature-card">
          <h3>Track Progress</h3>
          <p>Monitor your improvement over time</p>
        </div>
      </div>
    </section>
  </main>
);

export default HomePage;