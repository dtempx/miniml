export function constructCurrentTimeOffsetExpression(dialect: string, date_offset: number, date_part: string): string {
    date_part = parseDatePart(date_part);
    if (dialect === "bigquery")
        return `CURRENT_TIMESTAMP - INTERVAL ${date_offset} ${date_part}`;
    else if (dialect == "snowflake")
        return `CURRENT_TIMESTAMP - INTERVAL '${date_offset} ${date_part}'`;
    else
        throw new Error(`Invalid dialect "${dialect}"`);
}

export function constructDateRangeExpression(dialect: string, date_field: string, date_offset: number, date_part: string, include_today?: boolean): string {
    let expression = `${date_field} >= ${constructCurrentTimeOffsetExpression(dialect, date_offset, date_part)}`;
    if (!include_today)
        expression += ` AND ${date_field} < ${constructTodayAtMidnightExpression(dialect)}`;
    return expression;
}

export function constructDateTruncExpression(dialect: string, date_expr: string, date_granularity: string): string {
    date_expr = date_expr.trim();
    date_granularity = date_granularity.trim().toUpperCase();
    if (!["MINUTE", "HOUR", "DAY", "WEEK", "MONTH", "QUARTER", "YEAR"].includes(date_granularity))
        throw new Error(`Invalid date_granularity "${date_granularity}"`);
    if (dialect === "bigquery")
        return `DATE_TRUNC(${date_expr}, ${date_granularity})`;
    else if (dialect === "snowflake")
        return `DATE_TRUNC(${date_granularity}, ${date_expr})`;
    else
        throw new Error(`Invalid dialect "${dialect}"`);
}

export function constructDateSubExpression(dialect: string, date_field: string, num: number, date_part: string): string {
    date_part = parseDatePart(date_part);
    if (dialect === "bigquery")
        return `DATE_SUB(${date_field}, INTERVAL ${num} ${date_part})`;
    else if (dialect === "snowflake")
        return `DATEADD(${date_part}, -${num}, ${date_field})`;
    else
        throw new Error(`Invalid dialect "${dialect}"`);
}

export function constructTodayAtMidnightExpression(dialect: string): string {
    if (dialect === "bigquery")
        return `DATE_TRUNC(CURRENT_TIMESTAMP, DAY)`;
    else if (dialect === "snowflake")
        return `DATE_TRUNC('DAY', CURRENT_TIMESTAMP)`;
    else
        throw new Error(`Invalid dialect "${dialect}"`);
}

// BigQuery does not support SQL-standard doubled-quote escaping ('') inside
// string literals — it parses 'a''b' as two adjacent literals and errors with
// "concatenated string literals must be separated by whitespace". Convert
// doubled single quotes within single-quoted strings to BigQuery's backslash
// escaping (\') so agent-generated WHERE/HAVING clauses just work.
export function normalizeQuotesForBigQuery(expression?: string): string | undefined {
    if (!expression)
        return expression;
    let result = "";
    let inSingle = false, inDouble = false;
    for (let i = 0; i < expression.length; i++) {
        const ch = expression[i];
        if (inSingle) {
            if (ch === "\\") {                                  // keep existing \x escape
                result += ch + (expression[i + 1] ?? ""); i++;
            } else if (ch === "'" && expression[i + 1] === "'") {
                result += "\\'"; i++;                           // '' -> \'
            } else {
                result += ch;
                if (ch === "'") inSingle = false;              // closing quote
            }
        } else if (inDouble) {                                  // pass through "..." untouched
            result += ch;
            if (ch === "\\") { result += expression[i + 1] ?? ""; i++; }
            else if (ch === '"') inDouble = false;
        } else {
            result += ch;
            if (ch === "'") inSingle = true;
            else if (ch === '"') inDouble = true;
        }
    }
    return result;
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
