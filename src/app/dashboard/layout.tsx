import { requireSession } from '@/lib/auth'
import { AppSidebar } from '@/components/app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()

  return (
    <SidebarProvider>
      <AppSidebar session={session} />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <BreadcrumbNav />
        </header>
        <main className="flex flex-1 flex-col gap-6 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
