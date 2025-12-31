
export const calculateMonthlyBurn = (cost: number, period: string): number => {
    const p = period.toLowerCase();
    if (p === 'monthly') return cost;
    if (p === 'yearly') return cost / 12;
    if (p === 'weekly') return cost * 4.33;
    return 0;
};
