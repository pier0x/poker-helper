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

// Snap a value to the nearest "nice" poker chip dollar value
const NICE_VALUES = [0.01, 0.02, 0.05, 0.10, 0.20, 0.25, 0.50, 1, 2, 5, 10, 25, 50, 100]

function snapToNice(value: number): number {
  if (value <= 0) return 0.01
  let closest = NICE_VALUES[0]
  let minDiff = Math.abs(Math.log(value / closest))
  for (const v of NICE_VALUES) {
    const diff = Math.abs(Math.log(value / v))
    if (diff < minDiff) {
      minDiff = diff
      closest = v
    }
  }
  return closest
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Generate quantity templates based on number of chip denominations.
// Quantities decrease for larger chips (prioritize small chips).
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
    // k = buyIn / sum(quantities[i] * chip[i])
    const denomSum = sorted.reduce((sum, chip, i) => sum + quantities[i] * chip, 0)
    const k = buyIn / denomSum

    // Snap values to nice numbers
    const allocations: ChipAllocation[] = sorted.map((chip, i) => {
      const rawValue = k * chip
      const valuePerChip = snapToNice(rawValue)
      const quantity = quantities[i]
      return {
        denomination: chip,
        quantity,
        valuePerChip,
        totalValue: round2(quantity * valuePerChip),
      }
    })

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
