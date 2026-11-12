# Intentra — Understand Before You Pay

**Understand your payments before you make them.**

Intentra is a consumer-focused payment intelligence prototype built for the **PayPal AI Hackathon 2026**.

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
- Inspect supporting evidence through the **"Why this advice? See the numbers"** panel.

### Preferred Currency Display

- Supports EUR, USD, GBP, AED, and LBP preferences.
- Shares the selected preference across relevant payment and advisor interfaces.
- Changing the preference clears outdated analysis results without changing the entered payment amount.
- Historical and analyzed amounts remain synthetic demo units.
- Currency conversion is not currently implemented.

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

### Analyst Tools

- Independent rule-based transaction assessment.
- Explainable risk signals.
- Manual comparisons with transaction history.
- Supporting analysis separate from the consumer payment experience.

## Architecture

| Component | Technology |
|---|---|
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

```powershell
git clone https://github.com/Jana-Frangi/Intentra.git
cd Intentra
```

### 2. Configure the backend

Create `backend/.env` using `backend/.env.example` as a template.

Set your own Gemini and PayPal Sandbox credentials. Never commit private credentials.

### 3. Install backend dependencies

On Windows PowerShell:

```powershell
py -m venv backend/.venv
.\backend\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
```

### 4. Initialize the synthetic demo database

```powershell
.\backend\.venv\Scripts\python.exe scripts/setup_demo.py
```

This creates `backend/intentra.db` containing:

- 450 synthetic transactions
- 3 fictional customers
- Initialized PayPal order and checkout-session tables

**Important:** The setup script refuses to overwrite an existing database. It is intended for a fresh installation.

