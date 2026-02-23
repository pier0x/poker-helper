import { useState, useEffect } from 'react'
import { X, Plus, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { calculateCombinations, assignChipValues, type Combination } from '@/lib/algorithm'

const DEFAULT_CHIPS = [1, 5, 25, 100, 500, 1000]
const DEFAULT_BUY_IN = 20
const DEFAULT_SB = 0.10
const DEFAULT_BB = 0.20

function formatDollar(amount: number): string {
  if (Number.isInteger(amount)) return `$${amount}`
  return `$${amount.toFixed(2)}`
}

interface EditableRow {
  denomination: number
  quantity: string      // string so input can be mid-edit
  valuePerChip: string  // string so input can be mid-edit
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function CombinationCard({ combo }: { combo: Combination }) {
  const [rows, setRows] = useState<EditableRow[]>(() =>
    combo.allocations.map(a => ({
      denomination: a.denomination,
      quantity: String(a.quantity),
      valuePerChip: String(a.valuePerChip),
    }))
  )

  // Re-sync if combo changes (new calculation)
  useEffect(() => {
    setRows(combo.allocations.map(a => ({
      denomination: a.denomination,
      quantity: String(a.quantity),
      valuePerChip: String(a.valuePerChip),
    })))
  }, [combo])

  function updateRow(i: number, field: 'quantity' | 'valuePerChip', value: string) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }

  const parsed = rows.map(r => ({
    denomination: r.denomination,
    quantity: Math.max(0, parseInt(r.quantity) || 0),
    valuePerChip: Math.max(0, parseFloat(r.valuePerChip) || 0),
  }))

  const actualTotal = round2(parsed.reduce((s, r) => s + r.quantity * r.valuePerChip, 0))
  const totalChips  = parsed.reduce((s, r) => s + r.quantity, 0)
  const diff        = round2(actualTotal - combo.targetTotal)
  const isExact     = Math.abs(diff) < 0.01

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Chip distribution</CardTitle>
          <span className={`text-sm font-semibold ${isExact ? 'text-green-600' : 'text-amber-600'}`}>
            {formatDollar(actualTotal)}
            {!isExact && (
              <span className="ml-1 text-xs font-normal">
                ({diff > 0 ? '+' : ''}{formatDollar(diff)} vs target)
              </span>
            )}
          </span>
        </div>
        <CardDescription>{totalChips} chips per player</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-2 text-left font-medium text-slate-500">Chip</th>
                <th className="pb-2 text-right font-medium text-slate-500">Worth</th>
                <th className="pb-2 text-right font-medium text-slate-500">Qty</th>
                <th className="pb-2 text-right font-medium text-slate-500">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const qty = Math.max(0, parseInt(row.quantity) || 0)
                const val = Math.max(0, parseFloat(row.valuePerChip) || 0)
                const subtotal = round2(qty * val)
                return (
                  <tr key={row.denomination} className="border-b border-slate-50 last:border-0">
                    <td className="py-1.5 font-mono font-medium">{row.denomination}</td>
                    <td className="py-1.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-slate-400 text-xs">$</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.valuePerChip}
                          onChange={e => updateRow(i, 'valuePerChip', e.target.value)}
                          className="w-20 rounded border border-slate-200 bg-white px-2 py-0.5 text-right text-slate-700 focus:border-slate-400 focus:outline-none"
                        />
                      </div>
                    </td>
                    <td className="py-1.5 text-right">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={row.quantity}
                        onChange={e => updateRow(i, 'quantity', e.target.value)}
                        className="w-16 rounded border border-slate-200 bg-white px-2 py-0.5 text-right text-slate-700 focus:border-slate-400 focus:outline-none"
                      />
                    </td>
                    <td className="py-1.5 text-right font-medium">{formatDollar(subtotal)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-3 text-right font-semibold text-slate-700">Total</td>
                <td className={`pt-3 text-right font-bold ${isExact ? 'text-green-600' : 'text-amber-600'}`}>
                  {formatDollar(actualTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {!isExact && (
          <p className="mt-3 text-xs text-amber-600 bg-amber-50 rounded-md px-3 py-2">
            Total is {formatDollar(Math.abs(diff))} {diff > 0 ? 'above' : 'below'} the {formatDollar(combo.targetTotal)} target.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function App() {
  const [chipInput, setChipInput] = useState('')
  const [chips, setChips] = useState<number[]>(DEFAULT_CHIPS)
  const [buyIn, setBuyIn] = useState<string>(String(DEFAULT_BUY_IN))
  const [smallBlind, setSmallBlind] = useState<string>(String(DEFAULT_SB))
  const [bigBlind, setBigBlind] = useState<string>(String(DEFAULT_BB))
  const [combinations, setCombinations] = useState<Combination[]>([])
  const [chipValues, setChipValues] = useState<number[]>([])
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
    const sbNum = parseFloat(smallBlind)
    const bbNum = parseFloat(bigBlind)
    if (isNaN(buyInNum) || buyInNum <= 0) return
    if (isNaN(sbNum) || sbNum <= 0) return
    if (isNaN(bbNum) || bbNum <= sbNum) return
    if (chips.length === 0) return

    const sorted = [...chips].sort((a, b) => a - b)
    const values = assignChipValues(sorted.length, sbNum, bbNum)
    setChipValues(values)

    const result = calculateCombinations(chips, buyInNum, sbNum, bbNum)
    setCombinations(result)
    setCalculated(true)
  }

  const buyInNum = parseFloat(buyIn)
  const sbNum = parseFloat(smallBlind)
  const bbNum = parseFloat(bigBlind)
  const isValid =
    chips.length > 0 &&
    !isNaN(buyInNum) && buyInNum > 0 &&
    !isNaN(sbNum) && sbNum > 0 &&
    !isNaN(bbNum) && bbNum > sbNum

  const sortedChips = [...chips].sort((a, b) => a - b)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Poker Chip Calculator</h1>
          <p className="mt-1 text-sm text-slate-500">
            Set your blinds and buy-in. Small chips cover half the buy-in, large chips cover the other half.
          </p>
        </div>

        {/* Input Card */}
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-5">

            {/* Chip denominations */}
            <div className="space-y-2">
              <Label>Chip denominations in your set</Label>
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
                  Add
                </Button>
              </div>
              {chips.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {sortedChips.map(chip => (
                    <Badge
                      key={chip}
                      variant="secondary"
                      className="gap-1 pr-1.5 hover:bg-slate-200"
                    >
                      <span className="font-mono">{chip}</span>
                      <button
                        onClick={() => removeChip(chip)}
                        className="cursor-pointer ml-0.5 rounded-sm opacity-60 hover:opacity-100 focus:outline-none"
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

            {/* Blinds row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sb">Small Blind ($)</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-slate-400">$</span>
                  <Input
                    id="sb"
                    type="number"
                    placeholder="0.10"
                    value={smallBlind}
                    onChange={e => { setSmallBlind(e.target.value); setCalculated(false) }}
                    min="0"
                    step="any"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bb">Big Blind ($)</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-slate-400">$</span>
                  <Input
                    id="bb"
                    type="number"
                    placeholder="0.20"
                    value={bigBlind}
                    onChange={e => { setBigBlind(e.target.value); setCalculated(false) }}
                    min="0"
                    step="any"
                  />
                </div>
                {!isNaN(sbNum) && !isNaN(bbNum) && bbNum <= sbNum && bigBlind !== '' && (
                  <p className="text-xs text-red-500">Big blind must be greater than small blind.</p>
                )}
              </div>
            </div>

            {/* Buy-in */}
            <div className="space-y-2">
              <Label htmlFor="buyin">Buy-in per player ($)</Label>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-slate-400">$</span>
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

        {/* Chip value assignment (Step 1 result) */}
        {calculated && chipValues.length > 0 && (
          <Card className="mb-4 border-slate-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">Chip values (based on your blinds)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {sortedChips.map((chip, i) => (
                  <div key={chip} className="flex items-center gap-1.5 rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5 text-sm">
                    <span className="font-mono font-medium text-slate-800">{chip}</span>
                    <span className="text-slate-400">=</span>
                    <span className="font-semibold text-slate-900">{formatDollar(chipValues[i])}</span>
                    {i === 0 && <span className="text-xs text-slate-400">(SB)</span>}
                    {i === 1 && <span className="text-xs text-slate-400">(BB)</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Distribution options (Step 2 results) */}
        {calculated && combinations.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-800">
              Distribution for {formatDollar(buyInNum)} buy-in
            </h2>
            <CombinationCard combo={combinations[0]} />
          </div>
        )}

        {calculated && combinations.length === 0 && (
          <Card className="border-amber-100 bg-amber-50">
            <CardContent className="pt-6">
              <p className="text-sm text-amber-700">
                Couldn't find valid distributions with these settings. Try adjusting the buy-in or blinds.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
