export function constructLastNDaysExpression(dialect: string, date_field: string, num: number, date_part: string, include_today?: boolean): string {
    let expression = `${date_field} >= ${constructDateSubExpression(dialect, date_field, num, date_part)}`;
    if (!include_today)
        expression += ` AND ${date_field} < ${constructDateSubExpression(dialect, "CURRENT_TIMESTAMP", 1, date_part)}`;
    return expression;
}

export function constructDateTruncExpression(dialect: string, date_expr: string, date_granularity: string): string {
    date_expr = date_expr.trim();
    date_granularity = date_granularity.trim().toUpperCase();
    if (!["MINUTE", "HOUR", "DAY", "WEEK", "MONTH", "QUARTER", "YEAR"].includes(date_granularity))
        throw new Error(`Invalid date_granularity "${date_granularity}"`);
    if (dialect === "bigquery")
        return `DATE_TRUNC(${date_expr}, ${date_granularity})`;
    else if (dialect)
        return `DATE_TRUNC(${date_granularity}, ${date_expr})`;
    else
        throw new Error(`Invalid dialect "${dialect}"`);
}

export function constructDateSubExpression(dialect: string, date_field: string, num: number, date_part: string): string {
    date_part = parseDatePart(date_part);
    if (dialect === "bigquery")
        return `DATE_SUB(${date_field}, INTERVAL ${num} ${date_part})`;
    else if (dialect)
        return `DATEADD(${date_part}, -${num}, ${date_field})`;
    else
        throw new Error(`Invalid dialect "${dialect}"`);
}

function parseDatePart(text: string): string {
    if (/^days?$/i.test(text))
        return "DAY";
    else if (/^weeks?$/i.test(text))
        return "WEEK";
    else if (/^months?$/i.test(text))
        return "MONTH";
    else if (/^years?$/i.test(text))
        return "YEAR";
    else if (/^hours?$/i.test(text))
        return "HOUR";
    else if (/^minutes?$/i.test(text))
        return "MINUTE";
    else if (/^seconds?$/i.test(text))
        return "SECOND";
    else
        throw new Error(`Invalid date part "${text}"`);
}
