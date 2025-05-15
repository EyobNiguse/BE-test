export function updateAggregates(results: Record<string, number>, row: any): void {
    const department = row[0];
    const sales = parseInt(row[2], 10) || 0;

    if (!department) return;

    results[department] = (results[department] || 0) + sales;
}
