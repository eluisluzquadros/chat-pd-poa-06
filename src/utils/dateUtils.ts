
import { format, subDays, subMonths, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";

export type TimeRange = "7days" | "month" | "year";

export const PDPOA_LAUNCH_DATE = new Date('2025-10-08T00:00:00');

export type Period = 'all' | 'testing' | 'production';

export function getDateRangeByPeriod(period: Period, timeRange: TimeRange): [Date, Date] {
  const [startDate, endDate] = getDateRangeFromFilter(timeRange);
  
  switch (period) {
    case 'testing':
      return [startDate, PDPOA_LAUNCH_DATE];
    case 'production':
      return [PDPOA_LAUNCH_DATE, endDate];
    default:
      return [startDate, endDate];
  }
}

export const getDateRangeFromFilter = (filter: TimeRange): [Date, Date] => {
  const now = new Date();
  
  switch (filter) {
    case "7days":
      return [subDays(now, 7), now];
    case "month":
      return [subMonths(now, 1), now];
    case "year":
      return [startOfYear(now), now];
    default:
      return [subDays(now, 7), now];
  }
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return format(date, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });
};

export const getTimeRangeLabel = (range: TimeRange): string => {
  switch (range) {
    case "7days":
      return "Últimos 7 dias";
    case "month":
      return "Último mês";
    case "year":
      return "Ano atual";
    default:
      return "Últimos 7 dias";
  }
};
