'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Combobox } from '@base-ui/react/combobox'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Loader2, Plus, ChevronDown, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'

interface CatalogoItem {
  id: string
  nombre: string
}

interface Docente {
  persona_id: string
  nombre: string
  email: string | null
}

interface Props {
  cursoId: string
  instId: string
}

export default function NuevaMateriaSheet({ cursoId, instId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [docenteId, setDocenteId] = useState('')
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([])
  const [docentes, setDocentes] = useState<Docente[]>([])
  const [loadingData, setLoadingData] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoadingData(true)
    Promise.all([
      fetch(`/api/v1/instituciones/${instId}/materias-catalogo`).then(r => r.json()),
      fetch(`/api/v1/instituciones/${instId}/usuarios?rol=docente`).then(r => r.json()),
    ])
      .then(([cat, doc]) => {
        setCatalogo(cat.data ?? [])
        setDocentes(doc.data ?? [])
      })
      .catch(() => {})
      .finally(() => setLoadingData(false))
  }, [open, instId])

  const filtered = catalogo.filter(c =>
    c.nombre.toLowerCase().includes(inputValue.toLowerCase())
  )
  const hasExactMatch = catalogo.some(
    c => c.nombre.toLowerCase() === inputValue.toLowerCase()
  )
  const showCreate = inputValue.trim().length > 0 && !hasExactMatch

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const submitNombre = nombre.trim()
    if (!submitNombre) {
      toast.error('Ingresá un nombre de materia')
      return
    }
    setLoading(true)

    const body: Record<string, unknown> = { nombre: submitNombre }
    if (docenteId) body.docentes_ids = [docenteId]

    const res = await fetch(`/api/v1/cursos/${cursoId}/materias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al agregar materia')
      return
    }

    toast.success(`Materia "${submitNombre}" agregada`)
    setOpen(false)
    setNombre('')
    setInputValue('')
    setDocenteId('')
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Agregar materia
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Agregar materia</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mat-nombre">Materia *</Label>
              <Combobox.Root
                onValueChange={(v) => {
                  const val = typeof v === 'string' ? v : ''
                  setNombre(val)
                  setInputValue(val)
                }}
                onInputValueChange={(v) => {
                  setInputValue(v)
                  setNombre(v)
                }}
              >
                <Combobox.InputGroup className="relative flex h-8 w-full items-center rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                  <Combobox.Input
                    id="mat-nombre"
                    placeholder={loadingData ? 'Cargando...' : 'Buscar o crear materia...'}
                    disabled={loadingData}
                    className="h-full w-full rounded-lg bg-transparent pl-2.5 pr-8 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Combobox.Trigger className="absolute right-0 flex h-full w-8 items-center justify-center text-muted-foreground">
                    <ChevronDown className="size-4" />
                  </Combobox.Trigger>
                </Combobox.InputGroup>

                <Combobox.Portal>
                  <Combobox.Positioner sideOffset={4} className="isolate z-50">
                    <Combobox.Popup className="w-[var(--anchor-width)] min-w-36 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
                      <Combobox.List className="max-h-60 overflow-y-auto py-1 outline-none">
                        {filtered.map(c => (
                          <Combobox.Item
                            key={c.id}
                            value={c.nombre}
                            className={cn(
                              'relative flex cursor-default items-center gap-2 py-1.5 pl-2 pr-8 text-sm outline-none select-none',
                              'data-highlighted:bg-accent data-highlighted:text-accent-foreground'
                            )}
                          >
                            <Combobox.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
                              <Check className="size-3" />
                            </Combobox.ItemIndicator>
                            {c.nombre}
                          </Combobox.Item>
                        ))}
                        {showCreate && (
                          <Combobox.Item
                            value={inputValue.trim()}
                            className={cn(
                              'relative flex cursor-default items-center gap-2 py-1.5 pl-2 pr-8 text-sm outline-none select-none text-harvi-green-dark font-medium',
                              'data-highlighted:bg-accent data-highlighted:text-accent-foreground'
                            )}
                          >
                            <Plus className="size-3 shrink-0" />
                            Crear &quot;{inputValue.trim()}&quot;
                          </Combobox.Item>
                        )}
                        {filtered.length === 0 && !showCreate && (
                          <div className="px-2 py-3 text-sm text-center text-muted-foreground">
                            Sin materias en el catálogo
                          </div>
                        )}
                      </Combobox.List>
                    </Combobox.Popup>
                  </Combobox.Positioner>
                </Combobox.Portal>
              </Combobox.Root>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mat-docente">Docente</Label>
              <Select value={docenteId} onValueChange={v => setDocenteId(v ?? '')}>
                <SelectTrigger id="mat-docente" disabled={loadingData}>
                  <SelectValue placeholder={loadingData ? 'Cargando...' : 'Seleccionar docente...'}>
                    {docenteId ? docentes.find(d => d.persona_id === docenteId)?.nombre : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {docentes.map(d => (
                    <SelectItem key={d.persona_id} value={d.persona_id}>
                      {d.nombre}
                    </SelectItem>
                  ))}
                  {docentes.length === 0 && !loadingData && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Sin docentes registrados
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={loading || !nombre.trim()} className="mt-2">
              {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {loading ? 'Agregando...' : 'Agregar materia'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
