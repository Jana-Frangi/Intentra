
import type { CSSProperties } from 'react'

type Props = {
  onOpenProtection: () => void
  onOpenCheckout: () => void
}

const steps = [
  {
    number: '01',
    title: 'Prepare a payment',
    detail:
      'Choose a synthetic customer, transaction type, amount, balance, and merchant.',
  },
  {
    number: '02',
    title: 'Understand the recommendation',
    detail:
      'Compare experimental AI screening with historical customer activity and review any alerts.',
  },
  {
    number: '03',
    title: 'Explore PayPal Sandbox',
    detail:
      'Optionally open the separate Sandbox checkout demonstration. It is not linked to the synthetic assessment.',
  },
]

const cardStyle: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f5',
  borderRadius: 16,
  padding: 22,
  minWidth: 0,
}

export default function GuidedPaymentJourney({
  onOpenProtection,
  onOpenCheckout,
}: Props) {
  return (
    <section
      aria-label="Guided payment journey"
      style={{ marginTop: 34, marginBottom: 32 }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
          marginBottom: 22,
        }}
      >
        <div>
          <div className="eyebrow">
            GUIDED DEMONSTRATION
          </div>
          <h2 style={{ margin: '10px 0' }}>
            From payment details to a clearer decision
          </h2>
          <p
            style={{
              color: '#78839b',
              fontSize: 13,
              maxWidth: 580,
              lineHeight: 1.7,
            }}
          >
            Follow a proposed payment through
            screening, explanation, and an optional,
            separate checkout demonstration.
          </p>
        </div>

        <span
          style={{
            alignSelf: 'flex-start',
            borderRadius: 30,
            border: '1px solid #dde5f4',
            background: '#f5f7fe',
            color: '#596b92',
            padding: '9px 13px',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          SYNTHETIC DEMO
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {steps.map((step) => (
          <article key={step.number} style={cardStyle}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#edf0ff',
                color: '#5269ed',
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              {step.number}
            </div>

            <h3
              style={{
                color: '#182547',
                fontSize: 17,
                margin: '20px 0 10px',
              }}
            >
              {step.title}
            </h3>

            <p
              style={{
                color: '#78839b',
                fontSize: 12,
                lineHeight: 1.8,
                margin: 0,
              }}
            >
              {step.detail}
            </p>
          </article>
        ))}
      </div>

      <div
        style={{
          marginTop: 18,
          padding: '22px',
          border: '1px solid #dce5f7',
          borderRadius: 16,
          background: '#f8faff',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ maxWidth: 580 }}>
            <strong
              style={{
                color: '#172344',
                fontSize: 15,
              }}
            >
              Ready to explore Intentra?
            </strong>

            <p
              style={{
                color: '#78839b',
                fontSize: 12,
                lineHeight: 1.7,
                margin: '8px 0 0',
              }}
            >
              Start with a payment safety review.
              After examining the recommendation,
              you can independently explore how
              PayPal Sandbox checkout works.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <button
              type="button"
              className="primary-button"
              onClick={onOpenProtection}
            >
              Start payment review →
            </button>

            <button
              type="button"
              onClick={onOpenCheckout}
              style={{
                padding: '12px 18px',
                background: '#fff',
                color: '#5269ed',
                border: '1px solid #dce5f7',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Explore Sandbox
            </button>
          </div>
        </div>
      </div>

      <p
        style={{
          fontSize: 11,
          color: '#8993a6',
          lineHeight: 1.7,
          marginTop: 14,
        }}
      >
        Intentra's experimental screening uses
        PaySim and IBM TabFormer synthetic data.
        These are separate from the PayPal Sandbox
        checkout. No screening outcome
        automatically authorizes, blocks, or captures
        a payment.
      </p>
    </section>
  )
}
