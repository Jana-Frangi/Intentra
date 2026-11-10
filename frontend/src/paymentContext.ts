
import { useSyncExternalStore } from "react";

export type PaymentContext = {
  transactionType: string;
  amount: string;
  balance: string;
  merchantId: string;
};

let payment: PaymentContext = {
  transactionType: "TRANSFER",
  amount: "1500",
  balance: "1500",
  merchantId: "DEMO_NEW_MERCHANT",
};

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): PaymentContext {
  return payment;
}

function updatePayment(
  changes: Partial<PaymentContext>
) {
  const next = {
    ...payment,
    ...changes,
  };

  const unchanged = (
    next.transactionType === payment.transactionType &&
    next.amount === payment.amount &&
    next.balance === payment.balance &&
    next.merchantId === payment.merchantId
  );

  if (unchanged) return;

  payment = next;

  listeners.forEach((listener) => listener());
}

export function usePaymentContext() {
  const current = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );

  return {
    ...current,

    setTransactionType: (value: string) =>
      updatePayment({ transactionType: value }),

    setAmount: (value: string) =>
      updatePayment({ amount: value }),

    setBalance: (value: string) =>
      updatePayment({ balance: value }),

    setMerchantId: (value: string) =>
      updatePayment({ merchantId: value }),
  };
}
