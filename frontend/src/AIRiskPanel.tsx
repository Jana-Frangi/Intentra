
import { useState } from 'react'

type Prediction = {
  model_version: string
  model_score: number
  decision_threshold: number
  flagged_for_review: boolean
  score_calibrated: boolean
  dataset: string
  warning: string
}

export default function AIRiskPanel() {
  const [transactionType, setTransactionType] =
    useState('TRANSFER')
  const [amount, setAmount] = useState('1800')
  const [balance, setBalance] = useState('1800')

  const [prediction, setPrediction] =
    useState<Prediction | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showTechnical, setShowTechnical] = useState(false)

  async function analyzeTransaction() {
    setLoading(true)
    setError('')
    setPrediction(null)
    setShowTechnical(false)

    const numericAmount = Number(amount)
    const numericBalance = Number(balance)

    if (
      amount.trim() === '' ||
      balance.trim() === '' ||
      !Number.isFinite(numericAmount) ||
      !Number.isFinite(numericBalance) ||
      numericAmount <= 0 ||
      numericBalance < 0
    ) {
      setError(
        'Enter a valid payment amount and starting balance.'
      )
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/ml/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          transaction_type: transactionType,
          amount: numericAmount,
          old_balance: numericBalance,
        }),
      })

      if (!response.ok) {
        throw new Error('Prediction request failed.')
      }

      const result: Prediction = await response.json()

      if (
        typeof result.flagged_for_review !== 'boolean' ||
        !Number.isFinite(result.model_score) ||
        !Number.isFinite(result.decision_threshold)
      ) {
        throw new Error('Invalid prediction response.')
      }

      setPrediction(result)
    } catch {
      setError(
        'We could not complete the safety check. ' +
        'Please try again when the service is available.'
      )
    } finally {
      setLoading(false)
    }
  }

  const amountLabel = Number(amount).toLocaleString(
    'en-IE',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )

  return (
    <section className="analysis-section">
      <div className="eyebrow">INTENTRA PROTECT</div>

      <h2>Payment Safety Check</h2>

      <p>
        Check a sample transaction for patterns that
        may deserve additional attention.
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
          Payment type
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
          Payment amount (demo units)
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
          Available balance before payment (demo units)
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

        <button
          type="button"
          disabled={loading}
          onClick={analyzeTransaction}
        >
          {loading
            ? 'Checking transaction...'
            : 'Check payment safety'}
        </button>
      </div>

      {error && (
        <p className="analysis-error" role="alert">
          {error}
        </p>
      )}

      {prediction && (
        <div
          className="analysis-result"
          style={{
            maxWidth: '520px',
            marginTop: '26px',
            padding: '24px',
          }}
        >
          <div className="eyebrow">
            PAYMENT SAFETY RESULT
          </div>

          <h3>
            {prediction.flagged_for_review
              ? 'Extra verification recommended'
              : 'No additional model alert'}
          </h3>

          <p style={{ fontSize: '26px', fontWeight: 700 }}>
            {amountLabel} demo units
          </p>

          <p>
            {prediction.flagged_for_review
              ? (
                'This transaction matches a pattern ' +
                'flagged by our experimental screening model. ' +
                'It may deserve additional review.'
              )
              : (
                'The experimental screening model did not ' +
                'flag this transaction at its current threshold. ' +
                'This does not guarantee the payment is safe.'
              )}
          </p>

          <div style={{ marginTop: '20px' }}>
            <h4>Before proceeding</h4>

            <ul>
              <li>
                Confirm you recognize the recipient.
              </li>
              <li>
                Double-check the payment amount.
              </li>
              <li>
                Be cautious of unexpected or urgent requests.
              </li>
              {prediction.flagged_for_review && (
                <li>
                  Consider additional verification before paying.
                </li>
              )}
            </ul>
          </div>

          <p style={{ marginTop: '20px' }}>
            <small>
              This is experimental screening based on
              synthetic transaction data. It does not
              determine whether a payment is fraudulent
              and does not automatically block payments.
            </small>
          </p>

          <details
            open={showTechnical}
            onToggle={(event) =>
              setShowTechnical(event.currentTarget.open)
            }
            style={{ marginTop: '20px' }}
          >
            <summary style={{ cursor: 'pointer' }}>
              Technical details (analyst view)
            </summary>

            <div style={{ marginTop: '12px' }}>
              <p>
                Model version: {prediction.model_version}
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
                Training dataset: {prediction.dataset}
              </p>
              <p>
                Scores calibrated:{' '}
                {prediction.score_calibrated ? 'Yes' : 'No'}
              </p>
            </div>
          </details>
        </div>
      )}
    </section>
  )
}
