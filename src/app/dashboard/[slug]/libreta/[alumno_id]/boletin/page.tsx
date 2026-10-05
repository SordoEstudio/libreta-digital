import { requireSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer } from 'lucide-react'
import PrintButton from './print-button'

type Params = { params: Promise<{ slug: string; alumno_id: string }> }

export default async function BoletinPage({ params }: Params) {
  const { slug, alumno_id } = await params
  const session = await requireSession()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id, nombre')
    .eq('slug', slug)
    .single()

  if (!inst) {
    if (isSuperadmin(session)) redirect('/dashboard/instituciones')
    notFound()
  }
  if (!isSuperadmin(session) && !hasAnyRole(session, inst.id, ['admin', 'docente', 'responsable']))
    redirect('/dashboard')

  const { data: alumno } = await supabase
    .from('alumnos')
    .select('id, nombre, activo, alumno_inscripciones(curso_id, activo, deleted_at)')
    .eq('id', alumno_id)
    .eq('institucion_id', inst.id)
    .single()

  if (!alumno) notFound()

  const { data: notas } = await supabase
    .from('notas')
    .select(`
      id, valor_numerico, valor_literal, observacion,
      evaluaciones(id, nombre, peso, tipo, periodo_id,
        periodos(nombre, orden),
        materias(id, materias_catalogo(nombre))
      )
    `)
    .eq('alumno_id', alumno_id)
    .is('deleted_at', null)

  type Evaluacion = {
    id: string; nombre: string; peso: number; tipo: string; periodo_id: string
    periodos: { nombre: string; orden: number } | null
    materias: { id: string; materias_catalogo: { nombre: string } | null } | null
  }
  type NotaRow = NonNullable<typeof notas>[number]

  type MateriaEntry = {
    nombre: string
    notas: Array<NotaRow & { _ev: Evaluacion }>
  }

  const materiaMap = new Map<string, MateriaEntry>()
  for (const nota of (notas ?? [])) {
    const ev = nota.evaluaciones as Evaluacion | null
    if (!ev?.materias) continue
    const matId = ev.materias.id
    const nombre = (ev.materias.materias_catalogo as { nombre: string } | null)?.nombre ?? ''
    if (!materiaMap.has(matId)) materiaMap.set(matId, { nombre, notas: [] })
    materiaMap.get(matId)!.notas.push({ ...nota, _ev: ev })
  }

  type Inscripcion = { curso_id: string; activo: boolean; deleted_at: string | null }
  const inscripcion = ((alumno.alumno_inscripciones ?? []) as Inscripcion[])
    .find(i => i.activo && !i.deleted_at)

  let cursoNombre: string | undefined
  let añoNombre: string | undefined
  if (inscripcion?.curso_id) {
    const { data: cursoRow } = await supabase
      .from('cursos')
      .select('*')
      .eq('id', inscripcion.curso_id)
      .single()
    cursoNombre = cursoRow?.nombre
    if (cursoRow?.año_lectivo_id) {
      const { data: añoRow } = await supabase
        .from('años_lectivos')
        .select('*')
        .eq('id', cursoRow.año_lectivo_id)
        .single()
      añoNombre = añoRow?.nombre
    }
  }

  return (
    <div>
      {/* Toolbar — hidden on print */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Button variant="ghost" size="sm" render={<Link href={`/dashboard/${slug}/libreta/${alumno_id}`} />}>
          <ArrowLeft data-icon="inline-start" />
          Volver a notas
        </Button>
        <PrintButton />
      </div>

      {/* Boletín content */}
      <div className="max-w-2xl mx-auto print:max-w-none">
        {/* Header */}
        <div className="text-center mb-6 pb-4 border-b">
          <p className="text-sm text-muted-foreground print:text-gray-600">{inst.nombre}</p>
          <h1 className="text-2xl font-bold mt-1">Libreta de Calificaciones</h1>
          <div className="flex justify-center gap-6 mt-3 text-sm">
            <span><strong>Alumno:</strong> {alumno.nombre}</span>
            {cursoNombre && <span><strong>Curso:</strong> {cursoNombre}</span>}
            {añoNombre && <span><strong>Año:</strong> {añoNombre}</span>}
          </div>
        </div>

        {/* Notas por materia */}
        {materiaMap.size === 0 ? (
          <p className="text-center text-muted-foreground py-8">Sin notas registradas.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {Array.from(materiaMap.entries()).map(([matId, mat]) => {
              const sorted = [...mat.notas].sort((a, b) => {
                const oa = a._ev.periodos?.orden ?? 0
                const ob = b._ev.periodos?.orden ?? 0
                return oa !== ob ? oa - ob : a._ev.nombre.localeCompare(b._ev.nombre)
              })
              return (
                <div key={matId}>
                  <h2 className="font-semibold text-base mb-2 pb-1 border-b">{mat.nombre}</h2>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-left text-muted-foreground print:text-gray-600">
                        <th className="pb-1 pr-4 font-medium">Evaluación</th>
                        <th className="pb-1 pr-4 font-medium">Período</th>
                        <th className="pb-1 pr-4 font-medium">Tipo</th>
                        <th className="pb-1 font-medium">Nota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map(nota => (
                        <tr key={nota.id} className="border-t border-muted print:border-gray-200">
                          <td className="py-1.5 pr-4">{nota._ev.nombre}</td>
                          <td className="py-1.5 pr-4 text-muted-foreground print:text-gray-600 capitalize">{nota._ev.periodos?.nombre ?? '—'}</td>
                          <td className="py-1.5 pr-4 text-muted-foreground print:text-gray-600 capitalize">{nota._ev.tipo}</td>
                          <td className="py-1.5 font-semibold">
                            {nota.valor_literal === 'A' ? 'Ausente' : (nota.valor_numerico ?? nota.valor_literal ?? '—')}
                            {nota.observacion && (
                              <span className="block text-xs font-normal text-muted-foreground print:text-gray-500 italic">{nota.observacion}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-xs text-muted-foreground print:text-gray-500 text-center">
          Libreta Digital · {inst.nombre}
        </div>
      </div>
    </div>
  )
}
