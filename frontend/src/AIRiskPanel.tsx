
import { useEffect, useRef, useState } from 'react'
import { useDemoCustomer } from './demoCustomer'

type Prediction = {
  model_version: string
  model_score: number
  decision_threshold: number
  flagged_for_review: boolean
  score_calibrated: boolean
  dataset: string
  warning: string
}

type BehaviorSignal = {
  code: string
  message: string
}

type BehaviorResult = {
  customer_id: number
  history_count: number
  status: string
  average_previous_amount?: number
  median_previous_amount?: number
  amount_to_median_ratio?: number | null
  merchant_seen_in_recent_history?: boolean
  signals?: BehaviorSignal[]
  dataset?: string
  note?: string
}

const DEMO_TIMESTAMP = '2025-01-01T00:00'

async function postJSON<T>(
  url: string,
  payload: object
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

function formatAmount(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function signalTitle(code: string) {
  if (code === 'UNUSUAL_AMOUNT') {
    return 'Larger than usual'
  }

  if (code === 'UNFAMILIAR_MERCHANT') {
    return 'Merchant not found in recent history'
  }

  return 'Additional behavioral signal'
}

export default function AIRiskPanel() {
  const [customerId, setCustomerId] = useDemoCustomer()

  const [transactionType, setTransactionType] =
    useState('TRANSFER')
  const [amount, setAmount] = useState('1500')
  const [balance, setBalance] = useState('1500')
  const [merchantId, setMerchantId] =
    useState('DEMO_NEW_MERCHANT')

  const [prediction, setPrediction] =
    useState<Prediction | null>(null)
  const [behavior, setBehavior] =
    useState<BehaviorResult | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mlUnavailable, setMlUnavailable] = useState(false)
  const [historyUnavailable, setHistoryUnavailable] =
    useState(false)
  const [analyzedAmount, setAnalyzedAmount] =
    useState<number | null>(null)

  // Prevent older requests from displaying results
  // after the demo customer changes.
  const requestGeneration = useRef(0)

  useEffect(() => {
    requestGeneration.current += 1

    setPrediction(null)
    setBehavior(null)
    setMlUnavailable(false)
    setHistoryUnavailable(false)
    setAnalyzedAmount(null)
    setError('')
    setLoading(false)
  }, [customerId])

  async function analyze() {
    const thisRequest = ++requestGeneration.current

    const numericAmount = Number(amount)
    const numericBalance = Number(balance)

    setError('')
    setPrediction(null)
    setBehavior(null)
    setMlUnavailable(false)
    setHistoryUnavailable(false)
    setAnalyzedAmount(null)

    if (
      amount.trim() === '' ||
      balance.trim() === '' ||
      !Number.isFinite(numericAmount) ||
      !Number.isFinite(numericBalance) ||
      numericAmount <= 0 ||
      numericBalance < 0 ||
      !merchantId.trim()
    ) {
      setError(
        'Enter a positive amount, a valid starting balance, ' +
        'and a merchant identifier.'
      )
      return
    }

    setLoading(true)

    try {
      const results = await Promise.allSettled([
        postJSON<Prediction>('/api/ml/predict', {
          transaction_type: transactionType,
          amount: numericAmount,
          old_balance: numericBalance,
        }),
        postJSON<BehaviorResult>(
          '/api/behavior/analyze-history',
          {
            customer_id: customerId,
            amount: numericAmount,
            merchant_id: merchantId.trim(),
            transaction_time: DEMO_TIMESTAMP,
          }
        ),
      ])

      if (thisRequest !== requestGeneration.current) {
        return
      }

      const mlResult = results[0]
      const historyResult = results[1]

      if (
        mlResult.status === 'fulfilled' &&
        typeof mlResult.value.flagged_for_review ===
          'boolean' &&
        Number.isFinite(mlResult.value.model_score)
      ) {
        setPrediction(mlResult.value)
      } else {
        setMlUnavailable(true)
      }

      if (
        historyResult.status === 'fulfilled' &&
        typeof historyResult.value.status === 'string' &&
        Array.isArray(historyResult.value.signals ?? [])
      ) {
        setBehavior(historyResult.value)
      } else {
        setHistoryUnavailable(true)
      }

      setAnalyzedAmount(numericAmount)
    } finally {
      if (thisRequest === requestGeneration.current) {
        setLoading(false)
      }
    }
  }

  const behavioralSignals = behavior?.signals ?? []

  const needsReview =
    prediction?.flagged_for_review === true ||
    behavior?.status === 'REVIEW_SUGGESTED'

  const fullyChecked =
    prediction !== null &&
    behavior !== null &&
    behavior.status !== 'INSUFFICIENT_HISTORY'

  return (
    <section className="analysis-section">
      <div className="eyebrow">INTENTRA PROTECT</div>

      <h2>Payment Safety Check</h2>

      <p>
        Explore AI screening and historical spending
        patterns using synthetic demonstration data.
      </p>

      <div
        style={{
          display: 'grid',
          gap: '16px',
          maxWidth: '480px',
          marginTop: '24px',
        }}
      >
        <label>
          Demo customer
          <select
            value={customerId}
            onChange={(event) =>
              setCustomerId(Number(event.target.value))
            }
          >
            <option value="0">Customer 0</option>
            <option value="396">Customer 396</option>
            <option value="486">Customer 486</option>
          </select>
        </label>

        <label>
          Transaction type
          <select
            value={transactionType}
            onChange={(event) =>
              setTransactionType(event.target.value)
            }
          >
            <option value="TRANSFER">Transfer</option>
            <option value="PAYMENT">Payment</option>
            <option value="CASH_OUT">Cash out</option>
            <option value="CASH_IN">Cash in</option>
            <option value="DEBIT">Debit</option>
          </select>
        </label>

        <label>
          Transaction amount (demo units)
          <input
            type="number"
            min="0.01"
            step="any"
            value={amount}
            onChange={(event) =>
              setAmount(event.target.value)
            }
          />
        </label>

        <label>
          Starting balance for AI screening
          (demo units)
          <input
            type="number"
            min="0"
            step="any"
            value={balance}
            onChange={(event) =>
              setBalance(event.target.value)
            }
          />
        </label>

        <label>
          Merchant identifier for history comparison
          <input
            type="text"
            value={merchantId}
            onChange={(event) =>
              setMerchantId(event.target.value)
            }
          />
        </label>

        <button
          type="button"
          onClick={analyze}
          disabled={loading}
        >
          {loading
            ? 'Checking payment...'
            : 'Check payment safety'}
        </button>
      </div>

      {error && (
        <p className="analysis-error" role="alert">
          {error}
        </p>
      )}

      {analyzedAmount !== null && (
        <div
          className="analysis-result"
          style={{
            maxWidth: '560px',
            marginTop: '26px',
            padding: '24px',
          }}
        >
          <div className="eyebrow">
            PAYMENT SAFETY RESULT
          </div>

          <h3>
            {needsReview
              ? 'Extra verification recommended'
              : fullyChecked
                ? 'No additional alerts detected'
                : 'Safety check partially available'}
          </h3>

          <p style={{ fontSize: '26px', fontWeight: 700 }}>
            {formatAmount(analyzedAmount)} demo units
          </p>

          <p>
            {needsReview
              ? 'At least one experimental screening ' +
                'system identified a reason to review ' +
                'this transaction.'
              : 'No completed screening system ' +
                'raised an additional review alert. ' +
                'This does not guarantee safety.'}
          </p>

          <hr style={{ margin: '20px 0' }} />

          <h4>AI transaction screening</h4>

          {prediction ? (
            <p>
              {prediction.flagged_for_review
                ? 'The experimental AI model flagged ' +
                  'this transaction pattern for review.'
                : 'The experimental AI model did not ' +
                  'trigger an alert at its current threshold.'}
            </p>
          ) : (
            <p>
              {mlUnavailable
                ? 'AI screening is currently unavailable.'
                : 'No AI screening result.'}
            </p>
          )}

          <h4 style={{ marginTop: '20px' }}>
            Customer spending history
          </h4>

          {behavior ? (
            <>
              <p>
                Analyzed {behavior.history_count} previous
                transactions for demo customer{' '}
                {behavior.customer_id}.
              </p>

              {behavior.status ===
                'INSUFFICIENT_HISTORY' ? (
                  <p>
                    There is not enough history to make
                    a reliable behavioral comparison.
                  </p>
                ) : (
                  <>
                    {behavior.median_previous_amount !==
                      undefined && (
                        <p>
                          Typical recent amount (median):{' '}
                          <strong>
                            {formatAmount(
                              behavior.median_previous_amount
                            )}
                          </strong>
                        </p>
                      )}

                    {behavioralSignals.length > 0 ? (
                      <ul>
                        {behavioralSignals.map(
                          (signal, index) => (
                            <li
                              key={`${signal.code}-${index}`}
                            >
                              <strong>
                                {signalTitle(signal.code)}:
                              </strong>{' '}
                              {signal.message}
                            </li>
                          )
                        )}
                      </ul>
                    ) : (
                      <p>
                        No alerts were triggered by the
                        current historical comparison rules.
                      </p>
                    )}
                  </>
                )}
            </>
          ) : (
            <p>
              {historyUnavailable
                ? 'Historical comparison is currently unavailable.'
                : 'No historical comparison result.'}
            </p>
          )}

          <div style={{ marginTop: '20px' }}>
            <h4>Recommended precautions</h4>
            <ul>
              <li>Confirm you recognize the recipient.</li>
              <li>Double-check the amount.</li>
              <li>
                Be cautious of unexpected or urgent
                payment requests.
              </li>
              {needsReview && (
                <li>
                  Consider an additional verification
                  step before proceeding.
                </li>
              )}
            </ul>
          </div>

          <p style={{ marginTop: '20px' }}>
            <small>
              Prototype demonstration using two separate
              synthetic datasets: PaySim for AI screening
              and IBM TabFormer for customer history.
              Their scores and histories do not describe
              a single real PayPal customer. No payment
              is automatically blocked.
            </small>
          </p>

          <details style={{ marginTop: '20px' }}>
            <summary style={{ cursor: 'pointer' }}>
              Technical details (analyst view)
            </summary>

            {prediction && (
              <div style={{ marginTop: '12px' }}>
                <p>
                  ML model: {prediction.model_version}
                </p>
                <p>
                  Model score:{' '}
                  {prediction.model_score.toFixed(6)}
                </p>
                <p>
                  Review threshold:{' '}
                  {prediction.decision_threshold.toFixed(6)}
                </p>
                <p>
                  Model score calibrated:{' '}
                  {prediction.score_calibrated
                    ? 'Yes'
                    : 'No'}
                </p>
              </div>
            )}

            {behavior && (
              <div>
                <p>
                  Behavioral status: {behavior.status}
                </p>
                <p>
                  Customer ID: {behavior.customer_id}
                </p>
                <p>
                  History records: {behavior.history_count}
                </p>
                <p>
                  Amount-to-median ratio:{' '}
                  {behavior.amount_to_median_ratio ??
                    'Unavailable'}
                </p>
                <p>
                  Merchant seen in recent history:{' '}
                  {behavior.merchant_seen_in_recent_history ===
                  undefined
                    ? 'Unknown'
                    : behavior.merchant_seen_in_recent_history
                      ? 'Yes'
                      : 'No'}
                </p>
              </div>
            )}
          </details>
        </div>
      )}
    </section>
  )
}
