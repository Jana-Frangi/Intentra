
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useDemoCustomer, DEMO_CUSTOMER_NAMES, demoCustomerInitials } from './demoCustomer'
import { usePaymentContext } from './paymentContext'

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

type Props = {
  onOpenCheckout?: () => void
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
    return 'Unfamiliar merchant'
  }

  return 'Additional behavioral signal'
}

const card: CSSProperties = {
  minWidth: 0,
  padding: 24,
  borderRadius: 18,
  border: '1px solid #e1e7f4',
  background: '#ffffff',
}

const muted: CSSProperties = {
  color: '#75819b',
  fontSize: 13,
  lineHeight: 1.7,
}

const kicker: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '1.5px',
  color: '#5269ed',
  textTransform: 'uppercase',
}

const infoCard: CSSProperties = {
  padding: 16,
  background: '#f7f9fe',
  border: '1px solid #e7ebf6',
  borderRadius: 12,
}

const actionButton: CSSProperties = {
  padding: '13px 16px',
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
}

export default function AIRiskPanel({
  onOpenCheckout,
}: Props) {
  const [sharedCustomerId] = useDemoCustomer()
  const customerName = DEMO_CUSTOMER_NAMES[sharedCustomerId]


  const {
    transactionType,
    setTransactionType,
    amount,
    setAmount,
    balance,
    setBalance,
    merchantId,
    setMerchantId,
  } = usePaymentContext()


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
  }, [sharedCustomerId])

  useEffect(() => {
    clearResults()
  }, [transactionType, amount, balance, merchantId])

  async function analyze() {
    clearResults()

    const currentRequest = requestGeneration.current
    const numericAmount = Number(amount)
    const numericBalance = Number(balance)

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
            customer_id: sharedCustomerId,
            amount: numericAmount,
            merchant_id: merchantId.trim(),
            transaction_time: DEMO_TIMESTAMP,
          }
        ),
      ])

      if (
        currentRequest !== requestGeneration.current
      ) {
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
        historyResult.value.customer_id ===
            sharedCustomerId &&
        typeof historyResult.value.status === 'string' &&
        Array.isArray(
          historyResult.value.signals ?? []
        )
      ) {
        setBehavior(historyResult.value)
      } else {
        setHistoryUnavailable(true)
      }

      setAnalyzedAmount(numericAmount)
    } catch {
      if (
        currentRequest === requestGeneration.current
      ) {
        setError(
          'The payment safety check could not finish.'
        )
      }
    } finally {
      if (
        currentRequest === requestGeneration.current
      ) {
        setLoading(false)
      }
    }
  }

  function viewHistoricalEvidence() {
    const section =
      document.querySelector<HTMLElement>(
        '.customer-history-panel'
      )

    if (!section) return

    section.setAttribute('tabindex', '-1')
    section.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
    section.focus({ preventScroll: true })
  }

  function reviewPrecautions() {
    precautionsRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
    precautionsRef.current?.focus({
      preventScroll: true,
    })
  }

  const signals = behavior?.signals ?? []

  const needsReview =
    prediction?.flagged_for_review === true ||
    behavior?.status === 'REVIEW_SUGGESTED'

  const fullyChecked =
    prediction !== null &&
    behavior !== null &&
    behavior.status !== 'INSUFFICIENT_HISTORY'

  return (
    <section
      className="analysis-section"
      aria-label="Personal payment safety check"
      style={{ width: '100%', minWidth: 0 }}
    >
      <div style={{ marginBottom: 26 }}>
        <div className="eyebrow">
          INTENTRA PROTECT
        </div>

        <h2>My Payment Protection</h2>

        <p style={muted}>
          Review a proposed payment against experimental
          AI screening and your synthetic account history.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(100%, 350px), 1fr))',
          alignItems: 'start',
          gap: 22,
          width: '100%',
        }}
      >
        {/* LEFT: PERSONAL ACCOUNT AND PAYMENT DETAILS */}

        <div style={card}>
          <div style={kicker}>
            01 / MY PAYMENT DETAILS
          </div>

          <h3
            style={{
              margin: '10px 0 18px',
              fontSize: 21,
              color: '#172344',
            }}
          >
            Review a transaction
          </h3>

          {/* ACCOUNT IDENTIFICATION */}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: 17,
              background: '#eef2ff',
              border: '1px solid #dce4ff',
              borderRadius: 14,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 15,
                background: '#dce5ff',
                color: '#4259ce',
                fontWeight: 800,
                fontSize: 16,
              }}
            >
              {demoCustomerInitials(sharedCustomerId)}
            </div>

            <div>
              <strong
                style={{
                  display: 'block',
                  color: '#172344',
                  fontSize: 15,
                  marginBottom: 4,
                }}
              >
                {customerName}
              </strong>

              <span
                style={{
                  color: '#6f7e9d',
                  fontSize: 11,
                }}
              >
                Personal demo account · Synthetic history
              </span>
            </div>
          </div>

          <p style={muted}>
            Enter the payment you would like
            Intentra to review.
          </p>

          <div
            style={{
              display: 'grid',
              gap: 18,
              marginTop: 22,
            }}
          >
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
              Payment amount (demo units)
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
              Starting balance (demo units)
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
              Recipient or merchant identifier
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
                marginTop: 6,
              }}
            >

              {loading
                ? 'Reviewing payment...'
                : 'Review payment safety'}
            </button>
          </div>

          {error && (
            <p
              className="analysis-error"
              role="alert"
              style={{ marginTop: 16 }}
            >
              {error}
            </p>
          )}

          <div
            style={{
              ...infoCard,
              marginTop: 24,
            }}
          >
            <strong
              style={{
                fontSize: 12,
                color: '#27365b',
              }}
            >
              About your demo account
            </strong>

            <p
              style={{
                ...muted,
                fontSize: 12,
                margin: '8px 0 0',
              }}
            >
              {customerName} is a fictional identity linked to
              existing synthetic IBM transactions.
              AI screening uses a separate PaySim
              dataset. No real account information
              is accessed.
            </p>
          </div>
        </div>

        {/* RIGHT: SAFETY ASSESSMENT */}

        <div
          style={{
            ...card,
            background: '#f8faff',
            borderColor: '#dce4fa',
          }}
        >
          <div style={kicker}>
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
                  fontSize: 30,
                  margin: '30px 0 22px',
                }}
                aria-hidden="true"
              >
                ◇
              </div>

              <h3
                style={{
                  fontSize: 23,
                  color: '#172344',
                }}
              >
                {loading
                  ? 'Reviewing your payment'
                  : 'Ready when you are'}
              </h3>

              <p style={muted}>
                {loading
                  ? 'Intentra is running its experimental checks.'
                  : 'Enter your payment details to receive ' +
                    'an AI-assisted safety assessment.'}
              </p>

              <div
                style={{
                  display: 'grid',
                  gap: 12,
                  marginTop: 28,
                }}
              >
                <div style={infoCard}>
                  <strong>AI transaction screening</strong>
                  <p style={muted}>
                    {loading
                      ? 'Analysis in progress'
                      : 'Awaiting payment details'}
                  </p>
                </div>

                <div style={infoCard}>
                  <strong>My spending history</strong>
                  <p style={muted}>
                    {loading
                      ? 'Historical comparison in progress'
                      : `Ready to compare with ${customerName}'s history`}
                  </p>
                </div>
              </div>

              <p
                style={{
                  ...muted,
                  fontSize: 11,
                  marginTop: 24,
                }}
              >
                This analysis does not authorize,
                capture, or block payments.
              </p>
            </>
          ) : (
            <>
              {/* RESULT STATUS */}

              <div style={{ margin: '22px 0 18px' }}>
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
                    fontSize: 11,
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
                  fontSize: 23,
                  color: '#172344',
                  lineHeight: 1.3,
                  marginBottom: 16,
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
                  fontSize: 28,
                  fontWeight: 800,
                  color: '#172344',
                }}
              >
                {formatAmount(analyzedAmount)}
              </div>

              <p style={muted}>
                Demo units · {customerName}
              </p>

              <p
                style={{
                  ...muted,
                  marginTop: 18,
                }}
              >
                {needsReview
                  ? prediction?.flagged_for_review
                    ? 'Experimental ML screening flagged this payment. ' +
                      'Your spending history is shown separately below.'
                    : 'Your spending history identified unusual ' +
                      'payment activity. Additional verification ' +
                      'is recommended even without an ML alert.'
                  : fullyChecked
                    ? 'Neither completed system raised an ' +
                      'alert. This does not guarantee safety.'
                    : 'Some screening information is ' +
                      'unavailable, so the assessment is incomplete.'}
              </p>

              <hr
                style={{
                  border: 0,
                  height: 1,
                  background: '#dde5f4',
                  margin: '24px 0',
                }}
              />

              {/* ML RESULT */}

              <div
                style={{
                  ...infoCard,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    ...kicker,
                    marginBottom: 8,
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
                      : 'No ML pattern flagged'
                    : 'Screening unavailable'}
                </strong>

                <p
                  style={{
                    ...muted,
                    margin: '9px 0 0',
                  }}
                >
                  {prediction
                    ? prediction.flagged_for_review
                      ? 'The experimental PaySim model ' +
                        'flagged this transaction pattern.'
                      : 'The experimental PaySim model ' +
                        'did not independently flag this pattern. ' +
                        'Behavioral checks may still recommend ' +
                        'additional verification.'
                    : mlUnavailable
                      ? 'The AI screening service did not ' +
                        'return a usable result.'
                      : 'No AI result is available.'}
                </p>
              </div>

              {/* BEHAVIORAL RESULT */}

              <div style={infoCard}>
                <div
                  style={{
                    ...kicker,
                    marginBottom: 8,
                  }}
                >
                  MY SPENDING HISTORY
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
                        ? 'Unusual historical patterns'
                        : 'No behavioral alerts'
                    : 'History unavailable'}
                </strong>

                {behavior ? (
                  <>
                    <p
                      style={{
                        ...muted,
                        margin: '9px 0',
                      }}
                    >
                      Compared with{' '}
                      {behavior.history_count} recent
                      synthetic transactions from
                      {customerName}'s account.
                    </p>

                    {behavior.median_previous_amount !==
                      undefined && (
                      <p style={muted}>
                        Typical recent amount:{' '}
                        <strong>
                          {formatAmount(
                            behavior.median_previous_amount
                          )}
                        </strong>
                      </p>
                    )}

                    {signals.length > 0 && (
                      <ul
                        style={{
                          paddingLeft: 18,
                          color: '#334366',
                          fontSize: 12,
                          lineHeight: 1.7,
                        }}
                      >
                        {signals.map((signal, index) => (
                          <li
                            key={`${signal.code}-${index}`}
                          >
                            <strong>
                              {signalTitle(signal.code)}
                            </strong>
                            : {signal.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <p style={muted}>
                    {historyUnavailable
                      ? 'The history service did not ' +
                        'return a usable result.'
                      : 'No historical comparison available.'}
                  </p>
                )}
              </div>

              {/* NEXT STEPS */}

              <div
                style={{
                  padding: 20,
                  marginTop: 24,
                  border: '1px solid #dce5f7',
                  borderRadius: 15,
                  background: '#ffffff',
                }}
              >
                <div style={kicker}>
                  03 / NEXT STEPS
                </div>

                <h4
                  style={{
                    fontSize: 17,
                    color: '#172344',
                    margin: '10px 0 8px',
                  }}
                >
                  What can I do next?
                </h4>

                <p style={muted}>
                  Explore the history behind this
                  assessment and review practical
                  precautions.
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 10,
                    marginTop: 16,
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
                    View my history ↓
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
                </div>

                <p
                  style={{
                    ...muted,
                    fontSize: 11,
                    marginTop: 14,
                  }}
                >
                  Sandbox checkout is separate from this
                  synthetic safety assessment.
                </p>
              </div>

              {/* PRECAUTIONS */}

              <div
                ref={precautionsRef}
                tabIndex={-1}
                style={{
                  margin: '24px 0',
                  scrollMarginTop: 90,
                  outline: 'none',
                }}
              >
                <h4
                  style={{
                    color: '#172344',
                    marginBottom: 12,
                  }}
                >
                  Recommended precautions
                </h4>

                <ul
                  style={{
                    paddingLeft: 19,
                    color: '#52617e',
                    fontSize: 12,
                    lineHeight: 1.9,
                  }}
                >
                  <li>Confirm you recognize the recipient.</li>
                  <li>Double-check the payment amount.</li>
                  <li>
                    Be cautious of urgent payment requests.
                  </li>
                  {needsReview && (
                    <li>
                      Consider an additional verification
                      step before proceeding.
                    </li>
                  )}
                </ul>
              </div>


{/* EXPLAINABLE PAYMENT EVIDENCE */}
<details
  style={{
    marginTop: 22,
    marginBottom: 20,
    padding: '18px 20px',
    background: '#eef2ff',
    border: '1px solid #cdd8ff',
    borderRadius: 14,
  }}
>
  <summary
    style={{
      cursor: 'pointer',
      color: '#253b87',
      fontSize: 15,
      fontWeight: 700,
    }}
  >
    ✦ Why this advice? — See the numbers
  </summary>

  <div
    style={{
      marginTop: 18,
      display: 'grid',
      gap: 12,
      color: '#283858',
      fontSize: 13,
    }}
  >
    <div>
      <strong>Proposed payment</strong>
      <div>
        {formatAmount(analyzedAmount)} demo units
      </div>
    </div>

    <div>
      <strong>Entered starting balance</strong>
      <div>
        {formatAmount(Number(balance))} demo units
      </div>
    </div>

    {analyzedAmount > Number(balance) && (
      <div>
        <strong>Amount not covered by this balance</strong>
        <div>
          {formatAmount(
            analyzedAmount - Number(balance)
          )} demo units
        </div>
      </div>
    )}

    {behavior &&
      typeof behavior.median_previous_amount ===
        'number' && (
        <div>
          <strong>Typical recent transaction</strong>
          <div>
            {formatAmount(
              behavior.median_previous_amount
            )} demo units (median)
          </div>
        </div>
      )}

    {behavior &&
      typeof behavior.amount_to_median_ratio ===
        'number' && (
        <div>
          <strong>Compared with usual spending</strong>
          <div>
            {behavior.amount_to_median_ratio.toFixed(1)}
            × the recent median
          </div>
        </div>
      )}

    <div>
      <strong>Merchant familiarity</strong>
      <div>
        {behavior?.merchant_seen_in_recent_history ===
        true
          ? 'Seen in recent synthetic history'
          : behavior?.merchant_seen_in_recent_history ===
            false
            ? 'Not seen in recent synthetic history'
            : 'Information unavailable'}
      </div>
    </div>

    <div>
      <strong>Experimental ML screening</strong>
      <div>
        {prediction
          ? prediction.flagged_for_review
            ? 'Flagged for review'
            : 'No ML pattern flagged'
          : 'Unavailable'}
      </div>
    </div>

    <p
      style={{
        margin: '8px 0 0',
        color: '#65728e',
        fontSize: 11,
        lineHeight: 1.7,
      }}
    >
      Figures come from the current payment inputs
      and Intentra's structured backend results.
      Historical amounts use synthetic demo units.
      The experimental model does not establish
      whether a payment is safe or fraudulent.
    </p>
  </div>
</details>

              {/* ANALYST DETAILS */}

              <details
                style={{
                  borderTop: '1px solid #dde5f4',
                  paddingTop: 18,
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    color: '#5269ed',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Technical details
                </summary>

                <div
                  style={{
                    ...muted,
                    marginTop: 14,
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
                        Threshold:{' '}
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
                        Behavioral status: {behavior.status}
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
                        Merchant seen recently:{' '}
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
                  ...muted,
                  fontSize: 11,
                  marginTop: 22,
                }}
              >
                PaySim AI screening and IBM TabFormer
                historical comparisons use separate
                synthetic datasets. The AI model score
                is not a calibrated real-world fraud
                probability. No payment is automatically
                approved, blocked, or captured.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
