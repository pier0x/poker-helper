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
 * Strategy:
 * - Fix q[0] (smallest chip) to a target quantity (15, 20, 25)
 * - Assign chips[n-1..2] with small base quantities (1, 2, 3, 5…)
 * - chip[1] (BB chip) absorbs whatever integer units remain
 * - Any leftover units (parity) go back into chip[0]
 *
 * This guarantees q[0] stays in a sane poker range and the total is exact.
 */
function computeQuantityCombinations(
  n: number,
  values: number[],
  buyIn: number
): { quantities: number[]; name: string }[] {
  const v0 = values[0]
  const units = values.map(v => round2(v / v0))   // e.g. [1, 2, 5, 10, 20, 50]
  const N = Math.round(buyIn / v0)                 // e.g. 200 for $20 buy-in with $0.10 SB

  // Base quantities for chips[n-1], chips[n-2], ..., chips[2]
  // (from largest down to the third-smallest, all fixed small numbers)
  const BASE_QTYS_FROM_LARGEST = [1, 2, 3, 5, 8, 12, 20]

  // Three combos differ only in how many of the smallest chip (chip[0]) we target
  const COMBOS: { name: string; q0Target: number }[] = [
    { name: 'Fewer Small',  q0Target: 15 },
    { name: 'Balanced',     q0Target: 20 },
    { name: 'More Small',   q0Target: 25 },
  ]

  const results: { quantities: number[]; name: string }[] = []

  for (const { name, q0Target } of COMBOS) {
    const q = new Array(n).fill(0)

    // Reserve q0Target units for chip[0]
    let remaining = N - q0Target
    if (remaining <= 0) continue

    // Assign chips[n-1] down to chips[2] with base quantities
    let valid = true
    for (let pos = 0; pos < n - 2; pos++) {        // chips[n-1]..chips[2]
      const chipIdx = n - 1 - pos
      const baseQty = BASE_QTYS_FROM_LARGEST[Math.min(pos, BASE_QTYS_FROM_LARGEST.length - 1)]
      const maxQty  = Math.floor((remaining - 1) / units[chipIdx])  // leave ≥1 unit for chip[1]
      if (maxQty <= 0) { valid = false; break }
      const qty = Math.min(baseQty, maxQty)
      q[chipIdx] = qty
      remaining -= qty * units[chipIdx]
    }
    if (!valid || remaining <= 0) continue

    // chip[1] (BB chip) takes as many as will fit
    q[1] = Math.floor(remaining / units[1])
    remaining -= q[1] * units[1]

    // chip[0] gets the target plus any leftover (should be 0 for nice multiples)
    q[0] = q0Target + Math.round(remaining)
    if (q[0] <= 0 || q[1] <= 0) continue

    // Verify exact total
    const totalUnits = q.reduce((sum, qty, i) => sum + qty * units[i], 0)
    if (Math.abs(totalUnits - N) > 0.01) continue

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
