export interface ChipAllocation {
  denomination: number
  quantity: number
  valuePerChip: number
  totalValue: number
}

export interface Combination {
  id: string
  name: string
  allocations: ChipAllocation[]
  targetTotal: number
  actualTotal: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Nice multiples to use for chip values (as multipliers of smallBlind)
// e.g. SB=0.10 → [0.10, 0.20, 0.50, 1.00, 2.00, 5.00, 10.00, ...]
const NICE_MULTIPLIERS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]

/**
 * STEP 1: Assign a dollar value to each chip position.
 * - Chip 0 (smallest) = smallBlind
 * - Chip 1            = bigBlind
 * - Chip 2..n-1       = next nice multiples of smallBlind after bigBlind
 */
export function assignChipValues(n: number, smallBlind: number, bigBlind: number): number[] {
  if (n === 0) return []
  if (n === 1) return [smallBlind]

  const values: number[] = [smallBlind, bigBlind]
  const niceValues = NICE_MULTIPLIERS.map(m => round2(m * smallBlind))

  let prev = bigBlind
  for (let i = 2; i < n; i++) {
    const next = niceValues.find(v => v > prev && !values.includes(v))
    if (next !== undefined) {
      values.push(next)
      prev = next
    } else {
      // Fallback: keep doubling
      const fallback = round2(prev * 2)
      values.push(fallback)
      prev = fallback
    }
  }

  return values
}

/**
 * STEP 2: Given chip values, compute how many of each chip to give out
 * so the total equals buyIn exactly.
 *
 * Strategy: fix quantities for chips[1..n-1] (all except smallest),
 * then the smallest chip absorbs the exact remainder.
 * Works perfectly when all values are integer multiples of smallBlind
 * and buyIn is also a multiple of smallBlind.
 */
function computeQuantityCombinations(
  n: number,
  values: number[],
  buyIn: number
): { quantities: number[]; name: string }[] {
  // Work in units of the smallest chip value to get clean integer math
  const v0 = values[0]
  const units = values.map(v => round2(v / v0))   // e.g. [1, 2, 5, 10, 20, 50]
  const N = round2(buyIn / v0)                     // e.g. 200 for $20 buy-in with $0.10 SB

  // Each pattern specifies quantities for [largest chip, 2nd largest, 3rd largest, ...]
  // i.e. chips[n-1], chips[n-2], chips[n-3], ...
  // The smallest chip (chips[0]) is computed from the remainder.
  const PATTERNS: { name: string; qtys: number[] }[] = [
    { name: 'Balanced',    qtys: [1, 2, 4, 6, 10, 15, 25, 40] },
    { name: 'Heavy Small', qtys: [1, 2, 3, 5,  8, 12, 20, 32] },
    { name: 'Compact',     qtys: [1, 1, 2, 4,  7, 11, 18, 28] },
  ]

  const results: { quantities: number[]; name: string }[] = []

  for (const { name, qtys } of PATTERNS) {
    const q = new Array(n).fill(0)
    let unitsUsed = 0

    // Assign from largest (n-1) down to chip[1]
    for (let pos = 0; pos < n - 1; pos++) {
      const chipIdx = n - 1 - pos
      const baseQty = qtys[Math.min(pos, qtys.length - 1)]

      // Don't use more units than budget (leave room for at least 1 of chip[0])
      const maxByBudget = Math.floor((N - unitsUsed - 1) / units[chipIdx])
      const qty = Math.max(1, Math.min(baseQty, maxByBudget))

      q[chipIdx] = qty
      unitsUsed += qty * units[chipIdx]

      if (unitsUsed >= N - 1) break
    }

    // Smallest chip takes the exact remainder
    const remaining = round2(N - unitsUsed)
    if (remaining <= 0) continue
    q[0] = Math.round(remaining) // should already be integer if values are nice multiples

    // Sanity check: total must equal buyIn
    const actualUnits = q.reduce((sum, qty, i) => sum + qty * units[i], 0)
    if (Math.abs(actualUnits - N) > 0.01) continue

    results.push({ quantities: q, name })
  }

  return results
}

export function calculateCombinations(
  chips: number[],
  buyIn: number,
  smallBlind: number,
  bigBlind: number
): Combination[] {
  if (chips.length === 0 || buyIn <= 0 || smallBlind <= 0 || bigBlind <= 0) return []

  const sorted = [...chips].sort((a, b) => a - b)
  const n = sorted.length

  // Step 1: assign dollar values based on blinds
  const values = assignChipValues(n, smallBlind, bigBlind)

  // Step 2: compute quantity combinations
  const combos = computeQuantityCombinations(n, values, buyIn)

  return combos.map(({ quantities, name }, idx) => {
    const allocations: ChipAllocation[] = sorted.map((chip, i) => ({
      denomination: chip,
      quantity: quantities[i],
      valuePerChip: values[i],
      totalValue: round2(quantities[i] * values[i]),
    }))

    const actualTotal = round2(allocations.reduce((sum, a) => sum + a.totalValue, 0))

    return {
      id: `combo-${idx + 1}`,
      name,
      allocations,
      targetTotal: buyIn,
      actualTotal,
    }
  })
}
