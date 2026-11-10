export const getWeekNumber = (dateStr: string): number => {
  if (!dateStr) return 40;
  // Parse year, month, day explicitly to avoid timezone shift into prior day
  const parts = dateStr.split('-');
  if (parts.length < 3) return 40;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(Date.UTC(year, month, day));
  if (isNaN(d.getTime())) return 40;

  // ISO week date week number: Thursday in current week decides the year
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
};

export const getDatesFromWeek = (weekNumber: number, year: number = 2026): { startDate: string; endDate: string } => {
  // ISO week 1 starts with the first Thursday of the year
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const day = jan1.getUTCDay();
  // Find first Thursday
  let firstThursday = new Date(jan1);
  if (day <= 4 && day !== 0) {
    firstThursday.setUTCDate(jan1.getUTCDate() + (4 - day));
  } else {
    firstThursday.setUTCDate(jan1.getUTCDate() + (day === 0 ? 4 : (4 - day + 7)));
  }

  // Get the Monday of week 1
  const week1Monday = new Date(firstThursday);
  week1Monday.setUTCDate(firstThursday.getUTCDate() - 3);

  // Calculate Monday of target week
  const targetMonday = new Date(week1Monday);
  targetMonday.setUTCDate(week1Monday.getUTCDate() + (weekNumber - 1) * 7);

  // Calculate Sunday of target week
  const targetSunday = new Date(targetMonday);
  targetSunday.setUTCDate(targetMonday.getUTCDate() + 6);

  const formatDate = (d: Date) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${dayStr}`;
  };

  return {
    startDate: formatDate(targetMonday),
    endDate: formatDate(targetSunday)
  };
};

export const formatDateSA = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

