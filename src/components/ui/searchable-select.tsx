'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SearchableOption {
  value: string
  label: string
}

interface Props {
  options: SearchableOption[]
  value: string
  onValueChange: (v: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Sin resultados',
  disabled,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase())
  )
  const selectedLabel = options.find(o => o.value === value)?.label

  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  function handleToggle() {
    if (disabled) return
    setOpen(o => !o)
    setQuery('')
  }

  function handleSelect(v: string) {
    onValueChange(v)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs ring-offset-background',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          !selectedLabel && 'text-muted-foreground'
        )}
      >
        <span className="truncate">{selectedLabel ?? placeholder}</span>
        <ChevronDown className="size-4 shrink-0 opacity-50 ml-2" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
          <div className="p-1.5 border-b">
            <Input
              autoFocus
              placeholder={searchPlaceholder}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="py-2 text-center text-sm text-muted-foreground">{emptyMessage}</p>
            ) : (
              filtered.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => handleSelect(o.value)}
                  className={cn(
                    'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                    'hover:bg-accent hover:text-accent-foreground',
                    o.value === value && 'bg-accent text-accent-foreground'
                  )}
                >
                  <Check className={cn('mr-2 size-3.5 shrink-0', o.value !== value && 'opacity-0')} />
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
