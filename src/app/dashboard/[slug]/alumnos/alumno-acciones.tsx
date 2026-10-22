'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { MoreHorizontal, BookOpen, Users, ArrowRightLeft, UserCheck, UserX, Pencil, UserCog, Check, Copy, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import ResponsablesSheet from './responsables-sheet'
import CambiarCursoSheet from './cambiar-curso-sheet'
import EditarAlumnoSheet from './editar-alumno-sheet'

interface Props {
  alumnoId: string
  alumnoNombre: string
  activo: boolean
  instId: string
  slug: string
  cursos: Array<{ id: string; nombre: string }>
  esAutoResponsable?: boolean
}

export default function AlumnoAcciones({ alumnoId, alumnoNombre, activo, instId, slug, cursos, esAutoResponsable }: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [respOpen, setRespOpen] = useState(false)
  const [cursoOpen, setCursoOpen] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [asignando, setAsignando] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ email: string; setup_url: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleAutoResponsable() {
    setAsignando(true)
    const res = await fetch(`/api/v1/alumnos/${alumnoId}/autoresponsable`, { method: 'POST' })
    const json = await res.json()
    setAsignando(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al asignar responsable')
      return
    }

    if (json.data?.ya_existia) {
      toast.info('El alumno ya era su propio responsable')
      return
    }

    router.refresh()

    if (json.data?.setup_url) {
      setInviteResult({ email: json.data.email, setup_url: json.data.setup_url })
    } else {
      toast.success('Alumno asignado como responsable', {
        description: `Se envió invitación a ${json.data?.email ?? ''}`,
      })
    }
  }

  async function handleToggleActivo() {
    setToggling(true)

    const res = await fetch(`/api/v1/alumnos/${alumnoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !activo }),
    })

    const json = await res.json()
    setToggling(false)

    if (!res.ok) {
      toast.error(json.error?.message ?? 'Error al actualizar')
      return
    }

    toast.success(activo ? 'Alumno desactivado' : 'Alumno activado')
    router.refresh()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="size-8 p-0" disabled={toggling} />}>
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Acciones</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={`/dashboard/${slug}/libreta/${alumnoId}`} />}>
            <BookOpen className="size-4" />
            Ver libreta
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Editar datos
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setRespOpen(true)}>
            <Users className="size-4" />
            Responsables
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCursoOpen(true)}>
            <ArrowRightLeft className="size-4" />
            Cambiar curso
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAutoResponsable} disabled={asignando || esAutoResponsable}>
            <UserCog className="size-4" />
            Responsable de sí mismo
            {esAutoResponsable && <Check className="size-3.5 ml-auto text-emerald-500" />}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleToggleActivo}>
            {activo ? (
              <><UserX className="size-4" />Desactivar</>
            ) : (
              <><UserCheck className="size-4" />Activar</>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!inviteResult} onOpenChange={v => { if (!v) { setInviteResult(null); setCopied(false) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responsable creado</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Se envió un email a <strong>{inviteResult?.email}</strong>. Si no llega, compartí este link:
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs font-mono break-all">
                <Link2 className="size-3 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-muted-foreground">{inviteResult?.setup_url}</span>
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  if (!inviteResult) return
                  await navigator.clipboard.writeText(inviteResult.setup_url)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
              >
                {copied
                  ? <><Check data-icon="inline-start" className="text-green-500" />Copiado</>
                  : <><Copy data-icon="inline-start" />Copiar link</>
                }
              </Button>
            </div>
            <Button onClick={() => { setInviteResult(null); setCopied(false) }}>Listo</Button>
          </div>
        </DialogContent>
      </Dialog>

      <EditarAlumnoSheet
        alumnoId={alumnoId}
        alumnoNombre={alumnoNombre}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ResponsablesSheet
        alumnoId={alumnoId}
        alumnoNombre={alumnoNombre}
        instId={instId}
        open={respOpen}
        onOpenChange={setRespOpen}
      />
      <CambiarCursoSheet
        alumnoId={alumnoId}
        alumnoNombre={alumnoNombre}
        cursos={cursos}
        open={cursoOpen}
        onOpenChange={setCursoOpen}
      />
    </>
  )
}
