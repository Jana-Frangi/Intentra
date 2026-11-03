
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

type AccountSummary = {
  customer_id: number
  synthetic_data: boolean
  total_historical_transactions: number
  recent_sample_size: number
  average_recent_amount: number | null
  median_recent_amount: number | null
  unique_recent_merchants: number
}

type Props = {
  onOpenProtection: () => void
}

const DEMO_ACCOUNT_ID = 0

const cardStyle: CSSProperties = {
  padding: 22,
  background: '#f6f8ff',
  border: '1px solid #e4e9f6',
  borderRadius: 15,
  minWidth: 0,
}

const muted: CSSProperties = {
  color: '#78839b',
  fontSize: 12,
  lineHeight: 1.7,
}

function formatAmount(value: number | null) {
  if (value === null) return 'N/A'

  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function PersonalOverview({
  onOpenProtection,
}: Props) {
  const [summary, setSummary] =
    useState<AccountSummary | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadSummary() {
      setLoading(true)
      setError(false)

      try {
        const response = await fetch(
          `/api/history/customer/${DEMO_ACCOUNT_ID}?limit=5`,
          {
            signal: controller.signal,
            cache: 'no-store',
          }
        )

        if (!response.ok) {
          throw new Error('Account history unavailable')
        }

        const result: AccountSummary =
          await response.json()

        if (
          result.customer_id !== DEMO_ACCOUNT_ID ||
          result.synthetic_data !== true ||
          !Number.isFinite(
            result.total_historical_transactions
          )
        ) {
          throw new Error('Unexpected account response')
        }

        if (!controller.signal.aborted) {
          setSummary(result)
        }
      } catch {
        if (!controller.signal.aborted) {
          setError(true)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadSummary()

    return () => controller.abort()
  }, [])

  const stats = summary
    ? [
        {
          label: 'Historical transactions',
          value:
            summary.total_historical_transactions
              .toLocaleString('en-US'),
          detail: 'Recorded synthetic activity',
        },
        {
          label: 'Typical recent amount',
          value: formatAmount(
            summary.median_recent_amount
          ),
          detail: `Median of ${
            summary.recent_sample_size
          } recent transactions`,
        },
        {
          label: 'Average recent amount',
          value: formatAmount(
            summary.average_recent_amount
          ),
          detail: 'Absolute amount average',
        },
        {
          label: 'Recent merchants',
          value:
            summary.unique_recent_merchants
              .toLocaleString('en-US'),
          detail: 'Distinct merchants in recent history',
        },
      ]
    : []

  return (
    <section
      aria-label="My account overview"
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f5',
        borderRadius: 22,
        padding: 'clamp(22px, 3vw, 34px)',
        marginBottom: 28,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 20,
          flexWrap: 'wrap',
          marginBottom: 26,
        }}
      >
        <div>
          <div className="eyebrow">
            MY PAYMENT INTELLIGENCE
          </div>

          <h2
            style={{
              margin: '10px 0 8px',
              fontSize: 'clamp(25px, 3vw, 32px)',
              letterSpacing: '-0.8px',
              color: '#172344',
            }}
          >
            Welcome back, Alex ✦
          </h2>

          <p style={muted}>
            Your synthetic account activity at a glance.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#eef2ff',
            border: '1px solid #dce4ff',
            borderRadius: 15,
            padding: '12px 17px',
          }}
        >
          <div
            style={{
              width: 43,
              height: 43,
              borderRadius: 13,
              background: '#dce5ff',
              color: '#4259ce',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            AM
          </div>

          <div>
            <strong
              style={{
                display: 'block',
                fontSize: 13,
                color: '#172344',
              }}
            >
              Alex Morgan
            </strong>

            <span
              style={{
                fontSize: 11,
                color: '#75819b',
              }}
            >
              Fictional demo account
            </span>
          </div>
        </div>
      </div>

      {loading && (
        <p style={muted} role="status">
          Loading your account activity...
        </p>
      )}

      {error && (
        <div
          role="alert"
          style={{
            ...cardStyle,
            marginBottom: 20,
          }}
        >
          <strong>Account statistics unavailable</strong>

          <p style={muted}>
            Intentra could not retrieve the demo history.
            Please check that the backend and sample
            database are running.
          </p>
        </div>
      )}

      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 14,
            marginBottom: 25,
          }}
        >
          {stats.map((stat) => (
            <article
              key={stat.label}
              style={cardStyle}
            >
              <div
                style={{
                  ...muted,
                  marginBottom: 12,
                }}
              >
                {stat.label}
              </div>

              <div
                style={{
                  fontSize: 27,
                  fontWeight: 800,
                  color: '#172344',
                  marginBottom: 8,
                  overflowWrap: 'anywhere',
                }}
              >
                {stat.value}
              </div>

              <div
                style={{
                  color: '#97a1b6',
                  fontSize: 11,
                  lineHeight: 1.5,
                }}
              >
                {stat.detail}
              </div>
            </article>
          ))}
        </div>
      )}

      <div
        style={{
          background: '#f8faff',
          border: '1px solid #dfe6f8',
          borderRadius: 15,
          padding: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 18,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ maxWidth: 540 }}>
          <strong
            style={{
              color: '#172344',
              fontSize: 15,
            }}
          >
            Have a payment to review?
          </strong>

          <p
            style={{
              ...muted,
              margin: '7px 0 0',
            }}
          >
            Compare your proposed payment with
            experimental AI screening and the
            available synthetic spending history.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={onOpenProtection}
        >
          Review a payment →
        </button>
      </div>

      <p
        style={{
          ...muted,
          fontSize: 11,
          margin: '17px 0 0',
        }}
      >
        Alex Morgan is a fictional profile using IBM
        TabFormer synthetic records. Statistics are
        retrieved from the demo API. These are not
        actual PayPal account transactions.
      </p>
    </section>
  )
}
