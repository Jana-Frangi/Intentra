
import type { CSSProperties } from 'react'

type DemoWelcomeProps = {
  onEnter: () => void
}

const page: CSSProperties = {
  minHeight: '100vh',
  background:
    'radial-gradient(circle at 85% 15%, #314c91 0%, transparent 35%), linear-gradient(135deg, #101b39, #1a2d60)',
  color: '#ffffff',
  display: 'flex',
  flexDirection: 'column',
  padding: '32px clamp(20px, 5vw, 80px)',
  boxSizing: 'border-box',
}

const button: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '17px 20px',
  borderRadius: 12,
  border: 0,
  color: 'white',
  background: '#5269ed',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
}

export default function DemoWelcome({
  onEnter,
}: DemoWelcomeProps) {
  return (
    <div style={page}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: '-1.2px',
          }}
        >
          <span style={{ color: '#91a6ff' }}>✦ </span>
          intentra
          <span style={{ color: '#8295ff' }}>.</span>
        </div>

        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.3,
            padding: '10px 15px',
            borderRadius: 30,
            border: '1px solid #52658f',
            color: '#d4ddfb',
          }}
        >
          DEMO ENVIRONMENT
        </span>
      </header>

      <main
        style={{
          width: '100%',
          maxWidth: 1040,
          margin: 'auto',
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          alignItems: 'center',
          gap: 'clamp(35px, 6vw, 90px)',
          padding: '70px 0',
        }}
      >
        <section>
          <div
            style={{
              color: '#a2b6ff',
              fontSize: 12,
              letterSpacing: 2,
              fontWeight: 800,
              marginBottom: 24,
            }}
          >
            PERSONAL PAYMENT INTELLIGENCE
          </div>

          <h1
            style={{
              fontSize: 'clamp(38px, 4.5vw, 65px)',
              letterSpacing: '-2px',
              lineHeight: 1.12,
              fontWeight: 800,
              margin: '0 0 27px',
              color: '#ffffff',
            }}
          >
            Every payment deserves
            <span style={{ color: '#9db1ff' }}>
              {' '}a second look.
            </span>
          </h1>

          <p
            style={{
              color: '#c6d1ed',
              fontSize: 16,
              lineHeight: 1.85,
              maxWidth: 480,
              marginBottom: 30,
            }}
          >
            Understand unusual transaction patterns,
            explore your account's historical context,
            and make more informed payment decisions.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 13,
            }}
          >
            {[
              'AI-assisted screening',
              'Historical insights',
              'Clear recommendations',
            ].map((item) => (
              <span
                key={item}
                style={{
                  padding: '9px 12px',
                  borderRadius: 30,
                  border: '1px solid #455782',
                  color: '#d9e2ff',
                  fontSize: 11,
                }}
              >
                ✓ {item}
              </span>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="demo-account-heading"
          style={{
            background: '#ffffff',
            color: '#172344',
            borderRadius: 24,
            padding: 'clamp(24px, 3vw, 38px)',
            boxShadow: '0 24px 75px #080e263d',
          }}
        >
          <div
            style={{
              color: '#5269ed',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1.5,
              marginBottom: 14,
            }}
          >
            WELCOME BACK
          </div>

          <h2
            id="demo-account-heading"
            style={{
              fontSize: 27,
              letterSpacing: '-0.8px',
              margin: '0 0 12px',
            }}
          >
            Explore your personal dashboard
          </h2>

          <p
            style={{
              color: '#78839b',
              lineHeight: 1.7,
              fontSize: 13,
              marginBottom: 28,
            }}
          >
            Enter an existing fictional account to
            experience how Intentra uses transaction
            history to provide personalized context.
          </p>

          <div
            style={{
              border: '1px solid #e2e8f5',
              background: '#f7f9ff',
              borderRadius: 16,
              padding: 20,
              marginBottom: 22,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: '#78839b',
                letterSpacing: 1.5,
                marginBottom: 17,
              }}
            >
              EXISTING DEMO ACCOUNT
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 53,
                  height: 53,
                  flexShrink: 0,
                  borderRadius: 18,
                  background: '#e4e9ff',
                  color: '#4e64df',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 23,
                  fontWeight: 800,
                }}
              >
                AM
              </div>

              <div style={{ minWidth: 0 }}>
                <strong
                  style={{
                    display: 'block',
                    fontSize: 16,
                    marginBottom: 4,
                  }}
                >
                  Alex Morgan
                </strong>

                <span
                  style={{
                    color: '#75819b',
                    fontSize: 12,
                  }}
                >
                  Personal account · Demo history
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            style={button}
            onClick={onEnter}
          >
            Enter Alex's demo account →
          </button>

          <p
            style={{
              margin: '18px 0 0',
              textAlign: 'center',
              color: '#8893a9',
              fontSize: 11,
              lineHeight: 1.7,
            }}
          >
            No password required.
            This is a simulated account experience,
            not real authentication or PayPal login.
          </p>
        </section>
      </main>

      <footer
        style={{
          paddingTop: 20,
          borderTop: '1px solid #41527c',
          color: '#aab9df',
          fontSize: 11,
          lineHeight: 1.7,
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <span>© Intentra · Payment intelligence</span>
        <span>
          Experimental prototype · Synthetic datasets ·
          PayPal Sandbox
        </span>
      </footer>
    </div>
  )
}
