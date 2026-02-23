import { useState } from 'react'
import { cn } from '@/lib/utils'
import ChipCalculator from '@/components/ChipCalculator'
import Settlement from '@/components/Settlement'

type Tab = 'calculator' | 'settlement'

const TABS: { id: Tab; label: string }[] = [
  { id: 'calculator', label: 'Chip Calculator' },
  { id: 'settlement', label: 'Settlement' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('calculator')

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-10">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Poker Helper</h1>
          <p className="mt-1 text-sm text-slate-500">Tools for your home game.</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'cursor-pointer px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'calculator' && <ChipCalculator />}
        {activeTab === 'settlement' && <Settlement />}
      </div>
    </div>
  )
}
