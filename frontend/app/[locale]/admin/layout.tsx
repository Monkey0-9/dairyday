import { BottomNav, adminNavItems } from '@/components/mobile/bottom-nav'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      {children}
      <BottomNav items={adminNavItems} />
    </div>
  )
}
