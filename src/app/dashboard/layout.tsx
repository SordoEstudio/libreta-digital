import { requireSession } from '@/lib/auth'
import { AppSidebar } from '@/components/app-sidebar'
import { MobileHeader } from '@/components/mobile-header'
import { BottomTabBar } from '@/components/bottom-tab-bar'
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()

  return (
    <SidebarProvider>
      <AppSidebar session={session} />
      <SidebarInset>
        <MobileHeader session={session} />
        <main className="flex flex-1 flex-col gap-6 p-6 pb-24 md:pb-6">
          {children}
        </main>
        <BottomTabBar session={session} />
      </SidebarInset>
    </SidebarProvider>
  )
}
