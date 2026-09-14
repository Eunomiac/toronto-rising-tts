const uniqueIds = (ids: readonly string[]): string[] => {
  const next: string[] = [];
  for (const id of ids) {
    if (id !== "" && !next.includes(id)) {
      next.push(id);
    }
  }
  return next;
};

export const locationConditionIds = (
  districtConditions: readonly string[] | undefined,
  siteConditions: readonly string[] | undefined
): string[] => uniqueIds([...(districtConditions ?? []), ...(siteConditions ?? [])]);

export const mergeLocationConditions = (
  current: readonly string[],
  previousLocationIds: readonly string[],
  nextLocationIds: readonly string[]
): string[] => {
  const nextSet = new Set(nextLocationIds);
  const prevSet = new Set(previousLocationIds);
  const kept = current.filter((id) => !prevSet.has(id) || nextSet.has(id));
  return uniqueIds([...kept, ...nextLocationIds]);
};
