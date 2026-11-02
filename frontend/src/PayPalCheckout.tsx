
import { useRef, useState } from 'react'
import {
  PayPalProvider,
  PayPalOneTimePaymentButton,
} from '@paypal/react-paypal-js/sdk-v6'

const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID

// Approval-only test mode.
// No payment capture is allowed in this component.
const APPROVAL_TEST_ENABLED = true

type CreatedOrder = {
  order_id: string
  status: string
  session_token: string
}

export default function PayPalCheckout() {
  const [message, setMessage] = useState('')
  const [approved, setApproved] = useState(false)
  const [approvedOrderId, setApprovedOrderId] = useState('')

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

      <h2>PayPal checkout test</h2>

      <p>
        Test buyer approval for an EUR 10.00
        PayPal Sandbox order.
      </p>

      <p role="status">
        Approval-only mode. Payment capture is disabled.
        Approval does not mean the payment was completed.
      </p>

      <div style={{ maxWidth: '450px', marginTop: '25px' }}>
        <PayPalProvider
          clientId={clientId}
          environment="sandbox"
          components={['paypal-payments']}
          pageType="checkout"
        >
          {!approved && (
            <PayPalOneTimePaymentButton
              disabled={!APPROVAL_TEST_ENABLED}
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
                  setMessage('Order creation failed.')
                  throw new Error('Order creation failed.')
                }

                const order: CreatedOrder =
                  await response.json()

                if (
                  !order.order_id ||
                  order.status !== 'CREATED' ||
                  !order.session_token
                ) {
                  setMessage('Invalid order response.')
                  throw new Error('Invalid order response.')
                }

                checkoutSession.current = {
                  orderId: order.order_id,
                  token: order.session_token,
                }

                setMessage(
                  'Sign in with your Sandbox buyer account.'
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
                    'Approval received, but the checkout ' +
                    'session could not be verified.'
                  )
                  throw new Error(
                    'Checkout session mismatch.'
                  )
                }

                setApprovedOrderId(orderId)
                setApproved(true)

                setMessage(
                  'Buyer approval received. ' +
                  'Payment has NOT been captured.'
                )

                // Intentionally no capture request.
              }}
              onCancel={() => {
                checkoutSession.current = null
                setMessage(
                  'Checkout cancelled. ' +
                  'No payment was captured.'
                )
              }}
              onError={() => {
                setMessage(
                  'PayPal checkout encountered an error. ' +
                  'No capture request was sent by Intentra.'
                )
              }}
            />
          )}
        </PayPalProvider>

        {approved && (
          <div className="analysis-result">
            <h3>Sandbox buyer approval received</h3>

            <p>
              Order ID: <strong>{approvedOrderId}</strong>
            </p>

            <p>
              Payment status: <strong>NOT CAPTURED</strong>
            </p>

            <p>
              Intentra has not requested payment capture.
            </p>
          </div>
        )}

        {message && (
          <p role="status" style={{ marginTop: '20px' }}>
            {message}
          </p>
        )}
      </div>
    </section>
  )
}
