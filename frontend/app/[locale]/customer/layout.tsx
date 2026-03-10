import { BottomNav, customerNavItems } from '@/components/mobile/bottom-nav'
import { Sidebar } from '@/components/sidebar'

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar role="customer" />
      <main className="flex-1 md:pl-[260px] flex flex-col min-h-screen w-full">
        {children}
      </main>
      <BottomNav items={customerNavItems} />
    </div>
  )
}
