export const getCachedReport = (id: string) => {
  const cached = localStorage.getItem(`wbr_cache_${id}`);
  return cached ? JSON.parse(cached) : null;
};

export const setCachedReport = (id: string, data: any) => {
  localStorage.setItem(`wbr_cache_${id}`, JSON.stringify(data));
};
