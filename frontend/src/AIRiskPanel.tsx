
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
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
    headers: { 'Content-Type': 'application/json' },
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
    return 'Unfamiliar merchant'
  }

  return 'Additional behavioral signal'
}

const columnCard: CSSProperties = {
  minWidth: 0,
  padding: '24px',
  borderRadius: '18px',
  border: '1px solid #e1e7f4',
  background: '#ffffff',
}

const mutedText: CSSProperties = {
  color: '#75819b',
  fontSize: '13px',
  lineHeight: 1.7,
}

const miniLabel: CSSProperties = {
  fontSize: '11px',
  fontWeight: 800,
  letterSpacing: '1.5px',
  color: '#5269ed',
  textTransform: 'uppercase',
}

const insightBox: CSSProperties = {
  padding: '16px',
  background: '#f7f9fe',
  border: '1px solid #e7ebf6',
  borderRadius: '12px',
}

const actionButton: CSSProperties = {
  padding: '13px 16px',
  borderRadius: '10px',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
  textAlign: 'center',
}

type AIRiskPanelProps = {
  onOpenCheckout?: () => void
}

export default function AIRiskPanel({
  onOpenCheckout,
}: AIRiskPanelProps) {
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
  const [mlUnavailable, setMlUnavailable] =
    useState(false)
  const [historyUnavailable, setHistoryUnavailable] =
    useState(false)
  const [analyzedAmount, setAnalyzedAmount] =
    useState<number | null>(null)

  const requestGeneration = useRef(0)
  const precautionsRef = useRef<HTMLDivElement>(null)

  function clearResults() {
    requestGeneration.current += 1

    setPrediction(null)
    setBehavior(null)
    setMlUnavailable(false)
    setHistoryUnavailable(false)
    setAnalyzedAmount(null)
    setError('')
    setLoading(false)
  }

  useEffect(() => {
    clearResults()
  }, [customerId])

  async function analyze() {
    const numericAmount = Number(amount)
    const numericBalance = Number(balance)

    clearResults()

    const thisRequest = requestGeneration.current

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
        'Enter a positive payment amount, a valid ' +
        'starting balance, and a merchant identifier.'
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
        Array.isArray(historyResult.value.signals ?? []) &&
        historyResult.value.customer_id === customerId
      ) {
        setBehavior(historyResult.value)
      } else {
        setHistoryUnavailable(true)
      }

      setAnalyzedAmount(numericAmount)
    } catch {
      if (thisRequest === requestGeneration.current) {
        setError(
          'The payment safety check could not finish.'
        )
      }
    } finally {
      if (thisRequest === requestGeneration.current) {
        setLoading(false)
      }
    }
  }

  // NEW: Navigate to the actual customer history panel.
  function viewHistoricalEvidence() {
    const historySection =
      document.querySelector<HTMLElement>(
        '.customer-history-panel'
      )

    if (!historySection) {
      return
    }

    historySection.setAttribute('tabindex', '-1')

    historySection.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })

    historySection.focus({
      preventScroll: true,
    })
  }

  // NEW: Navigate to our existing precautions list.
  function reviewPrecautions() {
    precautionsRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })

    precautionsRef.current?.focus({
      preventScroll: true,
    })
  }

  const behavioralSignals = behavior?.signals ?? []

  const needsReview =
    prediction?.flagged_for_review === true ||
    behavior?.status === 'REVIEW_SUGGESTED'

  const fullyChecked =
    prediction !== null &&
    behavior !== null &&
    behavior.status !== 'INSUFFICIENT_HISTORY'

  const isPartial = !fullyChecked

  return (
    <section
      className="analysis-section"
      aria-label="Payment safety check"
      style={{
        width: '100%',
        minWidth: 0,
      }}
    >
      <div style={{ marginBottom: '26px' }}>
        <div className="eyebrow">
          INTENTRA PROTECT
        </div>

        <h2 style={{ marginBottom: '10px' }}>
          Payment Safety Check
        </h2>

        <p style={mutedText}>
          Review a proposed payment using experimental
          AI screening and synthetic customer history.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(100%, 350px), 1fr))',
          alignItems: 'start',
          gap: '22px',
          width: '100%',
        }}
      >
        {/* LEFT COLUMN: PAYMENT DETAILS */}

        <div style={columnCard}>
          <div style={miniLabel}>
            01 / PAYMENT DETAILS
          </div>

          <h3
            style={{
              margin: '10px 0 8px',
              color: '#172344',
              fontSize: '21px',
            }}
          >
            Review a transaction
          </h3>

          <p style={mutedText}>
            Choose a demo customer and enter the
            proposed payment details.
          </p>

          <div
            style={{
              display: 'grid',
              gap: '18px',
              marginTop: '24px',
            }}
          >
            <label>
              Demo customer
              <select
                value={customerId}
                onChange={(event) =>
                  setCustomerId(
                    Number(event.target.value)
                  )
                }
              >
                <option value="0">
                  Customer 0
                </option>
                <option value="396">
                  Customer 396
                </option>
                <option value="486">
                  Customer 486
                </option>
              </select>
            </label>

            <label>
              Transaction type
              <select
                value={transactionType}
                onChange={(event) => {
                  setTransactionType(event.target.value)
                  clearResults()
                }}
              >
                <option value="TRANSFER">
                  Transfer
                </option>
                <option value="PAYMENT">
                  Payment
                </option>
                <option value="CASH_OUT">
                  Cash out
                </option>
                <option value="CASH_IN">
                  Cash in
                </option>
                <option value="DEBIT">
                  Debit
                </option>
              </select>
            </label>

            <label>
              Transaction amount (demo units)
              <input
                type="number"
                min="0.01"
                step="any"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value)
                  clearResults()
                }}
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
                onChange={(event) => {
                  setBalance(event.target.value)
                  clearResults()
                }}
              />
            </label>

            <label>
              Merchant identifier for history comparison
              <input
                type="text"
                value={merchantId}
                onChange={(event) => {
                  setMerchantId(event.target.value)
                  clearResults()
                }}
              />
            </label>

            <button
              type="button"
              onClick={analyze}
              disabled={loading}
              style={{
                width: '100%',
                marginTop: '6px',
              }}
            >
              {loading
                ? 'Checking payment...'
                : 'Check payment safety'}
            </button>
          </div>

          {error && (
            <p
              className="analysis-error"
              role="alert"
              style={{ marginTop: '16px' }}
            >
              {error}
            </p>
          )}

          <div
            style={{
              ...insightBox,
              marginTop: '24px',
            }}
          >
            <strong
              style={{
                fontSize: '12px',
                color: '#27365b',
              }}
            >
              About this demonstration
            </strong>

            <p
              style={{
                ...mutedText,
                margin: '8px 0 0',
                fontSize: '12px',
              }}
            >
              AI screening uses PaySim synthetic
              mobile-money data. Customer behavioral
              analysis uses separate IBM synthetic
              credit-card records. Results are
              experimental recommendations, not
              verified fraud decisions.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: SAFETY ASSESSMENT */}

        <div
          style={{
            ...columnCard,
            background: '#f8faff',
            borderColor: '#dce4fa',
          }}
        >
          <div style={miniLabel}>
            02 / SAFETY ASSESSMENT
          </div>

          {analyzedAmount === null ? (
            <>
              <div
                style={{
                  width: 64,
                  height: 64,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 20,
                  background: '#e8edff',
                  color: '#5269ed',
                  fontSize: '30px',
                  marginTop: '30px',
                  marginBottom: '22px',
                }}
                aria-hidden="true"
              >
                ◇
              </div>

              <h3
                style={{
                  fontSize: '23px',
                  color: '#172344',
                  marginBottom: '12px',
                }}
              >
                {loading
                  ? 'Reviewing this payment'
                  : 'Ready for review'}
              </h3>

              <p style={mutedText}>
                {loading
                  ? 'Intentra is checking the proposed ' +
                    'payment against two experimental systems.'
                  : 'Enter the payment details on the left ' +
                    'and select Check payment safety to ' +
                    'view a recommendation.'}
              </p>

              <div
                style={{
                  display: 'grid',
                  gap: '12px',
                  marginTop: '28px',
                }}
              >
                <div style={insightBox}>
                  <strong>
                    AI transaction screening
                  </strong>
                  <p
                    style={{
                      ...mutedText,
                      margin: '6px 0 0',
                    }}
                  >
                    {loading
                      ? 'Analysis in progress'
                      : 'Awaiting transaction details'}
                  </p>
                </div>

                <div style={insightBox}>
                  <strong>
                    Customer spending history
                  </strong>
                  <p
                    style={{
                      ...mutedText,
                      margin: '6px 0 0',
                    }}
                  >
                    {loading
                      ? 'Historical comparison in progress'
                      : `Ready to compare with Customer ${customerId}`}
                  </p>
                </div>
              </div>

              <p
                style={{
                  ...mutedText,
                  fontSize: '11px',
                  marginTop: '24px',
                }}
              >
                This tool does not authorize, block,
                or capture a payment.
              </p>
            </>
          ) : (
            <>
              {/* ASSESSMENT STATUS */}

              <div
                style={{
                  marginTop: '22px',
                  marginBottom: '18px',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    padding: '8px 12px',
                    borderRadius: 20,
                    background: needsReview
                      ? '#fff0df'
                      : fullyChecked
                        ? '#e8f6ed'
                        : '#edf1fa',
                    color: needsReview
                      ? '#9c6215'
                      : fullyChecked
                        ? '#276944'
                        : '#58677f',
                    fontSize: '11px',
                    fontWeight: 800,
                  }}
                >
                  {needsReview
                    ? 'ADDITIONAL REVIEW SUGGESTED'
                    : fullyChecked
                      ? 'NO ADDITIONAL ALERTS'
                      : 'PARTIAL CHECK'}
                </span>
              </div>

              <h3
                style={{
                  fontSize: '23px',
                  color: '#172344',
                  lineHeight: 1.3,
                  marginBottom: '16px',
                }}
              >
                {needsReview
                  ? 'Extra verification recommended'
                  : fullyChecked
                    ? 'No additional alerts detected'
                    : 'Safety check partially available'}
              </h3>

              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: '#172344',
                  marginBottom: '8px',
                }}
              >
                {formatAmount(analyzedAmount)}
              </div>

              <p style={mutedText}>
                Demo units · Customer {customerId}
              </p>

              <p
                style={{
                  ...mutedText,
                  marginTop: '18px',
                }}
              >
                {needsReview
                  ? 'At least one experimental screening ' +
                    'system identified a reason to review ' +
                    'this proposed payment.'
                  : isPartial
                    ? 'Some screening information was unavailable. ' +
                      'The payment cannot be fully assessed.'
                    : 'Neither completed screening system raised ' +
                      'an alert. This does not guarantee safety.'}
              </p>

              <div
                style={{
                  height: 1,
                  background: '#dde5f4',
                  margin: '24px 0',
                }}
              />

              {/* AI INSIGHT */}

              <div
                style={{
                  ...insightBox,
                  marginBottom: '14px',
                }}
              >
                <div
                  style={{
                    ...miniLabel,
                    marginBottom: '8px',
                  }}
                >
                  AI SCREENING
                </div>

                <strong
                  style={{ color: '#172344' }}
                >
                  {prediction
                    ? prediction.flagged_for_review
                      ? 'Pattern flagged for review'
                      : 'No model alert triggered'
                    : 'Screening unavailable'}
                </strong>

                <p
                  style={{
                    ...mutedText,
                    margin: '9px 0 0',
                  }}
                >
                  {prediction
                    ? prediction.flagged_for_review
                      ? 'The experimental AI model ' +
                        'identified a transaction pattern ' +
                        'that warrants attention.'
                      : 'The experimental AI model did ' +
                        'not flag this pattern at its ' +
                        'current decision threshold.'
                    : mlUnavailable
                      ? 'The AI screening service did ' +
                        'not return a usable result.'
                      : 'No AI result is available.'}
                </p>
              </div>

              {/* BEHAVIORAL INSIGHT */}

              <div style={insightBox}>
                <div
                  style={{
                    ...miniLabel,
                    marginBottom: '8px',
                  }}
                >
                  BEHAVIORAL CONTEXT
                </div>

                <strong
                  style={{ color: '#172344' }}
                >
                  {behavior
                    ? behavior.status ===
                      'INSUFFICIENT_HISTORY'
                      ? 'Insufficient history'
                      : behavior.status ===
                          'REVIEW_SUGGESTED'
                        ? 'Historical patterns warrant review'
                        : 'No behavioral alerts triggered'
                    : 'Historical comparison unavailable'}
                </strong>

                {behavior ? (
                  <>
                    <p
                      style={{
                        ...mutedText,
                        margin: '9px 0',
                      }}
                    >
                      Compared with{' '}
                      {behavior.history_count} recent
                      historical transactions for
                      Customer {behavior.customer_id}.
                    </p>

                    {behavior.median_previous_amount !==
                      undefined && (
                      <p style={mutedText}>
                        Typical recent amount:{' '}
                        <strong>
                          {formatAmount(
                            behavior.median_previous_amount
                          )}
                        </strong>
                      </p>
                    )}

                    {behavioralSignals.length > 0 && (
                      <ul
                        style={{
                          paddingLeft: '18px',
                          color: '#334366',
                          fontSize: '12px',
                          lineHeight: 1.7,
                        }}
                      >
                        {behavioralSignals.map(
                          (signal, index) => (
                            <li
                              key={`${signal.code}-${index}`}
                            >
                              <strong>
                                {signalTitle(signal.code)}
                              </strong>
                              : {signal.message}
                            </li>
                          )
                        )}
                      </ul>
                    )}
                  </>
                ) : (
                  <p
                    style={{
                      ...mutedText,
                      margin: '9px 0 0',
                    }}
                  >
                    {historyUnavailable
                      ? 'The historical analysis service ' +
                        'did not return a usable result.'
                      : 'No comparison available.'}
                  </p>
                )}
              </div>

              {/* NEW: ACTIONABLE NEXT STEPS */}

              <div
                style={{
                  marginTop: '24px',
                  padding: '20px',
                  border: '1px solid #dce5f7',
                  borderRadius: '15px',
                  background: '#ffffff',
                }}
              >
                <div style={miniLabel}>
                  03 / NEXT STEPS
                </div>

                <h4
                  style={{
                    fontSize: '17px',
                    color: '#172344',
                    margin: '10px 0 8px',
                  }}
                >
                  What can you do next?
                </h4>

                <p
                  style={{
                    ...mutedText,
                    marginBottom: '18px',
                  }}
                >
                  Explore the historical context
                  behind this assessment and review
                  practical precautions before making
                  your own decision.
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '10px',
                  }}
                >
                  <button
                    type="button"
                    onClick={viewHistoricalEvidence}
                    style={{
                      ...actionButton,
                      background: '#5269ed',
                      color: '#ffffff',
                      border: '1px solid #5269ed',
                    }}
                  >
                    View historical evidence ↓
                  </button>

                  <button
                    type="button"
                    onClick={reviewPrecautions}
                    style={{
                      ...actionButton,
                      background: '#ffffff',
                      color: '#5269ed',
                      border: '1px solid #ccd6f1',
                    }}
                  >
                    Review precautions ↓
                  </button>
                </div>
              </div>
               <button
  type="button"
  onClick={onOpenCheckout}
  disabled={!onOpenCheckout}
  style={{
    ...actionButton,
    background: '#ffffff',
    color: '#5269ed',
    border: '1px solid #ccd6f1',
  }}
