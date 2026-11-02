
import { useRef, useState } from 'react'
import {
  PayPalProvider,
  PayPalOneTimePaymentButton,
} from '@paypal/react-paypal-js/sdk-v6'

const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID

// SAFETY SWITCH:
// Keep false until backend capture is ready.
const CHECKOUT_ENABLED = false

type CreatedOrder = {
  order_id: string
  status: string
  session_token: string
}

type CaptureResult = {
  order_id: string
  status: string
  capture_id: string
  amount: string
  currency: string
}

export default function PayPalCheckout() {
  const [message, setMessage] = useState('')
  const [paymentComplete, setPaymentComplete] = useState(false)

  // Store the temporary checkout token in memory only.
  const checkoutSession = useRef<{
    orderId: string
    token: string
  } | null>(null)

  if (!clientId) {
    return (
      <section className="analysis-section">
        <div className="eyebrow">PAYPAL SANDBOX</div>

        <h2>Test a PayPal payment</h2>

        <p className="analysis-error">
          PayPal Sandbox Client ID is missing.
        </p>
      </section>
    )
  }

  return (
    <section className="analysis-section">
      <div className="eyebrow">PAYPAL SANDBOX</div>

      <h2>Test a PayPal payment</h2>

      <p>
        Preview a EUR 10.00 payment through PayPal Sandbox.
        No real money is transferred.
      </p>

      {!CHECKOUT_ENABLED && (
        <div style={{ maxWidth: '450px', marginTop: '20px' }}>
          <p style={{ marginBottom: '16px' }}>
            PayPal Sandbox preview — payment disabled.
          </p>

          <PayPalProvider
            clientId={clientId}
            environment="sandbox"
            components={['paypal-payments']}
            pageType="checkout"
          >
            <PayPalOneTimePaymentButton
              disabled={true}
              presentationMode="auto"
              createOrder={async () => {
                throw new Error(
                  'Checkout is disabled in preview mode.'
                )
              }}
              onApprove={async () => {
                throw new Error(
                  'Payment capture is disabled.'
                )
              }}
              onError={() => {
                setMessage(
                  'PayPal preview encountered an error.'
                )
              }}
            />
          </PayPalProvider>
        </div>
      )}

      {CHECKOUT_ENABLED && (
        <div style={{ maxWidth: '450px', marginTop: '25px' }}>
          <PayPalProvider
            clientId={clientId}
            environment="sandbox"
            components={['paypal-payments']}
            pageType="checkout"
          >
            {!paymentComplete && (
              <PayPalOneTimePaymentButton
                presentationMode="auto"
                createOrder={async () => {
                  checkoutSession.current = null
                  setMessage('Creating Sandbox order...')

                  const response = await fetch(
                    '/api/paypal/create-order',
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      cache: 'no-store',
                      body: JSON.stringify({
                        amount: '10.00',
                      }),
                    }
                  )

                  if (!response.ok) {
                    throw new Error(
                      'Failed to create PayPal order.'
                    )
                  }

                  const order: CreatedOrder =
                    await response.json()

                  if (
                    !order.order_id ||
                    order.status !== 'CREATED' ||
                    !order.session_token
                  ) {
                    throw new Error(
                      'Invalid checkout response.'
                    )
                  }

                  checkoutSession.current = {
                    orderId: order.order_id,
                    token: order.session_token,
                  }

                  setMessage(
                    'Complete the test checkout with PayPal.'
                  )

                  return {
                    orderId: order.order_id,
                  }
                }}
                onApprove={async ({ orderId }) => {
                  const session = checkoutSession.current

                  if (
                    !session ||
                    session.orderId !== orderId
                  ) {
                    setMessage(
                      'Checkout authorization is missing. ' +
                      'Please start a new checkout.'
                    )

                    throw new Error(
                      'Checkout session mismatch.'
                    )
                  }

                  setMessage(
                    'Verifying Sandbox payment...'
                  )

                  const response = await fetch(
                    '/api/paypal/capture-order',
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      cache: 'no-store',
                      body: JSON.stringify({
                        order_id: orderId,
                        session_token: session.token,
                      }),
                    }
                  )

                  if (!response.ok) {
                    setMessage(
                      'Payment could not be confirmed. ' +
                      'Please check its status before retrying.'
                    )

                    throw new Error(
                      'Payment confirmation unavailable.'
                    )
                  }

                  const result: CaptureResult =
                    await response.json()

                  const validResult =
                    result.order_id === orderId &&
                    result.status === 'COMPLETED' &&
                    Boolean(result.capture_id) &&
                    result.currency === 'EUR' &&
                    result.amount === '10.00'

                  if (!validResult) {
                    setMessage(
                      'Unexpected payment result. ' +
                      'Please verify the order status.'
                    )

                    throw new Error(
                      'Unexpected payment result.'
                    )
                  }

                  checkoutSession.current = null
                  setPaymentComplete(true)

                  setMessage(
                    'EUR 10.00 Sandbox payment completed!'
                  )
                }}
                onCancel={() => {
                  checkoutSession.current = null

                  setMessage(
                    'Checkout cancelled. ' +
                    'No payment was confirmed.'
                  )
                }}
                onError={() => {
                  setMessage(
                    'PayPal Checkout encountered an error. ' +
                    'Please verify the payment status.'
                  )
                }}
              />
            )}
          </PayPalProvider>
        </div>
      )}

      {message && (
        <p
          role="status"
          style={{ marginTop: '20px' }}
        >
          {message}
        </p>
      )}
    </section>
  )
}
