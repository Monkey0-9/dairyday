import { getTranslations } from 'next-intl/server';
import ConsumptionCalendar from '@/components/consumption-calendar';

export default async function CalendarPage() {
  const t = await getTranslations('Calendar');

  return (
    <div className="container py-8 space-y-8 pb-24">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black font-heading tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="text-muted-foreground">
          {t('description')}
        </p>
      </div>

      <ConsumptionCalendar />
    </div>
  );
}
