import { useState, useEffect, useRef } from 'react'
import metronomeIcon from '../assets/metronome-icon.png'
import './Metronome.css'

type TimeSignature = '4/4' | '3/4' | '2/4'

function Metronome() {
  const [bpm, setBpm] = useState(120)
  const [isPlaying, setIsPlaying] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [currentBeat, setCurrentBeat] = useState(0)
  const [timeSignature, setTimeSignature] = useState<TimeSignature>('4/4')
  const intervalRef = useRef<number>()
  const audioContextRef = useRef<AudioContext>()
  
  const getBeatsPerBar = () => {
    return parseInt(timeSignature.split('/')[0])
  }

  useEffect(() => {
    audioContextRef.current = new AudioContext()
    return () => {
      audioContextRef.current?.close()
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const playClick = (beat: number) => {
    if (!audioContextRef.current) return
    
    const oscillator = audioContextRef.current.createOscillator()
    const gainNode = audioContextRef.current.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContextRef.current.destination)
    
    // First beat: lower frequency, higher volume
    if (beat === 0) {
      oscillator.frequency.value = 600
      gainNode.gain.value = 0.8
    } else {
      // Other beats: higher frequency, lower volume
      oscillator.frequency.value = 800
      gainNode.gain.value = 0.4
    }
    
    oscillator.start()
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.05)
    oscillator.stop(audioContextRef.current.currentTime + 0.05)
  }

  const startMetronome = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setIsPlaying(true)
    setCurrentBeat(0)
    setRotation(0)
    playClick(0)
    
    const interval = 60000 / bpm // Convert BPM to milliseconds
    let beat = 0
    const beatsPerBar = getBeatsPerBar()
    const degreesPerBeat = 360 / beatsPerBar
    
    intervalRef.current = window.setInterval(() => {
      beat = (beat + 1) % beatsPerBar
      setCurrentBeat(beat)
      setRotation(beat * degreesPerBeat)
      playClick(beat)
    }, interval)
  }

  const stopMetronome = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      setIsPlaying(false)
      setCurrentBeat(0)
      setRotation(0)
    }
  }

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBpm = parseInt(e.target.value)
    if (isPlaying) {
      stopMetronome()
    }
    setBpm(newBpm)
  }

  const handleTimeSignatureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (isPlaying) {
      stopMetronome()
    }
    setTimeSignature(e.target.value as TimeSignature)
  }

  return (
    <div className="metronome-container">
      <div className="metronome-content">
        <div className="metronome-content-wrapper">
          <div className="metronome-icon-container">
            <img 
              src={metronomeIcon} 
              alt="Metronome" 
              className={`metronome-icon ${currentBeat === 0 ? 'accent-beat' : ''}`}
              style={{ transform: `rotate(${rotation}deg)` }}
            />
          </div>
          
          <div className="controls">
            <div className="time-signature-control">
              <label htmlFor="time-signature">Time Signature</label>
              <div className="segmented-control">
                <button 
                  className={`segment ${timeSignature === '4/4' ? 'active' : ''}`}
                  onClick={() => handleTimeSignatureChange({ target: { value: '4/4' } } as any)}
                >
                  4/4
                </button>
                <button 
                  className={`segment ${timeSignature === '3/4' ? 'active' : ''}`}
                  onClick={() => handleTimeSignatureChange({ target: { value: '3/4' } } as any)}
                >
                  3/4
                </button>
                <button 
                  className={`segment ${timeSignature === '2/4' ? 'active' : ''}`}
                  onClick={() => handleTimeSignatureChange({ target: { value: '2/4' } } as any)}
                >
                  2/4
                </button>
              </div>
            </div>

            <div className="bpm-control">
              <label htmlFor="bpm-slider">
                <span className="bpm-label">Tempo</span>
                <span className="bpm-value">{bpm} BPM</span>
              </label>
              <input
                type="range"
                id="bpm-slider"
                min="40"
                max="208"
                value={bpm}
                onChange={handleBpmChange}
                className="bpm-slider"
              />
            </div>
            
            <button 
              className={`play-button ${isPlaying ? 'playing' : ''}`}
              onClick={isPlaying ? stopMetronome : startMetronome}
            >
              {isPlaying ? 'Stop' : 'Start'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Metronome 