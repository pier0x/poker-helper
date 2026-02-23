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

function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}

// Generate quantity templates: more small chips, fewer large chips
function generateQuantityTemplates(n: number): { quantities: number[]; name: string }[] {
  const configs = [
    { base: 20, decay: 0.55, name: 'Heavy Small' },
    { base: 15, decay: 0.60, name: 'Balanced' },
    { base: 12, decay: 0.65, name: 'Compact' },
  ]

  return configs.map(({ base, decay, name }) => ({
    name,
    quantities: Array.from({ length: n }, (_, i) =>
      Math.max(1, Math.round(base * Math.pow(decay, i)))
    ),
  }))
}

export function calculateCombinations(
  chips: number[],
  buyIn: number
): Combination[] {
  if (chips.length === 0 || buyIn <= 0) return []

  const sorted = [...chips].sort((a, b) => a - b)
  const n = sorted.length
  const templates = generateQuantityTemplates(n)

  return templates.map(({ quantities, name }, idx) => {
    // Proportional scaling: value[i] = k * chip[i]
    // k = buyIn / sum(q[i] * chip[i])
    // This guarantees: sum(q[i] * value[i]) = buyIn exactly (in ideal math)
    const denomSum = sorted.reduce((sum, chip, i) => sum + quantities[i] * chip, 0)
    const k = buyIn / denomSum

    // Compute per-chip values rounded to 4dp
    const values = sorted.map(chip => round4(k * chip))

    // Compute per-allocation totals rounded to 2dp (cents)
    const subTotals = values.map((v, i) => round2(quantities[i] * v))

    // Running total (may differ from buyIn by a few cents due to rounding)
    const runningTotal = round2(subTotals.reduce((s, t) => s + t, 0))
    const diff = round2(buyIn - runningTotal)

    // Absorb any cent-rounding gap into the smallest chip's subtotal
    subTotals[0] = round2(subTotals[0] + diff)

    // Recompute the smallest chip's per-chip value from the adjusted subtotal
    values[0] = round4(subTotals[0] / quantities[0])

    const allocations: ChipAllocation[] = sorted.map((chip, i) => ({
      denomination: chip,
      quantity: quantities[i],
      valuePerChip: values[i],
      totalValue: subTotals[i],
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
