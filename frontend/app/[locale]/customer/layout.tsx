import { BottomNav, customerNavItems } from '@/components/mobile/bottom-nav'

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      {children}
      <BottomNav items={customerNavItems} />
    </div>
  )
}
