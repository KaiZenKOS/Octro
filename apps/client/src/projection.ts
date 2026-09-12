export interface ProjectionEvent {
    id: string;
    label: string;
    amount: number;
    day: number;
    direction: 'inflow' | 'outflow';
}

export interface ProjectionResult {
    openingCurrent: number;
    openingSavings: number;
    reserve: number;
    events: ProjectionEvent[];
    dailyBalancesWithoutAction: number[];
    dailyBalancesWithAction: number[];
    lowestBalanceWithoutAction: number;
    lowestDayWithoutAction: number;
    deficit: number;
    recommendedTransfer: number;
    savingsRemaining: number;
    currentBeforeSalaryWithPlan: number;
    feasibility: 'FEASIBLE_NO_DEBT' | 'INFEASIBLE';
    pointsWithoutAction: number[];
    pointsWithProposal: number[];
    timelineDays: number[];
    svg: {
        withoutActionPath: string;
        withActionPath: string;
        reserveY: number;
        viewBoxWidth: number;
        viewBoxHeight: number;
        gridY: number[];
    };
}

export function computeProjection(
    openingCurrent = 650,
    openingSavings = 300,
    reserve = 100,
    events: ProjectionEvent[] = [],
    horizonDays = 30
): ProjectionResult {
    const dailyBalancesWithoutAction = new Array<number>(horizonDays + 1).fill(openingCurrent);
    const sortedEvents = [...events].sort((a, b) => a.day - b.day);

    let running = openingCurrent;
    for (let day = 0; day <= horizonDays; day++) {
        const dayEvents = sortedEvents.filter(e => e.day === day);
        for (const ev of dayEvents) {
            if (ev.direction === 'inflow') {
                running += ev.amount;
            } else {
                running -= ev.amount;
            }
        }
        dailyBalancesWithoutAction[day] = running;
    }

    let lowestBalanceWithoutAction = openingCurrent;
    let lowestDayWithoutAction = 0;
    for (let day = 0; day <= horizonDays; day++) {
        if (dailyBalancesWithoutAction[day]! < lowestBalanceWithoutAction) {
            lowestBalanceWithoutAction = dailyBalancesWithoutAction[day]!;
            lowestDayWithoutAction = day;
        }
    }

    const deficit = lowestBalanceWithoutAction < reserve ? (reserve - lowestBalanceWithoutAction) : 0;
    const recommendedTransfer = deficit;
    const feasibility: 'FEASIBLE_NO_DEBT' | 'INFEASIBLE' = recommendedTransfer <= openingSavings ? 'FEASIBLE_NO_DEBT' : 'INFEASIBLE';
    const savingsRemaining = Math.max(0, openingSavings - recommendedTransfer);

    const dailyBalancesWithAction = new Array<number>(horizonDays + 1).fill(openingCurrent + recommendedTransfer);
    let runningWithPlan = openingCurrent + recommendedTransfer;
    for (let day = 0; day <= horizonDays; day++) {
        const dayEvents = sortedEvents.filter(e => e.day === day);
        for (const ev of dayEvents) {
            if (ev.direction === 'inflow') {
                runningWithPlan += ev.amount;
            } else {
                runningWithPlan -= ev.amount;
            }
        }
        dailyBalancesWithAction[day] = runningWithPlan;
    }

    // Collect days with events, horizon boundary and intermediate ticks
    const daySet = new Set<number>([0, horizonDays]);
    sortedEvents.forEach(e => {
        if (e.day <= horizonDays) daySet.add(e.day);
    });
    const step = horizonDays <= 7 ? 1 : horizonDays <= 14 ? 2 : horizonDays <= 30 ? 5 : 15;
    for (let d = 0; d <= horizonDays; d += step) {
        daySet.add(d);
    }
    const sampledDays = Array.from(daySet).sort((a, b) => a - b);

    const timelineDays = sampledDays.filter(d => d <= horizonDays);
    const pointsWithoutAction = timelineDays.map(d => dailyBalancesWithoutAction[d] ?? openingCurrent);
    const pointsWithProposal = timelineDays.map(d => dailyBalancesWithAction[d] ?? (openingCurrent + recommendedTransfer));
    const currentBeforeSalaryWithPlan = dailyBalancesWithAction[lowestDayWithoutAction] ?? reserve;

    const width = 736;
    const height = 196;
    const paddingY = 24;

    const allVals = [
        ...sampledDays.map(d => dailyBalancesWithoutAction[d] ?? openingCurrent),
        ...sampledDays.map(d => dailyBalancesWithAction[d] ?? (openingCurrent + recommendedTransfer)),
        reserve,
        0
    ];
    const minVal = Math.min(...allVals) - 50;
    const maxVal = Math.max(...allVals) + 150;
    const valRange = maxVal - minVal || 1;

    const scaleX = (d: number) => (Math.min(d, horizonDays) / (horizonDays || 1)) * width;
    const scaleY = (v: number) => height - paddingY - ((v - minVal) / valRange) * (height - 2 * paddingY);

    let withoutActionPath = '';
    sampledDays.forEach((d, i) => {
        const x = scaleX(d);
        const y = scaleY(dailyBalancesWithoutAction[d] ?? openingCurrent);
        withoutActionPath += (i === 0 ? 'M ' : ' L ') + x.toFixed(1) + ' ' + y.toFixed(1);
    });

    let withActionPath = '';
    sampledDays.forEach((d, i) => {
        const x = scaleX(d);
        const y = scaleY(dailyBalancesWithAction[d] ?? (openingCurrent + recommendedTransfer));
        withActionPath += (i === 0 ? 'M ' : ' L ') + x.toFixed(1) + ' ' + y.toFixed(1);
    });

    const reserveY = scaleY(reserve);

    const timelineLabels = horizonDays <= 7
        ? ['Auj.', 'J+1', 'J+2', 'J+4', 'J+6', 'J+7']
        : horizonDays <= 14
        ? ['Auj.', 'J+2', 'J+5', 'J+8', 'J+11', 'J+14']
        : horizonDays <= 30
        ? ['Auj.', 'J+2', 'J+6', 'J+10', 'J+20', 'J+30']
        : ['Auj.', 'J+15', 'J+30', 'J+60', 'J+90'];

    return {
        openingCurrent,
        openingSavings,
        reserve,
        events: sortedEvents,
        dailyBalancesWithoutAction,
        dailyBalancesWithAction,
        lowestBalanceWithoutAction,
        lowestDayWithoutAction,
        deficit,
        recommendedTransfer,
        savingsRemaining,
        currentBeforeSalaryWithPlan,
        feasibility,
        pointsWithoutAction,
        pointsWithProposal,
        timelineDays,
        svg: {
            withoutActionPath,
            withActionPath,
            reserveY,
            viewBoxWidth: width,
            viewBoxHeight: height,
            gridY: [40, 80, 120, 160],
            timelineLabels,
        },
    };
}
