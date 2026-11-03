
import { useSyncExternalStore } from 'react'

// Shared selection for our synthetic demo customers.
// Both panels subscribe to the same customer ID.
export const DEMO_CUSTOMERS = [0, 396, 486] as const

let selectedCustomer = 0

const subscribers = new Set<() => void>()

function subscribe(callback: () => void) {
  subscribers.add(callback)

  return () => {
    subscribers.delete(callback)
  }
}

function getSnapshot(): number {
  return selectedCustomer
}

export function setDemoCustomer(customerId: number) {
  if (!DEMO_CUSTOMERS.some((id) => id === customerId)) {
    return
  }

  if (customerId === selectedCustomer) {
    return
  }

  selectedCustomer = customerId

  subscribers.forEach((callback) => callback())
}

export function useDemoCustomer(): [
  number,
  (id: number) => void
] {
  const customerId = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  )

  return [customerId, setDemoCustomer]
}
