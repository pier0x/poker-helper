export interface Player {
  id: string
  name: string
  buyIns: number[]      // can have multiple re-buys
  finalBalance: number
}

export interface Transaction {
  from: string
  to: string
  amount: number
}

export interface PlayerSummary {
  name: string
  totalBuyIn: number
  finalBalance: number
  net: number   // positive = profited, negative = lost
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Greedy debt-settling algorithm.
 * Produces the minimum number of transactions to settle all debts.
 */
export function calculateSettlement(players: Player[]): {
  transactions: Transaction[]
  summaries: PlayerSummary[]
} {
  const summaries: PlayerSummary[] = players.map(p => {
    const totalBuyIn = round2(p.buyIns.reduce((s, b) => s + b, 0))
    return {
      name: p.name.trim() || 'Player',
      totalBuyIn,
      finalBalance: p.finalBalance,
      net: round2(p.finalBalance - totalBuyIn),
    }
  })

  // Debtors owe money (net < 0), creditors receive money (net > 0)
  const debtors  = summaries.filter(p => p.net < -0.005).map(p => ({ name: p.name, amount: -p.net }))
  const creditors = summaries.filter(p => p.net > 0.005).map(p => ({ name: p.name, amount: p.net }))

  // Sort largest first for cleaner matching
  debtors.sort((a, b) => b.amount - a.amount)
  creditors.sort((a, b) => b.amount - a.amount)

  const transactions: Transaction[] = []
  let i = 0, j = 0

  while (i < debtors.length && j < creditors.length) {
    const amount = round2(Math.min(debtors[i].amount, creditors[j].amount))
    if (amount > 0.005) {
      transactions.push({ from: debtors[i].name, to: creditors[j].name, amount })
    }
    debtors[i].amount  = round2(debtors[i].amount  - amount)
    creditors[j].amount = round2(creditors[j].amount - amount)
    if (debtors[i].amount  < 0.005) i++
    if (creditors[j].amount < 0.005) j++
  }

  return { transactions, summaries }
}
