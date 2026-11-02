
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import AIRiskPanel from './AIRiskPanel'
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
  const [apiStatus, setApiStatus] = useState('Connecting')
  const [amount, setAmount] = useState('1200.00')
  const [recentTransactions, setRecentTransactions] = useState('6')
  const [historicalAmounts, setHistoricalAmounts] = useState(
    '35.00, 45.00, 40.00, 50.00, 30.00'
  )

  const [riskResult, setRiskResult] = useState<RiskResult | null>(
    null
  )
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
      .then(() => setApiStatus('System connected'))
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
          'Enter a positive amount with up to two decimal places.'
        )
      }

      if (
        !/^\d+$/.test(recentCount) ||
        !Number.isSafeInteger(Number(recentCount))
      ) {
        throw new Error(
          'Enter a valid number of recent transactions.'
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
          'Enter valid positive historical amounts separated by commas.'
        )
      }

      const riskResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: currentAmount,
          recent_transactions: Number(recentCount),
        }),
      })

      if (!riskResponse.ok) {
        throw new Error('Risk analysis is unavailable.')
      }

      const riskData: RiskResult = await riskResponse.json()
      setRiskResult(riskData)

      const behaviorResponse = await fetch(
        '/api/analyze-behavior',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: currentAmount,
            historical_amounts: history,
          }),
        }
      )

      if (!behaviorResponse.ok) {
        throw new Error('Behavior analysis is unavailable.')
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
    <div className="intentra-app">
      <aside className="intentra-sidebar">
        <a className="intentra-brand" href="#overview">
          <span className="intentra-brand-mark">✦</span>
          <span>intentra<span className="brand-dot">.</span></span>
        </a>

        <div className="sidebar-caption">WORKSPACE</div>

        <nav className="intentra-nav" aria-label="Main navigation">
          <a href="#overview">
            <span>◈</span> Overview
          </a>
          <a href="#protection">
            <span>◇</span> Payment protection
          </a>
          <a href="#checkout">
            <span>▣</span> PayPal checkout
          </a>
          <a href="#analyst">
            <span>▤</span> Analyst tools
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-info-card">
            <div className="info-card-symbol">✧</div>
            <strong>Intelligence with clarity</strong>
            <p>
              AI-assisted screening with transparent,
              human-centered recommendations.
            </p>
          </div>

          <div className="sidebar-environment">
            <span className="environment-indicator" />
            Local demonstration
          </div>
        </div>
      </aside>

      <div className="intentra-content">
        <header className="intentra-topbar">
          <div className="topbar-identity">
            <span className="topbar-label">Intentra workspace</span>
            <strong>Payment intelligence</strong>
          </div>

          <div className="topbar-right">
            <span
              className={
                apiStatus === 'System connected'
                  ? 'connection-status connected'
                  : 'connection-status'
              }
            >
              <span className="environment-indicator" />
              {apiStatus}
            </span>
            <span className="demo-avatar">I</span>
          </div>
        </header>

        <main className="intentra-main">
          <section id="overview" className="dashboard-hero">
            <div className="dashboard-hero-content">
              <div className="hero-kicker">
                ✦ INTELLIGENT PAYMENT PROTECTION
              </div>

              <h1>
                Every payment deserves
                <span> a second look.</span>
              </h1>

              <p>
                Understand transaction patterns, explore
                historical behavior, and make informed payment
                decisions with AI-assisted insights.
              </p>

              <div className="hero-actions">
                <a className="primary-button" href="#protection">
                  Check a payment <span>↗</span>
                </a>
                <a className="secondary-button" href="#checkout">
                  Explore PayPal demo
                </a>
              </div>

              <div className="hero-disclosure">
                Experimental screening · Synthetic data ·
                PayPal Sandbox
              </div>
            </div>

            <div className="hero-art" aria-hidden="true">
              <div className="hero-orbit orbit-one" />
              <div className="hero-orbit orbit-two" />
              <div className="hero-shield">
                <span>✦</span>
              </div>
              <div className="hero-floating-tag">
                <span className="floating-dot" />
                Payment intelligence
              </div>
            </div>
          </section>

          <section className="dashboard-section">
            <div className="section-heading">
              <div>
                <div className="eyebrow">THE INTENTRA APPROACH</div>
                <h2>Clarity at every step</h2>
              </div>
              <p>
                Three capabilities, one more understandable
                payment experience.
              </p>
            </div>

            <div className="capability-grid">
              <article className="capability-card">
                <div className="capability-icon blue">✦</div>
                <span className="capability-number">01 / AI</span>
                <h3>Intelligent screening</h3>
                <p>
                  A trained experimental model identifies
                  patterns that may warrant additional review.
                </p>
              </article>

              <article className="capability-card">
                <div className="capability-icon violet">◷</div>
                <span className="capability-number">02 / HISTORY</span>
                <h3>Behavioral context</h3>
                <p>
                  Compare a sample payment with earlier
                  transactions from a simulated customer.
                </p>
              </article>

              <article className="capability-card">
                <div className="capability-icon teal">✓</div>
                <span className="capability-number">03 / PAYMENTS</span>
                <h3>Sandbox checkout</h3>
                <p>
                  Demonstrate buyer approval and payment
                  capture through the PayPal Sandbox.
                </p>
              </article>
            </div>
          </section>

          <section id="protection" className="dashboard-section">
            <div className="section-heading">
              <div>
                <div className="eyebrow">PAYMENT PROTECTION</div>
                <h2>Understand before you pay</h2>
              </div>
              <p>
                A single view of experimental AI screening
                and historically supported signals.
              </p>
            </div>

            <div className="workspace-card protect-card">
              <AIRiskPanel />
            </div>
          </section>

          <section id="checkout" className="dashboard-section">
            <div className="section-heading">
              <div>
                <div className="eyebrow">PAYPAL INTEGRATION</div>
                <h2>Test the payment journey</h2>
              </div>
              <p>
                An isolated Sandbox experience for
                demonstrating payment processing.
              </p>
            </div>

            <div className="workspace-card checkout-card">
              <PayPalCheckout />
            </div>
          </section>

          <section id="analyst" className="dashboard-section">
            <div className="section-heading">
              <div>
                <div className="eyebrow">ANALYST WORKSPACE</div>
                <h2>Explore rule-based insights</h2>
              </div>
              <p>
                Additional experimental analysis for
                understanding how predefined rules behave.
              </p>
            </div>

            <div className="workspace-card analyst-card">
              <div className="analyst-intro">
                <span className="analyst-tag">RULES ENGINE</span>
                <h3>Transaction analysis lab</h3>
                <p>
                  This independent tool uses manually supplied
                  example data. It is not a live PayPal
                  account-monitoring service.
                </p>
              </div>

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
                    required
                  />
                </label>

                <label>
                  Recent transaction count
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

                <label className="history-field">
                  Previous payment amounts
                  <textarea
                    rows={3}
                    value={historicalAmounts}
                    onChange={(event) =>
                      setHistoricalAmounts(event.target.value)
                    }
                    placeholder="35, 45, 40, 50"
                  />
                </label>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={isAnalyzing}
                >
                  {isAnalyzing
                    ? 'Analyzing...'
                    : 'Run rules analysis'}
                </button>
              </form>

              {analysisError && (
                <p className="analysis-error" role="alert">
                  {analysisError}
                </p>
              )}

              {riskResult && (
                <div className="analysis-result">
                  <h3>Rule-based assessment</h3>
                  <p>
                    Risk score: <strong>
                      {riskResult.risk_score}/100
                    </strong>
                  </p>
                  <p>
                    Risk level: <strong>
                      {riskResult.risk_level.toUpperCase()}
                    </strong>
                  </p>
                  <h4>Detected signals</h4>
                  {riskResult.signals.length ? (
                    <ul>
                      {riskResult.signals.map((signal) => (
                        <li key={signal}>{signal}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No predefined signals detected.</p>
                  )}
                  <p className="disclaimer">
                    {riskResult.disclaimer}
                  </p>
                </div>
              )}

              {behaviorResult && (
                <div className="analysis-result behavior-result">
                  <h3>Manual history comparison</h3>

                  {behaviorResult.status === 'analyzed' ? (
                    <>
                      <p>
                        Historical median: <strong>
                          {behaviorResult.historical_median}
                        </strong>
                      </p>
                      <p>
                        Payment-to-median ratio: <strong>
                          {behaviorResult.amount_ratio}x
                        </strong>
                      </p>
                      <p>
                        Unusual amount: <strong>
                          {behaviorResult.is_unusual
                            ? 'Yes'
                            : 'No'}
                        </strong>
                      </p>
                    </>
                  ) : (
                    <p>Insufficient transaction history.</p>
                  )}

                  <p>{behaviorResult.message}</p>
                  <p className="disclaimer">
                    Illustrative inputs and experimental
                    thresholds. Not proof of fraud.
                  </p>
                </div>
              )}
            </div>
          </section>
        </main>

        <footer className="intentra-footer">
          <span>© Intentra · AI-assisted payment intelligence</span>
          <span>
            Hackathon prototype · Synthetic datasets ·
            PayPal Sandbox
          </span>
        </footer>
      </div>
    </div>
  )
}

export default App
