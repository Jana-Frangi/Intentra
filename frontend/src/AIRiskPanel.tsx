
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

  async function analyzeTransaction() {
    setLoading(true)
    setError('')
    setPrediction(null)

    const numericAmount = Number(amount)
    const numericBalance = Number(balance)

    if (
      !Number.isFinite(numericAmount) ||
      !Number.isFinite(numericBalance) ||
      numericAmount <= 0 ||
      numericBalance < 0 ||
      amount.trim() === '' ||
      balance.trim() === ''
    ) {
      setError(
        'Enter a positive amount and a nonnegative balance.'
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
        body: JSON.stringify({
          transaction_type: transactionType,
          amount: numericAmount,
          old_balance: numericBalance,
        }),
      })

      if (!response.ok) {
        throw new Error('AI prediction request failed.')
      }

      const result: Prediction = await response.json()
      setPrediction(result)
    } catch {
      setError(
        'Unable to obtain the AI prediction. ' +
        'Check that the backend is running.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="analysis-section">
      <div className="eyebrow">INTENTRA AI</div>
      <h2>AI Transaction Intelligence</h2>

      <p>
        Explore how our trained machine-learning model
        evaluates transaction patterns using PaySim data.
      </p>

      <div
        style={{
          display: 'grid',
          gap: '16px',
          maxWidth: '440px',
          marginTop: '24px',
        }}
      >
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
          Transaction amount
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
          Sender balance before transaction
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
          onClick={analyzeTransaction}
          disabled={loading}
        >
          {loading ? 'Analyzing...' : 'Analyze with AI'}
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
            maxWidth: '440px',
            marginTop: '24px',
          }}
        >
          <h3>
            {prediction.flagged_for_review
              ? 'Additional review recommended'
              : 'No model alert triggered'}
          </h3>

          <p>
            Model score:{' '}
            <strong>
              {prediction.model_score.toFixed(4)}
            </strong>
          </p>

          <p>
            Review threshold:{' '}
            <strong>
              {prediction.decision_threshold.toFixed(4)}
            </strong>
          </p>

          <p>
            Model version:{' '}
            <strong>{prediction.model_version}</strong>
          </p>

          <p>
            Dataset:{' '}
            <strong>{prediction.dataset}</strong>
          </p>

          <p>
            <small>{prediction.warning}</small>
          </p>
        </div>
      )}
    </section>
  )
}
