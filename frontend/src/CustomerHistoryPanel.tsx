
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  DEMO_CUSTOMERS,
  useDemoCustomer,
} from './demoCustomer'

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

function formatAmount(amount: number) {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const statsGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 14,
  marginBottom: 24,
}

const panel: CSSProperties = {
  border: '1px solid #e4e9f6',
  borderRadius: 16,
  padding: 22,
  marginBottom: 24,
  background: '#fff',
}

export default function CustomerHistoryPanel() {
  const [customerId, setCustomerId] = useDemoCustomer()

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
          throw new Error(
            'Invalid customer history response'
          )
        }

        if (!controller.signal.aborted) {
          setHistory(result)
        }
      } catch {
        if (!controller.signal.aborted) {
          setError(
            'Could not load customer history. Check ' +
            'the backend and IBM demo database.'
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadHistory()

    return () => controller.abort()
  }, [customerId])

  const transactions = history?.transactions ?? []

  const chartTransactions = transactions
    .slice(0, 10)
    .reverse()

  const maxMagnitude = Math.max(
    1,
    ...chartTransactions.map(
      (transaction) => Math.abs(transaction.amount)
    )
  )

  return (
    <section
      className="customer-history-panel"
      aria-label="Customer transaction history"
      style={{ marginTop: 32 }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div className="eyebrow">
            HISTORICAL INSIGHTS
          </div>

          <h2 style={{ margin: '0 0 8px' }}>
            Customer Activity
          </h2>

          <p
            style={{
              color: '#78839b',
              fontSize: 13,
            }}
          >
            Recorded activity from IBM's synthetic
            credit-card data.
          </p>
        </div>

        <label
          style={{
            display: 'grid',
            gap: 7,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Demo customer · shared with safety check

          <select
            value={customerId}
            onChange={(event) =>
              setCustomerId(Number(event.target.value))
            }
            style={{
              padding: 12,
              border: '1px solid #dfe5f0',
              borderRadius: 10,
              background: '#fff',
              color: '#233054',
            }}
          >
            {DEMO_CUSTOMERS.map((id) => (
              <option key={id} value={id}>
                Customer {id}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && (
        <p role="status">
          Loading customer {customerId}'s history...
        </p>
      )}

      {error && (
        <p className="analysis-error" role="alert">
          {error}
        </p>
      )}

      {history && (
        <>
          {/* CUSTOMER STATISTICS */}

          <div style={statsGrid}>
            {[
              {
                label: 'Historical transactions',
                value:
                  history.total_historical_transactions
                    .toLocaleString('en-US'),
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
                value:
                  history.unique_recent_merchants
                    .toLocaleString('en-US'),
              },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  padding: 20,
                  border: '1px solid #e4e9f6',
                  borderRadius: 15,
                  background: '#f6f8ff',
                }}
              >
                <div
                  style={{
                    color: '#78839b',
                    fontSize: 12,
                    marginBottom: 12,
                  }}
                >
                  {stat.label}
                </div>

                <div
                  style={{
                    color: '#172344',
                    fontSize: 24,
                    fontWeight: 800,
                  }}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* TRANSACTION CHART */}

          <div style={panel}>
            <h3 style={{ marginTop: 0 }}>
              Recent transaction activity
            </h3>

            <p
              style={{
                color: '#78839b',
                fontSize: 12,
              }}
            >
              Latest ten recorded transactions.
              Bar heights represent absolute amounts.
            </p>

            {chartTransactions.length === 0 ? (
              <p>
                No historical transactions available.
              </p>
            ) : (
              <div
                role="img"
                aria-label={
                  'Absolute amounts of the ten ' +
                  'latest synthetic transactions'
                }
                style={{
                  display: 'flex',
                  alignItems: 'end',
                  gap: 10,
                  height: 210,
                  paddingTop: 20,
                  borderBottom:
                    '1px solid #dfe5f0',
                }}
              >
                {chartTransactions.map(
                  (transaction) => (
                    <div
                      key={transaction.id}
                      title={
                        `${transaction.date} | ` +
                        `signed amount: ` +
                        formatAmount(
                          transaction.amount
                        )
                      }
                      style={{
                        flex: 1,
                        minWidth: 0,
                        height: `${
                          Math.max(
                            3,
                            Math.abs(
                              transaction.amount
                            ) / maxMagnitude * 100
                          )
                        }%`,
                        borderRadius: '7px 7px 0 0',
                        background:
                          transaction.amount < 0
                            ? '#a59bcf'
                            : 'linear-gradient(180deg, #7487fa, #5066e4)',
                      }}
                    />
                  )
                )}
              </div>
            )}

            <p
              style={{
                color: '#8d98ae',
                fontSize: 11,
                marginTop: 12,
              }}
            >
              Blue: positive recorded amounts.
              Purple: negative recorded amounts.
              Signed values are preserved below;
              negative entries are not assumed
              to be refunds.
            </p>
          </div>

          {/* TRANSACTION TABLE */}

          <div style={panel}>
            <h3 style={{ marginTop: 0 }}>
              Recent transactions
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 12,
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr>
                    {[
                      'Date',
                      'Merchant ID',
                      'Location',
                      'Signed amount',
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          padding: '14px 12px',
                          color: '#78839b',
                          borderBottom:
                            '1px solid #e4e9f6',
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {transactions.map(
                    (transaction) => (
                      <tr key={transaction.id}>
                        <td
                          style={{
                            padding: '14px 12px',
                            borderBottom:
                              '1px solid #f0f2f8',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {transaction.date.replace(
                            'T',
                            ' '
                          )}
                        </td>

                        <td
                          style={{
                            padding: '14px 12px',
                            borderBottom:
                              '1px solid #f0f2f8',
                            fontFamily: 'monospace',
                          }}
                        >
                          {transaction.merchant_id}
                        </td>

                        <td
                          style={{
                            padding: '14px 12px',
                            borderBottom:
                              '1px solid #f0f2f8',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {[
                            transaction.city,
                            transaction.state,
                          ]
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
                              transaction.amount < 0
                                ? '#7165a7'
                                : '#233054',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatAmount(
                            transaction.amount
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* DATASET DISCLOSURE */}

          <p
            style={{
              fontSize: 11,
              color: '#8993a6',
              lineHeight: 1.7,
            }}
          >
            {history.note} Summary statistics
            represent the most recent{' '}
            {history.recent_sample_size} historical
            transactions, not the full history.
            Amounts use dataset units. The
            transaction history and PaySim ML model
            are separate synthetic demonstrations,
            not a real PayPal account.
          </p>
        </>
      )}
    </section>
  )
}
