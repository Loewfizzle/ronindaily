import { useState, useEffect } from 'react'

interface LandingPageProps {
  onBegin: () => void
}

const PILLARS = [
  {
    kanji: '備',
    label: 'Prepare',
    text: 'AI builds your meal plan and grocery list before day one.',
  },
  {
    kanji: '侍',
    label: 'Commit',
    text: 'One goal. One timeline. The math does not negotiate.',
  },
  {
    kanji: '完',
    label: 'Complete',
    text: 'Hit your goal. Earn your rank. Begin the next mission.',
  },
]

function Divider() {
  return (
    <div style={{ width: '100%', height: '1px', background: 'var(--red)', opacity: 0.35 }} />
  )
}

export default function LandingPage({ onBegin }: LandingPageProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      style={{
        minHeight: '100svh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0 1.5rem',
        paddingTop: 'max(4.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(3rem, env(safe-area-inset-bottom))',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.8s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Kanji */}
        <div
          className="font-jp onboarding-kanji"
          style={{ fontSize: '3rem', color: 'var(--red)', lineHeight: 1, marginBottom: '0.75rem' }}
        >
          侍
        </div>

        {/* Wordmark */}
        <div
          style={{
            fontSize: '0.58rem',
            letterSpacing: '0.44em',
            color: 'var(--text)',
            fontWeight: 500,
            textTransform: 'uppercase',
            marginBottom: '2.5rem',
          }}
        >
          Ronin Daily
        </div>

        <Divider />

        {/* Headline */}
        <div
          style={{
            fontSize: 'clamp(1rem, 3.5vw, 1.5rem)',
            fontWeight: 300,
            letterSpacing: '0.2em',
            color: 'var(--text)',
            textTransform: 'uppercase',
            textAlign: 'center',
            margin: '2.5rem 0 2rem',
            lineHeight: 1.5,
          }}
        >
          This app helps you lose weight.
        </div>

        {/* Body lines */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', marginBottom: '2.75rem' }}>
          {[
            'The math tells you exactly what to eat and how to move.',
            "You either do it or you don't.",
            'Show up. The math handles the rest.',
            'Discipline required.',
          ].map((line, i) => (
            <div
              key={i}
              style={{
                fontSize: '0.88rem',
                color: 'var(--text-2)',
                lineHeight: 2.2,
                textAlign: 'center',
              }}
            >
              {line}
            </div>
          ))}
        </div>

        <Divider />

        {/* Three pillars */}
        <div className="landing-blocks" style={{ margin: '2.75rem 0' }}>
          {PILLARS.map(({ kanji, label, text }) => (
            <div
              key={label}
              style={{
                background: 'var(--elevated)',
                padding: '1.75rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div
                className="font-jp"
                style={{ fontSize: '2.2rem', color: 'var(--red)', lineHeight: 1, marginBottom: '0.65rem' }}
              >
                {kanji}
              </div>
              <div
                style={{
                  fontSize: '0.52rem',
                  letterSpacing: '0.34em',
                  color: 'var(--gold)',
                  textTransform: 'uppercase',
                  marginBottom: '0.85rem',
                }}
              >
                {label}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.8 }}>
                {text}
              </div>
            </div>
          ))}
        </div>

        <Divider />

        {/* CTA */}
        <div style={{ width: '100%', marginTop: '2.75rem' }}>
          <button className="commit-btn" onClick={onBegin}>
            Begin Your Mission
          </button>
        </div>
      </div>
    </div>
  )
}
