import { useState } from 'react'
import { Plus, X, ArrowRight, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { calculateSettlement, type Player, type Transaction, type PlayerSummary } from '@/lib/settlement'

let nextId = 1
function makePlayer(): Player {
  return { id: String(nextId++), name: '', buyIns: [0], finalBalance: 0 }
}

function formatDollar(n: number): string {
  if (Number.isInteger(n)) return `$${n}`
  return `$${Math.abs(n).toFixed(2)}`
}

function PlayerRow({
  player,
  onChange,
  onRemove,
  canRemove,
}: {
  player: Player
  onChange: (p: Player) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const totalBuyIn = player.buyIns.reduce((s, b) => s + (b || 0), 0)
  const net = Math.round((player.finalBalance - totalBuyIn) * 100) / 100

  function setName(name: string) { onChange({ ...player, name }) }
  function setFinalBalance(v: string) { onChange({ ...player, finalBalance: parseFloat(v) || 0 }) }
  function setBuyIn(idx: number, v: string) {
    const updated = player.buyIns.map((b, i) => i === idx ? (parseFloat(v) || 0) : b)
    onChange({ ...player, buyIns: updated })
  }
  function addBuyIn() { onChange({ ...player, buyIns: [...player.buyIns, 0] }) }
  function removeBuyIn(idx: number) {
    if (player.buyIns.length === 1) return
    onChange({ ...player, buyIns: player.buyIns.filter((_, i) => i !== idx) })
  }

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {/* Name + remove */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Player name"
            value={player.name}
            onChange={e => setName(e.target.value)}
            className="flex-1"
          />
          {canRemove && (
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-slate-400 hover:text-red-500" onClick={onRemove}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Buy-in(s) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Buy-in(s)</Label>
            {player.buyIns.map((b, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <span className="text-xs text-slate-400">$</span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={b || ''}
                  onChange={e => setBuyIn(idx, e.target.value)}
                  className="h-8 text-sm"
                />
                {player.buyIns.length > 1 && (
                  <button onClick={() => removeBuyIn(idx)} className="cursor-pointer text-slate-300 hover:text-red-400 shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addBuyIn}
              className="cursor-pointer flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 pt-0.5"
            >
              <Plus className="h-3 w-3" />
              Add re-buy
            </button>
          </div>

          {/* Final balance */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Final balance</Label>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400">$</span>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={player.finalBalance || ''}
                onChange={e => setFinalBalance(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <p className={`text-xs font-medium ${net > 0 ? 'text-green-600' : net < 0 ? 'text-red-500' : 'text-slate-400'}`}>
              {net > 0 ? `+${formatDollar(net)}` : net < 0 ? `-${formatDollar(net)}` : 'even'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}

function TransactionList({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-4">Everyone is even — no payments needed! 🎉</p>
    )
  }
  return (
    <div className="space-y-2">
      {transactions.map((t, i) => (
        <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-slate-800">{t.from}</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-semibold text-slate-800">{t.to}</span>
          </div>
          <span className="text-base font-bold text-slate-900">{formatDollar(t.amount)}</span>
        </div>
      ))}
    </div>
  )
}

function SummaryTable({ summaries }: { summaries: PlayerSummary[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-100">
          <th className="pb-2 text-left font-medium text-slate-500">Player</th>
          <th className="pb-2 text-right font-medium text-slate-500">Buy-in</th>
          <th className="pb-2 text-right font-medium text-slate-500">Cash-out</th>
          <th className="pb-2 text-right font-medium text-slate-500">Net</th>
        </tr>
      </thead>
      <tbody>
        {summaries.map((s, i) => (
          <tr key={i} className="border-b border-slate-50 last:border-0">
            <td className="py-2 font-medium">{s.name}</td>
            <td className="py-2 text-right text-slate-600">{formatDollar(s.totalBuyIn)}</td>
            <td className="py-2 text-right text-slate-600">{formatDollar(s.finalBalance)}</td>
            <td className={`py-2 text-right font-semibold ${s.net > 0 ? 'text-green-600' : s.net < 0 ? 'text-red-500' : 'text-slate-400'}`}>
              {s.net > 0 ? `+${formatDollar(s.net)}` : s.net < 0 ? `-${formatDollar(Math.abs(s.net))}` : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function Settlement() {
  const [players, setPlayers] = useState<Player[]>([makePlayer(), makePlayer()])
  const [result, setResult] = useState<{ transactions: Transaction[]; summaries: PlayerSummary[] } | null>(null)

  function updatePlayer(id: string, updated: Player) {
    setPlayers(prev => prev.map(p => p.id === id ? updated : p))
    setResult(null)
  }

  function addPlayer() {
    setPlayers(prev => [...prev, makePlayer()])
    setResult(null)
  }

  function removePlayer(id: string) {
    setPlayers(prev => prev.filter(p => p.id !== id))
    setResult(null)
  }

  function handleCalculate() {
    const settled = calculateSettlement(players)
    setResult(settled)
  }

  const canCalculate = players.length >= 2 && players.every(p => p.name.trim().length > 0)

  return (
    <div className="space-y-5">
      {/* Players */}
      <div className="space-y-3">
        {players.map(p => (
          <PlayerRow
            key={p.id}
            player={p}
            onChange={updated => updatePlayer(p.id, updated)}
            onRemove={() => removePlayer(p.id)}
            canRemove={players.length > 2}
          />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={addPlayer}>
          <Users className="h-4 w-4" />
          Add player
        </Button>
        <Button onClick={handleCalculate} disabled={!canCalculate}>
          Calculate settlements
        </Button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4 pt-2">
          {/* Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Summary</CardTitle>
              <CardDescription>Who won and who lost</CardDescription>
            </CardHeader>
            <CardContent>
              <SummaryTable summaries={result.summaries} />
            </CardContent>
          </Card>

          {/* Transactions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Settlements</CardTitle>
              <CardDescription>
                {result.transactions.length === 0
                  ? 'No payments needed'
                  : `${result.transactions.length} payment${result.transactions.length > 1 ? 's' : ''} to settle up`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionList transactions={result.transactions} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
