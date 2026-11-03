
import { useEffect, useState } from 'react'

type Transaction = {
  id: number
  date: string
  amount: number
  merchant_id: string
  city: string | null
  state: string | null
  merchant_category: number | null
  fraud_label: boolean
}

type CustomerHistory = {
  customer_id: number
  dataset: string
  synthetic_data: boolean
  total_historical_transactions: number
  recent_sample_size: number
  average_recent_amount: number | null
  median_recent_amount: number | null
  unique_recent_merchants: number
  transactions: Transaction[]
  note: string
}

const CUSTOMERS = [0, 396, 486]

function formatNumber(value: number) {
  return value.toLocaleString('en-US')
}

function formatAmount(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function CustomerHistoryPanel() {
  const [customerId, setCustomerId] = useState(0)
  const [history, setHistory] =
    useState<CustomerHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadHistory() {
      setLoading(true)
      setError('')
      setHistory(null)

      try {
        const response = await fetch(
          `/api/history/customer/${customerId}?limit=20`,
          {
            signal: controller.signal,
            cache: 'no-store',
          }
        )

        if (!response.ok) {
          throw new Error(
            `History request failed: ${response.status}`
          )
        }

        const result: CustomerHistory =
          await response.json()

        if (
          result.customer_id !== customerId ||
          result.synthetic_data !== true ||
          !Array.isArray(result.transactions)
        ) {
          throw new Error('Invalid history response.')
        }

        setHistory(result)
      } catch (err) {
        if (controller.signal.aborted) return

        setError(
          'Could not load customer history. ' +
          'Check that the backend and IBM database are available.'
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadHistory()

    return () => controller.abort()
  }, [customerId])

  const recentTransactions = history?.transactions ?? []

  // Display the 10 latest transactions chronologically.
  // We use magnitudes for chart height, while preserving
  // signed amounts in labels and the transaction table.
  const chartTransactions = recentTransactions
    .slice(0, 10)
    .reverse()

  const maxMagnitude = Math.max(
    1,
    ...chartTransactions.map((tx) => Math.abs(tx.amount))
  )

  return (
    <section
      className="customer-history-panel"
      aria-label="Customer transaction history"
      style={{ marginTop: '32px' }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div className="eyebrow">HISTORICAL INSIGHTS</div>
          <h2 style={{ margin: '0 0 8px' }}>
            Customer Activity
          </h2>
          <p style={{ color: '#78839b', fontSize: '13px' }}>
            Explore recorded activity from IBM's
            synthetic credit-card dataset.
          </p>
        </div>

        <label
          style={{
            display: 'grid',
            gap: '7px',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          Demo customer
          <select
            value={customerId}
            onChange={(event) =>
              setCustomerId(Number(event.target.value))
            }
            style={{
              padding: '12px',
              border: '1px solid #dfe5f0',
              borderRadius: '10px',
              background: '#fff',
              color: '#233054',
            }}
          >
            {CUSTOMERS.map((id) => (
              <option key={id} value={id}>
                Customer {id}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && (
        <p role="status">
          Loading customer history...
        </p>
      )}

      {error && (
        <p className="analysis-error" role="alert">
          {error}
        </p>
      )}

      {history && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '14px',
              marginBottom: '25px',
            }}
          >
            {[
              {
                label: 'Historical transactions',
                value: formatNumber(
                  history.total_historical_transactions
                ),
              },
              {
                label: 'Typical recent amount',
                value:
                  history.median_recent_amount === null
                    ? 'N/A'
                    : formatAmount(
                        history.median_recent_amount
                      ),
              },
              {
                label: 'Average recent amount',
                value:
                  history.average_recent_amount === null
                    ? 'N/A'
                    : formatAmount(
                        history.average_recent_amount
                      ),
              },
              {
                label: 'Recent merchants',
                value: formatNumber(
                  history.unique_recent_merchants
                ),
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: '#f6f8ff',
                  border: '1px solid #e4e9f6',
                  borderRadius: '15px',
                  padding: '20px',
                }}
              >
                <div
                  style={{
                    color: '#78839b',
                    fontSize: '12px',
                    marginBottom: '12px',
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    color: '#172344',
                    fontWeight: 800,
                    fontSize: '24px',
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              border: '1px solid #e4e9f6',
              borderRadius: '17px',
              padding: '22px',
              marginBottom: '25px',
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              Recent transaction activity
            </h3>

            <p
              style={{
                fontSize: '12px',
                color: '#78839b',
              }}
            >
              Latest 10 transactions · Bar heights show
              absolute amounts
            </p>

            {chartTransactions.length === 0 ? (
              <p>No historical transactions available.</p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'end',
                  gap: '10px',
                  height: '210px',
                  paddingTop: '20px',
                  borderBottom: '1px solid #dfe5f0',
                }}
                role="img"
                aria-label="Bar chart of the absolute amounts of the ten latest transactions"
              >
                {chartTransactions.map((tx) => {
                  const magnitude = Math.abs(tx.amount)
                  const height = Math.max(
                    3,
                    (magnitude / maxMagnitude) * 100
                  )

                  return (
                    <div
                      key={tx.id}
                      title={
                        `${tx.date} | ` +
                        `Signed amount: ${formatAmount(tx.amount)}`
                      }
                      style={{
                        flex: 1,
                        minWidth: 0,
                        height: `${height}%`,
                        borderRadius: '7px 7px 0 0',
                        background:
                          tx.amount < 0
                            ? '#a59bcf'
                            : 'linear-gradient(180deg, #7487fa, #5066e4)',
                        position: 'relative',
                      }}
                    />
                  )
                })}
              </div>
            )}

            <p
              style={{
                color: '#8d98ae',
                fontSize: '11px',
                marginTop: '12px',
              }}
            >
              Blue: positive recorded amounts · Purple:
              negative recorded amounts. Negative values
              may represent credits or reversals; their
              meaning has not been independently verified.
            </p>
          </div>

          <div
            style={{
              border: '1px solid #e4e9f6',
              borderRadius: '17px',
              padding: '20px',
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              Recent transactions
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr>
                    {[
                      'Date',
                      'Merchant ID',
                      'Location',
                      'Amount',
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          padding: '14px 12px',
                          color: '#78839b',
                          borderBottom:
                            '1px solid #e4e9f6',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td
                        style={{
                          padding: '14px 12px',
                          borderBottom:
                            '1px solid #f0f2f8',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {tx.date.replace('T', ' ')}
                      </td>

                      <td
                        style={{
                          padding: '14px 12px',
                          borderBottom:
                            '1px solid #f0f2f8',
                          fontFamily: 'monospace',
                        }}
                      >
                        {tx.merchant_id}
                      </td>

                      <td
                        style={{
                          padding: '14px 12px',
                          borderBottom:
                            '1px solid #f0f2f8',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {[tx.city, tx.state]
                          .filter(Boolean)
                          .join(', ') || 'Unknown'}
                      </td>

                      <td
                        style={{
                          padding: '14px 12px',
                          borderBottom:
                            '1px solid #f0f2f8',
                          fontWeight: 700,
                          color:
                            tx.amount < 0
                              ? '#7165a7'
                              : '#233054',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatAmount(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p
            style={{
              marginTop: '18px',
              fontSize: '11px',
              color: '#8993a6',
              lineHeight: 1.7,
            }}
          >
            {history.note} Summary figures are based
            on the most recent{' '}
            {history.recent_sample_size} transactions,
            not the customer's entire history. Amounts
            are shown in dataset units.
          </p>
        </>
      )}
    </section>
  )
}
