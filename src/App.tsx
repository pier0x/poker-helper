import { useState } from 'react'
import { X, Plus, Calculator, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { calculateCombinations, type Combination } from '@/lib/algorithm'

const DEFAULT_CHIPS = [1, 5, 25, 100, 500, 1000]
const DEFAULT_BUY_IN = 20

function formatDollar(amount: number): string {
  if (amount < 1) return `$${amount.toFixed(2)}`
  if (Number.isInteger(amount)) return `$${amount}`
  return `$${amount.toFixed(2)}`
}

function CombinationCard({ combo, index }: { combo: Combination; index: number }) {
  const [expanded, setExpanded] = useState(true)
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">#{index + 1}</Badge>
            <CardTitle className="text-base">{combo.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-green-600">
              {formatDollar(combo.actualTotal)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded(e => !e)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <CardDescription>
          {combo.allocations.reduce((s, a) => s + a.quantity, 0)} chips total
        </CardDescription>
      </CardHeader>
      {expanded && (
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-2 text-left font-medium text-slate-500">Chip</th>
                  <th className="pb-2 text-right font-medium text-slate-500">Qty</th>
                  <th className="pb-2 text-right font-medium text-slate-500">Value each</th>
                  <th className="pb-2 text-right font-medium text-slate-500">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {combo.allocations.map((alloc, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 font-mono font-medium">{alloc.denomination}</td>
                    <td className="py-2 text-right text-slate-700">{alloc.quantity}×</td>
                    <td className="py-2 text-right text-slate-700">{formatDollar(alloc.valuePerChip)}</td>
                    <td className="py-2 text-right font-medium">{formatDollar(alloc.totalValue)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="pt-3 text-right font-semibold text-slate-700">Total</td>
                  <td className="pt-3 text-right font-bold text-green-600">
                    {formatDollar(combo.actualTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default function App() {
  const [chipInput, setChipInput] = useState('')
  const [chips, setChips] = useState<number[]>(DEFAULT_CHIPS)
  const [buyIn, setBuyIn] = useState<string>(String(DEFAULT_BUY_IN))
  const [combinations, setCombinations] = useState<Combination[]>([])
  const [calculated, setCalculated] = useState(false)

  function addChip() {
    const val = parseFloat(chipInput.trim())
    if (!isNaN(val) && val > 0 && !chips.includes(val)) {
      setChips(prev => [...prev, val].sort((a, b) => a - b))
      setChipInput('')
      setCalculated(false)
    }
  }

  function removeChip(chip: number) {
    setChips(prev => prev.filter(c => c !== chip))
    setCalculated(false)
  }

  function handleChipKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') addChip()
  }

  function handleCalculate() {
    const buyInNum = parseFloat(buyIn)
    if (isNaN(buyInNum) || buyInNum <= 0 || chips.length === 0) return
    const result = calculateCombinations(chips, buyInNum)
    setCombinations(result)
    setCalculated(true)
  }

  const buyInNum = parseFloat(buyIn)
  const isValid = chips.length > 0 && !isNaN(buyInNum) && buyInNum > 0

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Poker Chip Calculator</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter your chip denominations and buy-in to get chip distributions.
          </p>
        </div>

        {/* Input Card */}
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-5">
            {/* Chip denominations */}
            <div className="space-y-2">
              <Label>Chip denominations</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="e.g. 25"
                  value={chipInput}
                  onChange={e => setChipInput(e.target.value)}
                  onKeyDown={handleChipKeyDown}
                  className="max-w-[140px]"
                  min="0"
                />
                <Button variant="outline" size="sm" onClick={addChip}>
                  <Plus className="h-4 w-4" />
                  Add chip
                </Button>
              </div>
              {chips.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {chips.map(chip => (
                    <Badge
                      key={chip}
                      variant="secondary"
                      className="cursor-pointer gap-1 pr-1.5 hover:bg-slate-200"
                    >
                      <span className="font-mono">{chip}</span>
                      <button
                        onClick={() => removeChip(chip)}
                        className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 focus:outline-none"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 pt-1">No chips added yet.</p>
              )}
            </div>

            {/* Buy-in */}
            <div className="space-y-2">
              <Label htmlFor="buyin">Buy-in amount ($)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">$</span>
                <Input
                  id="buyin"
                  type="number"
                  placeholder="20"
                  value={buyIn}
                  onChange={e => { setBuyIn(e.target.value); setCalculated(false) }}
                  className="max-w-[140px]"
                  min="0"
                  step="any"
                />
              </div>
            </div>

            <Button onClick={handleCalculate} disabled={!isValid} className="w-full sm:w-auto">
              <Calculator className="h-4 w-4" />
              Calculate distributions
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {calculated && combinations.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold text-slate-800">
                Distributions for {formatDollar(buyInNum)} buy-in
              </h2>
              <span className="text-xs text-slate-400">{combinations.length} options</span>
            </div>
            {combinations.map((combo, i) => (
              <CombinationCard key={combo.id} combo={combo} index={i} />
            ))}
            <p className="text-xs text-slate-400 text-center pt-2">
              Smallest chip value is adjusted slightly so each distribution totals exactly {formatDollar(buyInNum)}.
            </p>
          </div>
        )}

        {calculated && chips.length === 0 && (
          <p className="text-sm text-slate-500 text-center">Add at least one chip denomination to calculate.</p>
        )}
      </div>
    </div>
  )
}