### 5. Start the backend

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000 --env-file .env
```

Backend health check:

http://127.0.0.1:8000/health

Interactive API documentation:

http://127.0.0.1:8000/docs

### 6. Configure and start the frontend

Open another terminal at the repository root.

Create `frontend/.env.local` using `frontend/.env.example` as a template.

The frontend PayPal client ID is intended to be public; the PayPal client secret must remain on the backend.

Run:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite, typically:

http://localhost:5173

## Running Tests

From the repository root in Windows PowerShell:

```powershell
$env:PYTHONPATH = (Join-Path (Get-Location) "backend")
.\backend\.venv\Scripts\python.exe -m unittest discover -s tests
```

The development test suite has passed 81 tests.

To check the frontend production build:

```powershell
cd frontend
npm run build
```

## Main Backend Endpoints

| Endpoint | Purpose |
|---|---|
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

The experimental ML model was developed using synthetic PaySim payment-fraud data. Its predictions are not calibrated real-world fraud probabilities and must not be treated as definitive judgments.

The deployed V3 experimental model achieved the following results on the held-out synthetic PaySim test period:

| Metric | Result |
|---|---|
| Average precision | 0.985912 |
| ROC AUC | 0.999955 |
| Precision | Approximately 96.88% |
| Recall | Approximately 84.14% |

These figures are specific to the synthetic dataset and do not establish equivalent performance in real-world payment environments.

A separate V4 experiment investigated the model's sensitivity around full-balance transfers. V4 performed worse on held-out synthetic data, so V3 remains deployed. Further investigation and model robustness testing remain future priorities.

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
- Preferred currencies are display preferences, not live conversions.
- Real-world deployment would require additional security, privacy, compliance, testing, and monitoring controls.

## Future Development

Intentra's long-term vision is to evolve from a standalone prototype into a secure, explainable payment decision-support layer that could integrate with existing banking applications, digital wallets, and payment platforms.

### 1. Multi-Bank and Digital Wallet Integration

Allow users to securely connect multiple banks and digital wallets through supported Open Banking APIs and authorized financial-data providers.

Potential capabilities:

- A unified view of balances and transaction activity across connected accounts.
- Cross-account spending analysis and financial insights.
- Privacy-conscious aggregation with explicit user consent.
- Centralized payment intelligence without replacing banking applications.

**Current status:** Intentra does not connect to real bank accounts.

### 2. Intelligent Payment-Source Recommendations

Help users decide which connected bank account, wallet, or payment method may be most suitable for a proposed transaction.

Recommendations could consider:

- Available balances and funding requirements.
- Transaction and currency-conversion fees.
- Payment limits and processing conditions.
- Historical spending patterns.
- Payment purpose and available risk evidence.

For example, a consumer with accounts at Bank A, Bank B, and Bank C could compare available payment options and receive an explanation of which account may be more suitable.

The final decision would remain with the user.

### 3. Transparent Fees and Cross-Border Payment Intelligence

Extend Intentra's decision support beyond unusual payment patterns.

Potential capabilities:

- Comparing sender and recipient fees.
- Explaining currency conversion costs using verified exchange-rate information.
- Highlighting cross-border payment considerations.
- Making the total expected cost of a payment easier to understand.

### 4. Personalized Behavioral Intelligence

Improve analysis through carefully validated, user-specific financial patterns.

Possible developments:

- Adaptive spending baselines.
- Context-aware transaction comparisons.
- More personalized verification recommendations.
- Improved treatment of unusual but legitimate transactions.
- Privacy-preserving learning and appropriate consent controls.

### 5. More Robust and Explainable Machine Learning

Strengthen the experimental ML screening pipeline through:

- Further investigation of full-balance-transfer sensitivity.
- Better calibration and robustness evaluation.
- Analysis of false positives and false negatives.
- Evaluation on more representative datasets.
- Model drift monitoring.
- Clearer explanations of model behavior.

Real-world deployment would require independent validation beyond synthetic data.

### 6. Payment Intent Verification and Traceability

Explore mechanisms to compare a user's originally approved payment details with the transaction that is ultimately processed.

Potential capabilities include:

- Recipient and amount consistency checks.
- Auditable payment authorization records.
- Payment traceability and transaction integrity verification.
- Additional verification prompts when important details change.

### 7. Compliance, Security, and Production Readiness

Develop the infrastructure required for responsible financial integration:

- Strong authentication and authorization.
- Secure financial-data handling.
- Audit trails and monitoring.
- Privacy and regulatory compliance assessments.
- Expanded automated and end-to-end testing.
- Controlled production payment integrations.

### 8. Integration into Existing Payment Experiences

Rather than requiring consumers to open a separate application before every payment, Intentra could eventually operate as an intelligence layer within existing banking applications, digital wallets, or payment platforms.

The goal is to make relevant guidance available at the moment a financial decision is made.

**All the developments above are proposed future directions and are not implemented in the current hackathon prototype.**

## Acknowledgments

I would like to express my sincere gratitude to **Mr. Alex Axiotiadis and Mr. David Norman**, associated with **JUNO and JunoSolutions CY Enterprises Ltd**, for generously sharing their time, industry experience, and valuable fintech perspectives during the planning and development of Intentra.

Their guidance helped me appreciate the importance of combining traditional rule-based systems with artificial intelligence, defining clear business logic before introducing advanced AI, understanding practical payment risks, and balancing consumer protection with a positive user experience.

Their encouragement to approach fintech not only as a technical engineering challenge but also as a real-world commercial problem was especially valuable in shaping Intentra's direction.

I am grateful for their willingness to share insights and provide feedback throughout this journey.

**Intentra was independently conceived, designed, and developed by Jana Franji.** The contributions acknowledged above were advisory and do not imply official sponsorship, development involvement, certification, or endorsement by the individuals' organizations.

## Hackathon

Developed by **Jana Franji** for the **PayPal AI Hackathon 2026 — Build What's Next with PayPal and AI**.

## License

See [LICENSE](LICENSE) for the MIT License covering original project code.

Third-party datasets, models, libraries, and other dependencies retain their applicable licenses and attribution requirements.
