
import { useState } from 'react'
import {
  PayPalProvider,
  PayPalOneTimePaymentButton,
} from '@paypal/react-paypal-js/sdk-v6'

const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID

type CaptureResult = {
  order_id: string
  status: string
  captures: {
    capture_id: string
    status: string
    amount: {
      currency_code: string
      value: string
    }
  }[]
}

export default function PayPalCheckout() {
  const [message, setMessage] = useState('')
  const [paymentComplete, setPaymentComplete] = useState(false)

  if (!clientId) {
    return (
      <p className="analysis-error">
        PayPal Sandbox Client ID is missing.
      </p>
    )
  }

  return (
    <section className="analysis-section">
      <div className="eyebrow">PAYPAL SANDBOX</div>

      <h2>Test a PayPal payment</h2>

      <p>
        Complete a simulated €10.00 payment using your
        PayPal Sandbox buyer account. No real money is transferred.
      </p>

      <div style={{ maxWidth: '450px', marginTop: '25px' }}>
        <PayPalProvider
          clientId={clientId}
          environment="sandbox"
          pageType="checkout"
        >
          {!paymentComplete && (
            <PayPalOneTimePaymentButton
              presentationMode="auto"
              createOrder={async () => {
                setMessage('Creating Sandbox order...')

                const response = await fetch(
                  '/api/paypal/create-order',
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      amount: '10.00',
                    }),
                  }
                )

                if (!response.ok) {
                  throw new Error('Failed to create PayPal order.')
                }

                const order = await response.json()

                setMessage('Complete the test checkout with PayPal.')

                return { orderId: order.order_id }
              }}
              onApprove={async ({ orderId }) => {
                setMessage('Verifying Sandbox payment...')

                const response = await fetch(
                  '/api/paypal/capture-order',
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ order_id: orderId }),
                  }
                )

                if (!response.ok) {
                  throw new Error('Payment capture failed.')
                }

                const result: CaptureResult = await response.json()

                const completedCapture = result.captures.some(
                  (capture) =>
                    capture.status === 'COMPLETED' &&
                    capture.amount.currency_code === 'EUR' &&
                    capture.amount.value === '10.00'
                )

                if (
                  result.status !== 'COMPLETED' ||
                  !completedCapture
                ) {
                  throw new Error(
                    'PayPal did not confirm the expected payment.'
                  )
                }

                setPaymentComplete(true)
                setMessage('€10.00 Sandbox payment completed!')
              }}
              onCancel={() => {
                setMessage('Payment cancelled. No payment captured.')
              }}
              onError={() => {
                setMessage(
                  'PayPal Checkout encountered an error. ' +
                  'Please check the backend terminal.'
                )
              }}
            />
          )}
        </PayPalProvider>

        {message && (
          <p role="status" style={{ marginTop: '20px' }}>
            {message}
          </p>
        )}
      </div>
    </section>
  )
}
