'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator, SidebarTrigger,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { SessionUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'
import {
  Building2, BarChart3, LayoutDashboard, GraduationCap,
  BookOpen, LogOut, Settings, Library, BookMarked, MessageSquare, Layers, NotebookPen,
  FolderOpen, FileText, HelpCircle, ClipboardCheck, UserCog, UsersRound, Activity,
} from 'lucide-react'
import { NotificationBell } from '@/components/notification-bell'

interface AppSidebarProps {
  session: SessionUser
}

export function AppSidebar({ session }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const slugMatch = pathname.match(/^\/dashboard\/([^/]+)/)
  const activeSlug = slugMatch?.[1]

  const [logoCuadrado, setLogoCuadrado] = useState<string | null>(null)
  const [logoutOpen, setLogoutOpen] = useState(false)
  useEffect(() => {
    if (!activeSlug) { setLogoCuadrado(null); return }
    fetch(`/api/v1/instituciones/branding?slug=${activeSlug}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setLogoCuadrado(d?.data?.logo_cuadrado_url ?? null))
      .catch(() => {})
  }, [activeSlug])

  const isSuperadmin = session.memberships.some(m => m.rol === 'superadmin')
  const isAdmin = !!activeSlug && session.memberships.some(m => m.rol === 'admin')
  const isDocente = !!activeSlug && session.memberships.some(m => m.rol === 'docente')
  const isResponsable = !!activeSlug && session.memberships.some(m => m.rol === 'responsable')
  const isAdminLevel = isAdmin || isSuperadmin

  const initials = (session.nombre ?? session.email)
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          {logoCuadrado ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoCuadrado} alt="" className="size-7 rounded-md object-contain shrink-0 group-data-[collapsible=icon]:hidden bg-white" />
          ) : (
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-harvi-green-lime group-data-[collapsible=icon]:hidden">
              <span className="text-[11px] font-black text-harvi-dark leading-none">LD</span>
            </div>
          )}
          <div className="flex flex-col flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold leading-tight text-white truncate">Libreta.digital</span>
            <span className="text-[10px] text-white/50 leading-tight">by Harvi</span>
          </div>
          <SidebarTrigger className="shrink-0 text-white/60 hover:text-white hover:bg-white/10 group-data-[collapsible=icon]:mx-auto" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Superadmin */}
        {isSuperadmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Superadmin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href="/dashboard/instituciones" />}
                    isActive={pathname.startsWith('/dashboard/instituciones')}
                  >
                    <Building2 />
                    Instituciones
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href="/dashboard/stats" />}
                    isActive={pathname === '/dashboard/stats'}
                  >
                    <BarChart3 />
                    Estadísticas
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Institución — operativo */}
        {activeSlug && (isAdminLevel || isDocente || isResponsable) && (
          <SidebarGroup className="pt-0">
            {isSuperadmin && <SidebarSeparator className="mb-2 group-data-[collapsible=icon]:hidden" />}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href={`/dashboard/${activeSlug}`} />}
                    isActive={pathname === `/dashboard/${activeSlug}`}
                  >
                    <LayoutDashboard />
                    Inicio
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {isAdminLevel && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={<Link href={`/dashboard/${activeSlug}/cursos`} />}
                      isActive={pathname.startsWith(`/dashboard/${activeSlug}/cursos`)}
                    >
                      <BookOpen />
                      Cursos
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {isDocente && !isAdminLevel && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={<Link href={`/dashboard/${activeSlug}/cursos`} />}
                      isActive={pathname.startsWith(`/dashboard/${activeSlug}/cursos`)}
                    >
                      <BookOpen />
                      Mis materias
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {isResponsable && !isAdminLevel && !isDocente && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        render={<Link href={`/dashboard/${activeSlug}/contenidos`} />}
                        isActive={pathname.startsWith(`/dashboard/${activeSlug}/contenidos`)}
                      >
                        <FolderOpen />
                        Contenidos
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        render={<Link href={`/dashboard/${activeSlug}/comunicados`} />}
                        isActive={pathname.startsWith(`/dashboard/${activeSlug}/comunicados`)}
                      >
                        <MessageSquare />
                        Comunicados
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        render={<Link href={`/dashboard/${activeSlug}/mis-alumnos`} />}
                        isActive={pathname.startsWith(`/dashboard/${activeSlug}/mis-alumnos`) || pathname.startsWith(`/dashboard/${activeSlug}/libreta`)}
                      >
                        <FileText />
                        Boletines
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}

                {(isAdminLevel || isDocente) && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={<Link href={`/dashboard/${activeSlug}/cuaderno`} />}
                      isActive={pathname.startsWith(`/dashboard/${activeSlug}/cuaderno`)}
                    >
                      <NotebookPen />
                      Cuaderno
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {(isAdminLevel || isDocente) && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={<Link href={`/dashboard/${activeSlug}/comunicados`} />}
                      isActive={pathname.startsWith(`/dashboard/${activeSlug}/comunicados`)}
                    >
                      <MessageSquare />
                      Comunicados
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Configuración — admin only */}
        {activeSlug && isAdminLevel && (
          <SidebarGroup className="pt-0">
            <SidebarSeparator className="mb-2 group-data-[collapsible=icon]:hidden" />
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href={`/dashboard/${activeSlug}/configuracion`} />}
                    isActive={pathname.startsWith(`/dashboard/${activeSlug}/configuracion`)}
                  >
                    <Settings />
                    Años y cursos
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href={`/dashboard/${activeSlug}/materias`} />}
                    isActive={pathname.startsWith(`/dashboard/${activeSlug}/materias`)}
                  >
                    <Library />
                    Materias
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href={`/dashboard/${activeSlug}/evaluaciones-institucionales`} />}
                    isActive={pathname.startsWith(`/dashboard/${activeSlug}/evaluaciones-institucionales`)}
                  >
                    <BookMarked />
                    Ev. institucionales
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href={`/dashboard/${activeSlug}/configuracion/dimension-plantillas`} />}
                    isActive={pathname.startsWith(`/dashboard/${activeSlug}/configuracion/dimension-plantillas`)}
                  >
                    <Layers />
                    Dim. plantillas
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href={`/dashboard/${activeSlug}/alumnos`} />}
                    isActive={pathname.startsWith(`/dashboard/${activeSlug}/alumnos`)}
                  >
                    <GraduationCap />
                    Alumnos
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href={`/dashboard/${activeSlug}/personal`} />}
                    isActive={pathname.startsWith(`/dashboard/${activeSlug}/personal`)}
                  >
                    <UserCog />
                    Personal
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href={`/dashboard/${activeSlug}/responsables`} />}
                    isActive={pathname.startsWith(`/dashboard/${activeSlug}/responsables`)}
                  >
                    <UsersRound />
                    Responsables
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href={`/dashboard/${activeSlug}/acuses`} />}
                    isActive={pathname.startsWith(`/dashboard/${activeSlug}/acuses`)}
                  >
                    <ClipboardCheck />
                    Acuses
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href={`/dashboard/${activeSlug}/actividad`} />}
                    isActive={pathname.startsWith(`/dashboard/${activeSlug}/actividad`)}
                  >
                    <Activity />
                    Actividad
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1 overflow-hidden">
              <Avatar className="size-7 shrink-0 overflow-hidden">
                <AvatarFallback className="text-xs bg-harvi-green-lime text-harvi-dark font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <span className="text-xs font-medium text-white truncate">{session.nombre ?? session.email}</span>
                <span className="text-xs text-white/60 truncate">{session.email}</span>
              </div>
              <button
                onClick={() => setLogoutOpen(true)}
                className="shrink-0 text-white/40 hover:text-white/80 transition-colors group-data-[collapsible=icon]:hidden"
                title="Cerrar sesión"
              >
                <LogOut className="size-3.5" />
              </button>
            </div>
          </SidebarMenuItem>
          {activeSlug && (
            <SidebarMenuItem>
              <NotificationBell />
            </SidebarMenuItem>
          )}
          {activeSlug && (
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href={`/dashboard/${activeSlug}/ayuda`} />}
                isActive={pathname.startsWith(`/dashboard/${activeSlug}/ayuda`)}
              >
                <HelpCircle />
                Ayuda
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem className="group-data-[collapsible=icon]:block hidden">
            <SidebarMenuButton onClick={() => setLogoutOpen(true)}>
              <LogOut />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="¿Cerrar sesión?"
        description="Tu sesión se cerrará en este dispositivo."
        confirmLabel="Cerrar sesión"
        destructive={false}
        onConfirm={handleLogout}
      />
    </Sidebar>
  )
}
