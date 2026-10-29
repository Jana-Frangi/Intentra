
import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [apiStatus, setApiStatus] = useState('Checking backend...')
  
type RiskResult = {
  amount: string
  recent_transactions: number
  risk_score: number
  risk_level: string
  signals: string[]
  disclaimer: string
}

const [amount, setAmount] = useState('1200.00')
const [recentTransactions, setRecentTransactions] = useState('6')
const [riskResult, setRiskResult] = useState<RiskResult | null>(null)
const [analysisError, setAnalysisError] = useState('')
const [isAnalyzing, setIsAnalyzing] = useState(false)

async function handleAnalyze(event: React.SubmitEvent<HTMLFormElement>) {
  event.preventDefault()
  setIsAnalyzing(true)
  setAnalysisError('')
  setRiskResult(null)

  try {
    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim())) {
      throw new Error('Enter a valid amount with up to two decimal places.')
    }

    if (!/^\d+$/.test(recentTransactions.trim())) {
      throw new Error('Enter a non-negative whole number of transactions.')
    }

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount.trim(),
        recent_transactions: Number(recentTransactions),
      }),
    })

    if (!response.ok) {
      throw new Error('Unable to analyze this transaction.')
    }

    const data: RiskResult = await response.json()
    setRiskResult(data)
  } catch (error) {
    setAnalysisError(
      error instanceof Error ? error.message : 'Something went wrong.'
    )
  } finally {
    setIsAnalyzing(false)
  }
}


  useEffect(() => {
    let active = true

    fetch('/api/health')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Backend returned an error')
        }
        return response.json()
      })
      .then((data) => {
        if (active) {
          setApiStatus(
            data.status === 'healthy'
              ? 'Backend connected'
              : 'Unexpected backend response'
          )
        }
      })
      .catch(() => {
        if (active) {
          setApiStatus('Backend unavailable')
        }
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <main className="app">
      <header className="header">
        <div className="logo">
          Intentra<span>.</span>
        </div>

        <span className="status">
          Prototype · PayPal AI Hackathon
        </span>

        <span className="status">
          {apiStatus}
        </span>
      </header>

      <section className="hero">
        <div className="eyebrow">
          PAYMENT INTELLIGENCE
        </div>

        <h1>
          Understand your payment.
          <br />
          <span>
            Make your next move with confidence.
          </span>
        </h1>

        <p>
          A smarter way to review payment costs, spot potential
          risks, and understand transaction details before paying.
        </p>

        <div className="actions">
          <a href="#features" className="primary-button">
            Explore Intentra
          </a>
        </div>
      </section>

      <section id="features" className="features">
        <article className="feature">
          <div className="feature-icon">01</div>
          <h2>Payment transparency</h2>
          <p>
            Understand fees and estimated payment costs.
          </p>
        </article>

        <article className="feature">
          <div className="feature-icon">02</div>
          <h2>Smart risk insights</h2>
          <p>
            Explore potential risks using rules and
            AI-assisted analysis.
          </p>
        </article>

        <article className="feature">
          <div className="feature-icon">03</div>
          <h2>Payment confidence</h2>
          <p>
            Review important conditions before confirming
            a payment.
          </p>
        </article>
      </section>
        
      <section className="analysis-section" id="analyze">
        <div className="eyebrow">PAYMENT RISK ANALYSIS</div>

        <h2>Analyze a payment</h2>

        <p>
          Enter a payment amount and recent transaction count
          to test our rule-based risk engine.
        </p>

        <form className="analysis-form" onSubmit={handleAnalyze}>
          <label>
            Payment amount
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
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
            {isAnalyzing ? 'Analyzing...' : 'Analyze payment'}
          </button>
        </form>

        {analysisError && (
          <p className="analysis-error" role="alert">
            {analysisError}
          </p>
        )}

        {riskResult && (
          <div className="analysis-result">
            <h3>Payment risk assessment</h3>

            <p>
              Risk score: <strong>{riskResult.risk_score}/100</strong>
            </p>

            <p>
              Risk level:{' '}
              <strong>{riskResult.risk_level.toUpperCase()}</strong>
            </p>

            <h4>Detected signals</h4>

            {riskResult.signals.length > 0 ? (
              <ul>
                {riskResult.signals.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            ) : (
              <p>No predefined risk signals detected.</p>
            )}

            <p className="disclaimer">
              {riskResult.disclaimer}
            </p>
          </div>
        )}
      </section>

      <footer>
        Intentra · Hackathon prototype · No real payments
      </footer>
    </main>
  )
}

export default App
