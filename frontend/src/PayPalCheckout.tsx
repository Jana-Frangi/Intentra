
import { useRef, useState } from 'react'
import {
  PayPalProvider,
  PayPalOneTimePaymentButton,
} from '@paypal/react-paypal-js/sdk-v6'

const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID

type CreatedOrder = {
  order_id: string
  status: string
  session_token: string
}

type CaptureResult = {
  order_id: string
  status: string
  capture_id?: string
  amount?: string
  currency?: string
}

type OrderStatus = {
  order_id: string
  status: string
  amount: string
  currency: string
}

type CheckoutPhase =
  | 'idle'
  | 'processing'
  | 'completed'
  | 'review'

type Session = {
  orderId: string
  token: string
}

export default function PayPalCheckout() {
  const [phase, setPhase] = useState<CheckoutPhase>('idle')
  const [message, setMessage] = useState('')
  const [orderId, setOrderId] = useState('')
  const [captureId, setCaptureId] = useState('')

  const checkoutSession = useRef<Session | null>(null)
  const captureAttempted = useRef(false)

  async function checkOrderStatus(session: Session) {
    const response = await fetch('/api/paypal/order-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({
        order_id: session.orderId,
        session_token: session.token,
      }),
    })

    if (!response.ok) {
      throw new Error('Order status could not be retrieved.')
    }

    const result: OrderStatus = await response.json()

    if (result.order_id !== session.orderId) {
      throw new Error('Order status did not match the checkout.')
    }

    return result
  }

  function showCompleted(result?: CaptureResult) {
    setPhase('completed')
    setCaptureId(result?.capture_id ?? '')
    setMessage(
      'Sandbox payment completed and recorded successfully.'
    )
  }

  async function refreshStatus() {
    const session = checkoutSession.current

    if (!session) {
      setMessage('Checkout session is unavailable.')
      return
    }

    setMessage('Checking recorded payment status...')

    try {
      const result = await checkOrderStatus(session)

      if (result.status === 'COMPLETED') {
        showCompleted()
      } else {
        setPhase('review')
        setMessage(
          `Recorded status: ${result.status}. ` +
          'Do not start another payment for this order. ' +
          'This screen cannot safely retry capture.'
        )
      }
    } catch {
      setPhase('review')
      setMessage(
        'Could not verify the payment status. ' +
        'The checkout session may have expired. ' +
        'Do not retry payment until the outcome is confirmed.'
      )
    }
  }

  if (!clientId) {
    return (
      <section className="analysis-section">
        <div className="eyebrow">PAYPAL SANDBOX</div>
        <h2>PayPal checkout</h2>
        <p className="analysis-error">
          PayPal Sandbox Client ID is missing.
        </p>
      </section>
    )
  }

  return (
    <section className="analysis-section">
      <div className="eyebrow">PAYPAL SANDBOX</div>

      <h2>Secure Sandbox checkout</h2>

      <p>
        Test a EUR 10.00 PayPal Sandbox payment
        through Intentra.
      </p>

      <p>
        This is a test environment. No real money
        will be transferred.
      </p>

      <div style={{ maxWidth: '450px', marginTop: '25px' }}>
        <PayPalProvider
          clientId={clientId}
          environment="sandbox"
          components={['paypal-payments']}
          pageType="checkout"
        >
          {phase === 'idle' && (
            <PayPalOneTimePaymentButton
              presentationMode="auto"
              createOrder={async () => {
                checkoutSession.current = null
                captureAttempted.current = false
                setOrderId('')
                setCaptureId('')
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

                setOrderId(order.order_id)
                setMessage(
                  'Please approve the payment using ' +
                  'your Sandbox buyer account.'
                )

                return {
                  orderId: order.order_id,
                }
              }}
              onApprove={async ({ orderId: approvedId }) => {
                const session = checkoutSession.current

                if (
                  !session ||
                  session.orderId !== approvedId
                ) {
                  setPhase('review')
                  setMessage(
                    'Buyer approval received, but the ' +
                    'checkout session did not match. ' +
                    'No capture request was sent.'
                  )
                  return
                }

                setOrderId(approvedId)
                setPhase('processing')
                setMessage(
                  'Approval received. Processing Sandbox payment...'
                )

                captureAttempted.current = true

                try {
                  const response = await fetch(
                    '/api/paypal/capture-order',
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      cache: 'no-store',
                      body: JSON.stringify({
                        order_id: session.orderId,
                        session_token: session.token,
                      }),
                    }
                  )

                  const result: CaptureResult =
                    await response.json()

                  if (
                    response.ok &&
                    result.order_id === session.orderId &&
                    result.status === 'COMPLETED'
                  ) {
                    showCompleted(result)
                    return
                  }
                } catch {
                  // The request may have reached the server.
                  // Never infer that payment failed.
                }

                // A missing or unsuccessful response does not
                // prove that the capture failed.
                try {
                  const status = await checkOrderStatus(session)

                  if (status.status === 'COMPLETED') {
                    showCompleted()
                    return
                  }

                  setPhase('review')
                  setMessage(
                    `Recorded status: ${status.status}. ` +
                    'Payment completion is not confirmed. ' +
                    'Do not retry this checkout automatically.'
                  )
                } catch {
                  setPhase('review')
                  setMessage(
                    'Payment outcome could not be confirmed. ' +
                    'Do not repeat the payment. ' +
                    'Check the order status before proceeding.'
                  )
                }
              }}
              onCancel={() => {
                if (captureAttempted.current) {
                  return
                }

                checkoutSession.current = null
                setOrderId('')
                setMessage(
                  'Buyer cancelled checkout before ' +
                  'Intentra requested capture.'
                )
              }}
              onError={() => {
                if (captureAttempted.current) {
                  // Preserve the capture/status outcome.
                  return
                }

                setMessage(
                  'PayPal checkout encountered an error ' +
                  'before Intentra requested capture.'
                )
              }}
            />
          )}
        </PayPalProvider>

        {phase === 'processing' && (
          <div className="analysis-result">
            <h3>Processing payment</h3>
            <p>
              Your Sandbox payment is being verified.
              Please do not repeat the checkout.
            </p>
          </div>
        )}

        {phase === 'completed' && (
          <div className="analysis-result">
            <h3>Payment completed</h3>
            <p>
              Sandbox payment: <strong>EUR 10.00</strong>
            </p>
            <p>
              Status: <strong>COMPLETED</strong>
            </p>
            <p>
              Order ID: <strong>{orderId}</strong>
            </p>
            {captureId && (
              <p>
                Capture ID: <strong>{captureId}</strong>
              </p>
            )}
          </div>
        )}

        {phase === 'review' && (
          <div className="analysis-result">
            <h3>Payment status needs verification</h3>
            <p>
              Order ID: <strong>{orderId || 'Unavailable'}</strong>
            </p>
            <p>
              Do not create a replacement payment
              until this order has been checked.
            </p>
            <button
              type="button"
              onClick={refreshStatus}
            >
              Check recorded status
            </button>
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
