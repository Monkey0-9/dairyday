import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';
import { PageHeader } from "@/components/page-header"
import { StatsSkeleton, TableSkeleton } from '@/components/skeletons';

const ConsumptionCalendar = dynamic(() => import('@/components/consumption-calendar'), {
  loading: () => <div className="space-y-8 animate-liquid-entrance"><StatsSkeleton count={3} /><TableSkeleton rows={10} cols={7} /></div>,
});

export default async function CalendarPage() {
  const t = await getTranslations('Calendar');

  return (
    <div className="min-h-screen bg-transparent text-foreground selection:bg-primary/40 relative">
      <div className="container mx-auto px-4 py-6 relative z-10 space-y-8">
        <PageHeader
          title={t('title').split(' ')[0]}
          highlight={t('title').split(' ').slice(1).join(' ')}
          subtitle={t('description')}
          badge={t('temporalGrid')}
          badgeIcon={<div className="h-1 w-1 rounded-full bg-primary shadow-glow-primary animate-pulse" />}
        />

        <Suspense fallback={<div className="space-y-8 animate-liquid-entrance"><StatsSkeleton count={3} /><TableSkeleton rows={10} cols={7} /></div>}>
          <ConsumptionCalendar />
        </Suspense>
      </div>

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[1px] h-full bg-foreground" />
        <div className="absolute top-0 left-3/4 w-[1px] h-full bg-foreground" />
        <div className="absolute top-1/4 left-0 w-full h-[1px] bg-foreground" />
        <div className="absolute top-3/4 left-0 w-full h-[1px] bg-foreground" />
      </div>
    </div>
  );
}
