'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  slug: string
  cursos: { id: string; nombre: string }[]
}

export default function NuevoComunicadoSheet({ cursos }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [cursoId, setCursoId] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/v1/comunicados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, contenido, curso_id: cursoId }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al crear comunicado')
      return
    }

    const enviados: number = json.data?.emails_enviados ?? 0
    toast.success(`Comunicado enviado (${enviados} destinatario${enviados !== 1 ? 's' : ''})`)
    setOpen(false)
    setTitulo('')
    setContenido('')
    setCursoId('')
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Nuevo comunicado
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Nuevo comunicado</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="com-titulo">Título *</Label>
              <Input
                id="com-titulo"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ej: Reunión de padres"
                maxLength={300}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="com-curso">Curso *</Label>
              <Select value={cursoId} onValueChange={v => setCursoId(v ?? '')}>
                <SelectTrigger id="com-curso">
                  <SelectValue placeholder="Seleccionar curso..." />
                </SelectTrigger>
                <SelectContent>
                  {cursos.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="com-contenido">Contenido *</Label>
              <textarea
                id="com-contenido"
                value={contenido}
                onChange={e => setContenido(e.target.value)}
                placeholder="Escribí el comunicado aquí..."
                maxLength={5000}
                rows={6}
                required
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !titulo || !contenido || !cursoId}
              className="mt-2"
            >
              {loading && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {loading ? 'Enviando...' : 'Enviar comunicado'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
