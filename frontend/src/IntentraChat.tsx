
import { useState, type FormEvent } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AdvisorResponse = {
  reply: string;
  model: string;
  generated: boolean;
  assessment_status: string;
  synthetic_demo: boolean;
};

const panelStyle: React.CSSProperties = {
  background: "#101b35",
  border: "1px solid #2b3a5a",
  borderRadius: 22,
  padding: 24,
  color: "#f3f6ff",
  width: "100%",
  boxSizing: "border-box",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #394966",
  background: "#172641",
  color: "#ffffff",
  fontSize: 14,
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#aebcda",
  marginBottom: 7,
};

const primaryButton: React.CSSProperties = {
  padding: "12px 20px",
  background: "#6278f7",
  color: "#ffffff",
  border: "none",
  borderRadius: 11,
  fontWeight: 700,
  cursor: "pointer",
};

export default function IntentraChat() {
  const [transactionType, setTransactionType] =
    useState("DEBIT");

  const [amount, setAmount] = useState("3000");
  const [balance, setBalance] = useState("200");

  const [merchant, setMerchant] = useState(
    "DEMO_NEW_MERCHANT"
  );

  const [question, setQuestion] = useState("");

  const [messages, setMessages] = useState<
    ChatMessage[]
  >([]);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [lastModel, setLastModel] = useState("");

  async function sendMessage(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const message = question.trim();

    if (!message || sending) return;

    const paymentAmount = Number(amount);
    const paymentBalance = Number(balance);

    if (
      !Number.isFinite(paymentAmount) ||
      paymentAmount <= 0 ||
      !Number.isFinite(paymentBalance) ||
      paymentBalance < 0
    ) {
      setError(
        "Enter a positive amount and a nonnegative balance."
      );
      return;
    }

    if (!merchant.trim()) {
      setError(
        "Enter a recipient or merchant identifier."
      );
      return;
    }

    const previousMessages = messages.slice(-12);

    setError("");
    setSending(true);
    setQuestion("");

    try {
      const response = await fetch(
        "/api/advisor/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transaction_type: transactionType,
            amount: paymentAmount,
            starting_balance: paymentBalance,
            merchant_id: merchant.trim(),
            message,
            conversation: previousMessages,
          }),
        }
      );

      if (!response.ok) {
        let detail = "";

        try {
          const failure = await response.json();

          if (typeof failure.detail === "string") {
            detail = failure.detail;
          }
        } catch {
          // Use a safe generic error below.
        }

        throw new Error(
          detail ||
            `The advisor could not respond (HTTP ${response.status}).`
        );
      }

      const data: AdvisorResponse =
        await response.json();

      if (
        !data.generated ||
        typeof data.reply !== "string" ||
        !data.reply.trim()
      ) {
        throw new Error(
          "The AI service returned an invalid response."
        );
      }

      setMessages((current) => [
     ...current,
    { role: "user", content: message },
    { role: "assistant", content: data.reply },
    ]);

      setLastModel(data.model || "AI model");
    } catch (caught) {
      const messageText =
        caught instanceof Error
          ? caught.message
          : "An unexpected error occurred.";

      setError(messageText);

      // Restore the question so the user
      // can retry without retyping.
      setQuestion(message);
    } finally {
      setSending(false);
    }
  }

  function startNewConversation() {
    if (sending) return;

    setMessages([]);
    setQuestion("");
    setError("");
    setLastModel("");
  }
  
  function resetPaymentConversation() {
    setMessages([]);
    setQuestion("");
    setError("");
    setLastModel("");
  }

  return (
    <section style={panelStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              color: "#96aaff",
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            ✦ INTENTRA INTELLIGENCE
          </div>

          <h2
            style={{
              fontSize: 23,
              margin: 0,
              color: "#ffffff",
            }}
          >
            Talk to your AI payment advisor
          </h2>
        </div>

        <button
          type="button"
          onClick={startNewConversation}
          disabled={sending}
          style={{
            ...primaryButton,
            background: "#263653",
            fontSize: 12,
            opacity: sending ? 0.5 : 1,
          }}
        >
          New conversation
        </button>
      </div>

      <p
        style={{
          color: "#aebcda",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        Ask about a proposed payment, explain
        what you're buying, or follow up on a
        concern. Intentra uses your synthetic
        demo history and experimental payment
        analysis to support its response.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(145px, 1fr))",
          gap: 12,
          marginTop: 20,
          marginBottom: 20,
        }}
      >
        <div>
          <label style={labelStyle}>
            Transaction type
          </label>

          <select
            value={transactionType}
            onChange={(event) => {
                setTransactionType(event.target.value);
                resetPaymentConversation();
            }}
            disabled={sending}
            style={inputStyle}
          >
            <option value="TRANSFER">Transfer</option>
            <option value="PAYMENT">Payment</option>
            <option value="DEBIT">Debit</option>
            <option value="CASH_OUT">Cash out</option>
            <option value="CASH_IN">Cash in</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>
            Amount (demo units)
          </label>

          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            disabled={sending}
            onChange={(event) => {
                setAmount(event.target.value);
                resetPaymentConversation();
                }}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Starting balance
          </label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={balance}
            disabled={sending}
            onChange={(event) => {
                setBalance(event.target.value);
                resetPaymentConversation();
            }}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Merchant / recipient ID
          </label>

          <input
            type="text"
            maxLength={200}
            value={merchant}
            disabled={sending}
            onChange={(event) => {
                setMerchant(event.target.value);
                resetPaymentConversation();
                }}
            style={inputStyle}
          />
        </div>
      </div>

      <div
        aria-live="polite"
        style={{
          background: "#0b1429",
          border: "1px solid #253653",
          borderRadius: 15,
          padding: 16,
          minHeight: 210,
          maxHeight: 430,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 13,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              color: "#aebcda",
              lineHeight: 1.7,
              margin: "auto 0",
            }}
          >
            <div
              style={{
                fontSize: 25,
                marginBottom: 10,
              }}
            >
              ✦
            </div>

            <strong
              style={{ color: "#ffffff" }}
            >
              Welcome to Intentra, Alex.
            </strong>

            <p>
              Tell me about a proposed payment
              or ask a question to begin.
            </p>

            <p style={{ fontSize: 12 }}>
              Example: "I'm buying a laptop for
              university. Does this payment
              look unusual?"
            </p>
          </div>
        )}

        {messages.map((item, index) => {
          const isUser = item.role === "user";

          return (
            <div
              key={index}
              style={{
                alignSelf: isUser
                  ? "flex-end"
                  : "flex-start",
                maxWidth: "88%",
                background: isUser
                  ? "#364da1"
                  : "#1d2d49",
                padding: "12px 15px",
                borderRadius: 13,
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                lineHeight: 1.6,
                fontSize: 14,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  marginBottom: 5,
                  color: "#c7d1ff",
                }}
              >
                {isUser
                  ? "YOU"
                  : "INTENTRA AI"}
              </div>

              {item.content}
            </div>
          );
        })}

        {sending && (
          <div
            style={{
              alignSelf: "flex-start",
              background: "#1d2d49",
              padding: "12px 15px",
              borderRadius: 13,
              color: "#b8c6e8",
              fontSize: 13,
            }}
          >
            Intentra is reviewing the
            available evidence...
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: "#42283a",
            border: "1px solid #a65a76",
            borderRadius: 11,
            padding: 12,
            marginTop: 14,
            color: "#ffe0e8",
            fontSize: 13,
          }}
        >
          <strong>AI service unavailable</strong>
          <div style={{ marginTop: 5 }}>
            {error}
          </div>
          <div style={{ marginTop: 6 }}>
            Your existing payment analysis
            is still available.
          </div>
        </div>
      )}

      <form
        onSubmit={sendMessage}
        style={{
          display: "flex",
          gap: 10,
          marginTop: 16,
          alignItems: "stretch",
        }}
      >
        <input
          type="text"
          value={question}
          maxLength={2000}
          disabled={sending}
          onChange={(event) =>
            setQuestion(event.target.value)
          }
          placeholder="Ask Intentra about this payment..."
          aria-label="Your question for Intentra"
          style={{
            ...inputStyle,
            flex: 1,
            minWidth: 0,
          }}
        />

        <button
          type="submit"
          disabled={
            sending || !question.trim()
          }
          style={{
            ...primaryButton,
            opacity:
              sending || !question.trim()
                ? 0.5
                : 1,
          }}
        >
          {sending ? "..." : "Send"}
        </button>
      </form>

      <div
        style={{
          fontSize: 11,
          color: "#8999b9",
          lineHeight: 1.7,
          marginTop: 14,
        }}
      >
        Synthetic demonstration only.
        Not a guarantee of payment safety
        or a payment authorization.
        {lastModel && (
          <span>
            {" "}
            Last AI model: {lastModel}.
          </span>
        )}
      </div>
    </section>
  );
}
