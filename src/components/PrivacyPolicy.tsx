import type { ReactNode } from 'react'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{
        fontSize: '0.72rem', letterSpacing: '0.2em', color: 'var(--text-3)',
        textTransform: 'uppercase', marginBottom: '0.75rem',
      }}>
        {title}
      </div>
      <div style={{ fontSize: '0.95rem', color: 'var(--text-2)', lineHeight: 1.85 }}>
        {children}
      </div>
    </div>
  )
}

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', padding: '3rem 1.5rem 4rem' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div
            className="font-jp"
            style={{ fontSize: '3.5rem', color: 'var(--red)', lineHeight: 1, marginBottom: '0.6rem', animation: 'kanjiPulse 4s ease-in-out infinite' }}
          >
            侍
          </div>
          <div style={{ fontSize: '1rem', letterSpacing: '0.44em', color: 'var(--text)', fontWeight: 500, textTransform: 'uppercase', marginBottom: '1.25rem' }}>
            Ronin Daily
          </div>
          <div style={{ height: '1px', background: 'var(--red)', opacity: 0.35, marginBottom: '1.75rem' }} />
          <div style={{ fontSize: '0.72rem', letterSpacing: '0.28em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            Privacy Policy
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
            Last updated: June 14, 2026
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--border)', marginBottom: '2.5rem' }} />

        <Section title="What We Collect">
          We collect the information you provide during onboarding: your email address, body stats (age, weight, height, sex), goal data (target weight and timeline), and unit preference. As you use the app we also store your daily check-in logs, weekly weigh-ins, activity logs, meal preferences, and accountability records.
        </Section>

        <Section title="How We Use It">
          Your data is used solely to calculate your daily calorie and movement targets, track your progress, and generate personalized meal plans. We do not use your data for advertising or any purpose outside of providing the Ronin Daily service to you.
        </Section>

        <Section title="AI Meal Planning">
          When you request a meal plan, your meal preferences and calorie target are sent to the Anthropic API to generate your plan. This data is used only to fulfill the request and is not stored or used for training by Anthropic beyond the scope of the request.
        </Section>

        <Section title="Data Storage">
          All data is stored securely via Supabase, which provides encrypted storage and row-level security so that only you can access your records. We do not have access to your Supabase authentication credentials.
        </Section>

        <Section title="We Do Not Sell Your Data">
          We do not sell, rent, trade, or otherwise transfer your personal information to any third party for commercial purposes. Your data is yours.
        </Section>

        <Section title="Email Communications">
          We do not send marketing emails. The only emails you will receive from Ronin Daily are transactional — sign-in links and account-related notifications you explicitly request.
        </Section>

        <Section title="Deleting Your Data">
          You can delete your account and all associated data at any time by tapping <strong style={{ color: 'var(--text)' }}>Start Over</strong> in the app settings. This permanently removes your profile, logs, and all stored records from our database.
        </Section>

        <Section title="Contact">
          Questions about this policy? Email us at{' '}
          <span style={{ color: 'var(--text)' }}>support@ronindaily.app</span>.
        </Section>

        <div style={{ height: '1px', background: 'var(--border)', margin: '2rem 0' }} />

        <button
          onClick={() => { window.location.href = '/' }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: '0.85rem', color: 'var(--text-3)', letterSpacing: '0.04em',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.color = 'var(--text)' }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.color = 'var(--text-3)' }}
        >
          ← Back to Ronin Daily
        </button>

      </div>
    </div>
  )
}
