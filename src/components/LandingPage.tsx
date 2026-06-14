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
    text: 'Commit to a goal. The app does the math. You do the work.',
  },
  {
    kanji: '完',
    label: 'Complete',
    text: 'The math guarantees it. Discipline earns it.',
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
        pointerEvents: visible ? 'auto' : 'none',
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
        {/* Hero kanji — font-jp only (no onboarding-kanji class to avoid its !important size override) */}
        <div
          className="font-jp"
          style={{
            fontSize: '5rem',
            color: 'var(--red)',
            lineHeight: 1,
            marginBottom: '0.75rem',
            animation: 'kanjiPulse 4s ease-in-out infinite',
          }}
        >
          侍
        </div>

        {/* Wordmark */}
        <div
          style={{
            fontSize: '1.1rem',
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
            fontSize: '1.8rem',
            fontWeight: 300,
            letterSpacing: '0.12em',
            color: 'var(--text)',
            textTransform: 'uppercase',
            textAlign: 'center',
            margin: '2.5rem 0 2rem',
            lineHeight: 1.4,
          }}
        >
          This app helps you lose weight.
        </div>

        {/* Body lines */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', marginBottom: '2.75rem' }}>
          {[
            'Set your goal. Set your deadline. The app builds your daily mission.',
            'Eat this. Move this much. That is all.',
            'Show up. The app handles the rest.',
            'Discipline required.',
          ].map((line, i) => (
            <div
              key={i}
              style={{
                fontSize: '1.05rem',
                color: 'var(--text-2)',
                lineHeight: 2.0,
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
                borderTop: '2px solid var(--red)',
                padding: '2.25rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              {/* Pillar kanji — no onboarding-kanji class; animation applied inline */}
              <div
                className="font-jp"
                style={{
                  fontSize: '4.5rem',
                  color: 'var(--red)',
                  lineHeight: 1,
                  marginBottom: '0.75rem',
                  animation: 'kanjiPulse 4s ease-in-out infinite',
                }}
              >
                {kanji}
              </div>
              <div
                style={{
                  fontSize: '1rem',
                  letterSpacing: '0.36em',
                  color: 'var(--gold)',
                  textTransform: 'uppercase',
                  marginBottom: '0.9rem',
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: '1rem',
                  color: 'var(--text-2)',
                  lineHeight: 1.75,
                }}
              >
                {text}
              </div>
            </div>
          ))}
        </div>

        <Divider />

        {/* Quote block */}
        <div
          style={{
            width: '100%',
            padding: '1.25rem 1.5rem',
            borderLeft: '2px solid var(--red)',
            textAlign: 'left',
          }}
        >
          <p
            style={{
              fontSize: '1rem',
              fontStyle: 'italic',
              color: 'var(--text-2)',
              lineHeight: 1.8,
              margin: '0 0 0.75rem',
            }}
          >
            Your body is the result of every choice you have made. Change the choices.
          </p>
          <div
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.3em',
              color: 'var(--text-3)',
              textTransform: 'uppercase',
            }}
          >
            Bushido
          </div>
        </div>

        {/* CTA — inline font-size overrides commit-btn class value */}
        <div style={{ width: '100%', marginTop: '2.75rem' }}>
          <button
            className="commit-btn"
            onClick={onBegin}
            style={{ fontSize: '1rem' }}
          >
            Begin Your Mission
          </button>
        </div>
      </div>
    </div>
  )
}
