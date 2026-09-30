export const getDatesFromWeek = (weekNumber: number, year: number = 2026): { startDate: string; endDate: string } => {
  // ISO week 1 starts with the first Thursday of the year
  const jan1 = new Date(year, 0, 1);
  const day = jan1.getDay();
  // Find first Thursday
  let firstThursday = new Date(jan1);
  if (day <= 4) {
    firstThursday.setDate(jan1.getDate() + (4 - day));
  } else {
    firstThursday.setDate(jan1.getDate() + (4 - day) + 7);
  }

  // Get the Monday of week 1
  const week1Monday = new Date(firstThursday);
  week1Monday.setDate(firstThursday.getDate() - 3);

  // Calculate Monday of target week
  const targetMonday = new Date(week1Monday);
  targetMonday.setDate(week1Monday.getDate() + (weekNumber - 1) * 7);

  // Calculate Sunday of target week
  const targetSunday = new Date(targetMonday);
  targetSunday.setDate(targetMonday.getDate() + 6);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  return {
    startDate: formatDate(targetMonday),
    endDate: formatDate(targetSunday)
  };
};
