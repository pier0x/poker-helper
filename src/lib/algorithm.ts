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

const NICE_MULTIPLIERS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]

/**
 * STEP 1: Assign a dollar value to each chip position.
 * Chip 0 (smallest) = smallBlind
 * Chip 1            = bigBlind
 * Chip 2..n-1       = next nice multiples of smallBlind
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
      const fallback = round2(prev * 2)
      values.push(fallback)
      prev = fallback
    }
  }
  return values
}

/**
 * Solve for quantities within a single group of chips to hit a target.
 *
 * Strategy:
 * - Fix how many of the smallest chip (q0Target units)
 * - Assign chips[m-1..2] with reasonable base quantities
 * - chip[1] absorbs the remainder (acts as "change-maker" within the group)
 *
 * Returns null if no valid distribution found.
 */
function solveGroup(
  m: number,
  values: number[],
  target: number,
  q0Target: number
): number[] | null {
  if (m === 0) return []
  if (m === 1) {
    const qty = Math.round(target / values[0])
    return qty > 0 ? [qty] : null
  }

  const v0 = values[0]
  const units = values.map(v => round2(v / v0))
  const N = Math.round(target / v0)

  if (q0Target >= N) return null

  const q = new Array(m).fill(0)
  let remaining = N - q0Target

  // Assign chips[m-1] down to chips[2]
  // Base quantity: how much of the remaining budget should this chip cover
  // Use ~1/(pos+2) of remaining for each chip (gives decreasing coverage)
  for (let pos = 0; pos < m - 2; pos++) {
    const chipIdx = m - 1 - pos
    const share = remaining / (m - 1 - pos)          // equal share of what's left
    const idealQty = Math.round(share / units[chipIdx])
    const maxQty = Math.floor((remaining - 1) / units[chipIdx])  // leave ≥1 unit for chip[1]
    const qty = Math.max(1, Math.min(idealQty, maxQty))
    q[chipIdx] = qty
    remaining -= qty * units[chipIdx]
    if (remaining <= 0) return null
  }

  // chip[1] absorbs whatever units remain
  q[1] = Math.floor(remaining / units[1])
  remaining -= q[1] * units[1]

  // chip[0] gets q0Target + any fractional leftover
  q[0] = q0Target + Math.round(remaining)

  if (q[0] <= 0 || q[1] <= 0) return null

  // Verify exact total
  const totalUnits = q.reduce((s, qty, i) => s + qty * units[i], 0)
  if (Math.abs(totalUnits - N) > 0.01) return null

  return q
}

/**
 * STEP 2: Split chips into two halves; each half covers buyIn/2.
 *
 * Group 1 (small chips, lower half): cheap chips used for change/blinds
 * Group 2 (large chips, upper half): stack chips with higher individual value
 *
 * For each group we generate 3 variants by varying the q0Target.
 */
function computeQuantityCombinations(
  n: number,
  values: number[],
  buyIn: number
): { quantities: number[]; name: string }[] {
  const half = buyIn / 2

  const g1Size = Math.ceil(n / 2)   // small chips group (may be larger half for odd n)
  const g2Size = n - g1Size          // large chips group

  const g1Values = values.slice(0, g1Size)
  const g2Values = values.slice(g1Size)

  // For group 1 (small value chips): q0 targets are meaningful fractions of N1
  const v1_0 = g1Values[0]
  const N1 = Math.round(half / v1_0)
  const g1Targets = [
    Math.max(3, Math.round(N1 * 0.15)),
    Math.max(4, Math.round(N1 * 0.20)),
    Math.max(5, Math.round(N1 * 0.25)),
  ]

  // For group 2 (large value chips): q0 targets are much smaller
  const v2_0 = g2Values.length > 0 ? g2Values[0] : 1
  const N2 = Math.round(half / v2_0)
  const g2Targets = [
    Math.max(1, Math.round(N2 * 0.10)),
    Math.max(2, Math.round(N2 * 0.20)),
    Math.max(3, Math.round(N2 * 0.30)),
  ]

  // Generate a single balanced distribution (use the middle target for each group)
  const g1Qtys = solveGroup(g1Size, g1Values, half, g1Targets[1])
  const g2Qtys = g2Size > 0
    ? solveGroup(g2Size, g2Values, half, g2Targets[1])
    : []

  if (!g1Qtys || !g2Qtys) return []

  return [{ quantities: [...g1Qtys, ...g2Qtys], name: 'Recommended' }]
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

  const values = assignChipValues(n, smallBlind, bigBlind)
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
