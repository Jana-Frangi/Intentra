
import { useSyncExternalStore } from 'react'

// Shared selection for our synthetic demo customers.
// Both panels subscribe to the same customer ID.
export const DEMO_CUSTOMERS = [0, 396, 486] as const

export const DEMO_CUSTOMER_NAMES: Record<number, string> = {
  0: 'Alex Morgan',
  396: 'Emma Wilson',
  486: 'Daniel Carter',
}


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

// Keep account initials consistent across the dashboard and welcome screen.
export function demoCustomerInitials(customerId: number): string {
  return (DEMO_CUSTOMER_NAMES[customerId] ?? 'Demo Customer')
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