>
  Explore PayPal Sandbox ↗
</button>     
              {/* PRECAUTIONS */}

              <div
                ref={precautionsRef}
                tabIndex={-1}
                style={{
                  marginTop: '24px',
                  marginBottom: '22px',
                  scrollMarginTop: '90px',
                  outline: 'none',
                }}
              >
                <h4
                  style={{
                    color: '#172344',
                    marginBottom: '12px',
                  }}
                >
                  Recommended precautions
                </h4>

                <ul
                  style={{
                    paddingLeft: '19px',
                    color: '#52617e',
                    lineHeight: 1.9,
                    fontSize: '12px',
                  }}
                >
                  <li>
                    Confirm that you recognize the recipient.
                  </li>
                  <li>
                    Double-check the payment amount.
                  </li>
                  <li>
                    Be cautious of urgent or unexpected requests.
                  </li>
                  {needsReview && (
                    <li>
                      Consider an additional verification
                      step before proceeding.
                    </li>
                  )}
                </ul>
              </div>

              {/* TECHNICAL DETAILS */}

              <details
                style={{
                  borderTop: '1px solid #dde5f4',
                  paddingTop: '18px',
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#5269ed',
                  }}
                >
                  Technical details (analyst view)
                </summary>

                <div
                  style={{
                    ...mutedText,
                    marginTop: '14px',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {prediction && (
                    <>
                      <p>
                        Model: {prediction.model_version}
                      </p>
                      <p>
                        Model score:{' '}
                        {prediction.model_score.toFixed(6)}
                      </p>
                      <p>
                        Decision threshold:{' '}
                        {prediction.decision_threshold.toFixed(6)}
                      </p>
                      <p>
                        Score calibrated:{' '}
                        {prediction.score_calibrated
                          ? 'Yes'
                          : 'No'}
                      </p>
                    </>
                  )}

                  {behavior && (
                    <>
                      <p>
                        Behavior status: {behavior.status}
                      </p>
                      <p>
                        Historical records:{' '}
                        {behavior.history_count}
                      </p>
                      <p>
                        Amount-to-median ratio:{' '}
                        {behavior.amount_to_median_ratio ??
                          'Unavailable'}
                      </p>
                      <p>
                        Merchant recently seen:{' '}
                        {behavior.merchant_seen_in_recent_history ===
                        undefined
                          ? 'Unknown'
                          : behavior.merchant_seen_in_recent_history
                            ? 'Yes'
                            : 'No'}
                      </p>
                    </>
                  )}
                </div>
              </details>

              <p
                style={{
                  ...mutedText,
                  fontSize: '11px',
                  marginTop: '22px',
                }}
              >
                PaySim AI screening and IBM TabFormer
                behavioral history are separate synthetic
                demonstrations. The model score is not
                a calibrated real-world fraud probability.
                No payment is automatically blocked,
                authorized, or captured.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
