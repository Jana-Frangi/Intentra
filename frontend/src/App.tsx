
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import PayPalCheckout from './PayPalCheckout'
import './App.css'

type RiskResult = {
  amount: string
  recent_transactions: number
  risk_score: number
  risk_level: string
  signals: string[]
  disclaimer: string
}

type BehaviorResult = {
  status: string
  historical_median: string | null
  amount_ratio: number | null
  is_unusual: boolean
  message: string
}

function App() {
  const [apiStatus, setApiStatus] = useState('Checking backend...')

  const [amount, setAmount] = useState('1200.00')
  const [recentTransactions, setRecentTransactions] = useState('6')
  const [historicalAmounts, setHistoricalAmounts] = useState(
    '35.00, 45.00, 40.00, 50.00, 30.00'
  )

  const [riskResult, setRiskResult] = useState<RiskResult | null>(null)
  const [behaviorResult, setBehaviorResult] =
    useState<BehaviorResult | null>(null)

  const [analysisError, setAnalysisError] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    fetch('/api/health')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Backend unavailable')
        }
        return response.json()
      })
      .then(() => setApiStatus('Backend connected'))
      .catch(() => setApiStatus('Backend unavailable'))
  }, [])

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setIsAnalyzing(true)
    setAnalysisError('')
    setRiskResult(null)
    setBehaviorResult(null)

    try {
      const currentAmount = amount.trim()
      const recentCount = recentTransactions.trim()

      if (
        !/^\d+(\.\d{1,2})?$/.test(currentAmount) ||
        Number(currentAmount) <= 0
      ) {
        throw new Error(
          'Enter a positive payment amount with up to two decimal places.'
        )
      }

      if (
        !/^\d+$/.test(recentCount) ||
        !Number.isSafeInteger(Number(recentCount))
      ) {
        throw new Error(
          'Enter a valid non-negative whole number of transactions.'
        )
      }

      const history = historicalAmounts
        .split(',')
        .map((value) => value.trim())

      if (
        history.some(
          (value) =>
            !/^\d+(\.\d{1,2})?$/.test(value) ||
            Number(value) <= 0
        )
      ) {
        throw new Error(
          'Enter positive historical amounts separated by commas.'
        )
      }

      // Analyze transaction risk.
      const riskResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: currentAmount,
          recent_transactions: Number(recentCount),
        }),
      })

      if (!riskResponse.ok) {
        throw new Error('Unable to analyze transaction risk.')
      }

      const riskData: RiskResult = await riskResponse.json()
      setRiskResult(riskData)

      // Compare the transaction against historical activity.
      const behaviorResponse = await fetch(
        '/api/analyze-behavior',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: currentAmount,
            historical_amounts: history,
          }),
        }
      )

      if (!behaviorResponse.ok) {
        throw new Error(
          'Unable to analyze transaction history.'
        )
      }

      const behaviorData: BehaviorResult =
        await behaviorResponse.json()

      setBehaviorResult(behaviorData)
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : 'Something went wrong.'
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="app">
      <header>
        <div className="logo">Intentra.</div>
        <div className="status">{apiStatus}</div>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow">
            SMARTER PAYMENT INTELLIGENCE
          </div>

          <h1>
            Understand your payment.
            <br />
            <span>
              Make your next move with confidence.
            </span>
          </h1>

          <p>
            A smarter way to review payment costs,
            spot potential risks, and understand transaction
            details before paying.
          </p>

          <a className="primary-button" href="#analyze">
            Explore Intentra
          </a>
        </section>

        <section className="features">
          <div className="feature-card">
            <div className="feature-number">01</div>
            <h3>Payment transparency</h3>
            <p>
              Understand fees and estimated payment costs.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-number">02</div>
            <h3>Smart risk insights</h3>
            <p>
              Explore potential risks using rules and
              AI-assisted analysis.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-number">03</div>
            <h3>Payment confidence</h3>
            <p>
              Review important conditions before confirming
              a payment.
            </p>
          </div>
        </section>

        <section className="analysis-section" id="analyze">
          <div className="eyebrow">
            PAYMENT RISK ANALYSIS
          </div>

          <h2>Analyze a payment</h2>

          <p>
            Explore transaction risk and compare a payment
            against synthetic historical activity.
          </p>

          <form
            className="analysis-form"
            onSubmit={handleAnalyze}
          >
            <label>
              Payment amount
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) =>
                  setAmount(event.target.value)
                }
                placeholder="1200.00"
                required
              />
            </label>

            <label>
              Recent transactions
              <input
                type="number"
                min="0"
                step="1"
                value={recentTransactions}
                onChange={(event) =>
                  setRecentTransactions(event.target.value)
                }
                required
              />
            </label>

            <button
              type="submit"
              className="primary-button"
              disabled={isAnalyzing}
            >
              {isAnalyzing
                ? 'Analyzing...'
                : 'Analyze payment'}
            </button>

            <label className="history-field">
              Previous payment amounts (comma-separated)
              <textarea
                value={historicalAmounts}
                onChange={(event) =>
                  setHistoricalAmounts(event.target.value)
                }
                placeholder="35.00, 45.00, 40.00"
                rows={3}
              />
            </label>
          </form>

          {analysisError && (
            <p className="analysis-error" role="alert">
              {analysisError}
            </p>
          )}

          {riskResult && (
            <div className="analysis-result">
              <h3>Transaction risk assessment</h3>

              <p>
                Risk score:{' '}
                <strong>
                  {riskResult.risk_score}/100
                </strong>
              </p>

              <p>
                Risk level:{' '}
                <strong>
                  {riskResult.risk_level.toUpperCase()}
                </strong>
              </p>

              <h4>Detected signals</h4>

              {riskResult.signals.length > 0 ? (
                <ul>
                  {riskResult.signals.map((signal) => (
                    <li key={signal}>{signal}</li>
                  ))}
                </ul>
              ) : (
                <p>
                  No predefined risk signals detected.
                </p>
              )}

              <p className="disclaimer">
                {riskResult.disclaimer}
              </p>
            </div>
          )}

          {behaviorResult && (
            <div className="analysis-result behavior-result">
              <h3>Personalized behavior analysis</h3>

              {behaviorResult.status === 'analyzed' ? (
                <>
                  <p>
                    Historical median:{' '}
                    <strong>
                      {behaviorResult.historical_median}
                    </strong>
                  </p>

                  <p>
                    Payment-to-median ratio:{' '}
                    <strong>
                      {behaviorResult.amount_ratio}x
                    </strong>
                  </p>

                  <p>
                    Behavior flag:{' '}
                    <strong>
                      {behaviorResult.is_unusual
                        ? 'UNUSUALLY LARGE'
                        : 'WITHIN THRESHOLD'}
                    </strong>
                  </p>
                </>
              ) : (
                <p>
                  Insufficient transaction history.
                </p>
              )}

              <p>{behaviorResult.message}</p>

              <p className="disclaimer">
                Based on illustrative transaction history
                and experimental thresholds.
                This does not establish fraud.
              </p>
            </div>
          )}
        </section>

        {/* PayPal Checkout integration */}
        <div id="checkout">
          <PayPalCheckout />
        </div>
      </main>

      <footer>
        Intentra | Hackathon prototype | Sandbox only
      </footer>
    </div>
  )
}

export default App
