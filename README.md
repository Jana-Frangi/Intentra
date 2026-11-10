
# Intentra

### Understand your payments before you make them.

Intentra is a consumer-focused payment intelligence prototype built for the PayPal AI Hackathon.

It combines transparent financial rules, spending-pattern analysis, experimental machine learning, and a conversational AI advisor to help people understand potential concerns before making a payment.

Rather than automatically blocking transactions, Intentra explains what deserves attention and helps users make more informed decisions.

## The Problem

Payment interfaces can tell customers whether a transaction succeeded, but they do not always explain whether a proposed payment is unusual, potentially difficult to fund, or worth reviewing.

A single fraud score also cannot explain the customer's intention or circumstances.

## Our Solution

Intentra brings together four layers:

1. **Rule-based checks** — Identify concrete payment concerns using explicit conditions.
2. **Behavioral intelligence** — Compare proposed payments with a customer's transaction history.
3. **Experimental ML screening** — Provide an additional model-based signal, separate from rule-based findings.
4. **Conversational AI** — Translate available evidence into practical advice and adapt when users provide more context.

The AI explains findings and suggests next steps. It does not independently verify merchants, guarantee payment safety, or automatically block accounts.

## Features

### Consumer Payment Protection
- Enter a proposed payment and available starting balance.
- Review potential payment concerns.
- Explore behavioral insights based on transaction history.
- Receive understandable explanations and suggested precautions.

### Conversational AI Advisor
- Ask questions about a proposed purchase.
- Explain the purpose of a payment.
- Provide additional context in follow-up messages.
- Request detailed figures and calculations when needed.
- Receive recommendations grounded in Intentra's structured assessment.

### PayPal Sandbox Integration
- Create PayPal Sandbox orders.
- Support buyer approval through the Sandbox environment.
- Verify order and capture state through backend integration.

A Sandbox payment was successfully captured and independently reconciled during development.

**Current limitation:** Public browser-triggered capture is disabled in the prototype. The verified server-side capture test should not be confused with a complete public browser checkout flow.

### Demo Transaction History
- Fully synthetic transaction history for three fictional customers.
- Historical spending comparisons.
- Reproducible database initialization.
- No real customer financial information required for the portable demo.

## Architecture

| Component | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Backend | Python, FastAPI |
| Data storage | SQLite |
| Conversational AI | Google Gemini |
| Behavioral analysis | Python |
| Experimental ML | scikit-learn |
| Payment integration | PayPal Sandbox |
| Automated tests | Python unittest |

The backend separates payment analysis, behavioral analysis, ML screening, AI conversation, and PayPal integration into distinct modules.

## Getting Started

### Prerequisites

- Python with compatible versions of the dependencies in `backend/requirements.txt`
- Node.js and npm
- Git
- A Gemini API key for live AI conversations
- PayPal Sandbox credentials for PayPal-related demonstrations

The development environment used Python 3.15.1. Installation on other Python versions and operating systems has not yet been independently verified.

### 1. Clone the repository

    git clone https://github.com/Jana-Frangi/Intentra.git
    cd Intentra

### 2. Configure the backend

Create `backend/.env` using `backend/.env.example` as a template.

Set your own Gemini and PayPal Sandbox credentials. Never commit private credentials.

### 3. Install backend dependencies

On Windows PowerShell:

    py -m venv backend/.venv
    .\backend\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt

### 4. Initialize the synthetic demo database

    .\backend\.venv\Scripts\python.exe scripts/setup_demo.py

This creates `backend/intentra.db` containing:

- 450 synthetic transactions
- 3 fictional customers
- Initialized PayPal order and checkout-session tables

**Important:** The setup script refuses to overwrite an existing database. It is intended for a fresh installation.

### 5. Start the backend

    cd backend
    .\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000 --env-file .env

Backend health check:

    http://127.0.0.1:8000/health

Interactive API documentation:

    http://127.0.0.1:8000/docs

### 6. Configure and start the frontend

Open another terminal at the repository root.

Create `frontend/.env.local` using `frontend/.env.example` as a template.

The frontend PayPal client ID is intended to be public; the PayPal client secret must remain on the backend.

Run:

    cd frontend
    npm install
    npm run dev

Open the local URL displayed by Vite, typically:

    http://localhost:5173

## Running Tests

From the repository root in Windows PowerShell:

    $env:PYTHONPATH = (Join-Path (Get-Location) "backend")
    .\backend\.venv\Scripts\python.exe -m unittest discover -s tests

The development test suite has passed 81 tests.

To check the frontend production build:

    cd frontend
    npm run build

## Main Backend Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Backend health check |
| `POST /analyze` | Rule-based payment analysis |
| `POST /analyze-behavior` | Behavioral analysis |
| `POST /ml/predict` | Experimental ML prediction |
| `POST /behavior/analyze-history` | Historical behavior analysis |
| `GET /history/customer/{customer_id}` | Customer transaction history |
| `POST /advisor/analyze` | Structured advisor analysis |
| `POST /advisor/chat` | Conversational AI |
| `POST /paypal/create-order` | PayPal Sandbox order creation |
| `POST /paypal/order-status` | PayPal order status |
| `POST /paypal/capture-order` | Restricted capture endpoint |

The presence of an API endpoint does not imply that it is enabled for unrestricted public use.

## Data and Model Transparency

The portable demo database is independently generated synthetic data.

The experimental ML model was developed using synthetic payment-fraud data. Its predictions are not calibrated real-world fraud probabilities and must not be treated as definitive judgments.

See `ml/MODEL_NOTICE.md` for model and dataset attribution information.

Intentra distinguishes computed payment findings from unverified statements supplied during an AI conversation.

## Security and Limitations

Intentra is a hackathon prototype, not a production banking or fraud-prevention service.

- No live customer accounts or production payment processing.
- PayPal integration uses the Sandbox environment.
- No automatic account suspension or payment blocking.
- AI outputs may be imperfect and should not replace independent verification.
- Merchant unfamiliarity is not proof of fraud.
- User-supplied information is not automatically independently verified.
- ML predictions are experimental.
- Real-world deployment would require additional security, privacy, compliance, testing, and monitoring controls.

## Future Development

- More comprehensive compliance and audit workflows.
- Better explainability and optional evidence panels.
- Carefully controlled real-time payment assistance.
- Additional payment patterns and customer personalization.
- Security hardening, access controls, and production-grade infrastructure.

## Hackathon

Developed by Jana Franji for the **PayPal AI Hackathon — Build What's Next with PayPal and AI**.

## License

See `LICENSE` for the license covering original project code. Third-party datasets, models, and other dependencies retain their applicable licenses and attribution requirements.
