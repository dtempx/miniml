import { MinimlDef, MinimlModel, SqlValidationError } from "./common.js";
import { validateWhereClause, validateHavingClause, validateDateInput } from "./validation.js";
import { extractFieldReferences } from "./parse.js";
import { constructDateRangeExpression, constructDateTruncExpression, normalizeQuotesForBigQuery } from "./dialect.js"

export interface MinimlQueryOptions {
    dimensions?: string[];
    measures?: string[];
    date_from?: string | null;
    date_to?: string | null;
    where?: string;
    having?: string;
    order_by?: string[];
    limit?: number;
    distinct?: boolean;
    date_granularity?: string;
}

export function renderQuery(model: MinimlModel, {
    dimensions = [],
    measures = [],
    date_from,
    date_to,
    where,
    having,
    order_by = [],
    limit,
    distinct,
    date_granularity
}: MinimlQueryOptions): string {
    if (model.dialect === "bigquery") {
        where = normalizeQuotesForBigQuery(where);
        having = normalizeQuotesForBigQuery(having);
    }

    const where_refs = extractFieldReferences(where, model);
    const having_refs = extractFieldReferences(having, model);

    validateQueryInfo(model, dimensions, measures, where_refs, having_refs, order_by);

    // An order_by key must be part of the SELECT list to be groupable and
    // referenceable; ordering by an unselected column is invalid under GROUP BY
    // and unresolvable otherwise. Auto-include it (matches time-series intent).
    for (const raw of order_by) {
        const key = raw.startsWith("-") ? raw.slice(1) : raw;
        if (model.dimensions[key]) {
            if (!dimensions.includes(key)) dimensions = [...dimensions, key];
        } else if (model.measures[key] && !measures.includes(key))
            measures = [...measures, key];
    }

    // When neither dimensions nor measures are specified, project every dimension
    // and measure defined by the model rather than emitting SELECT *. The model is
    // the contract: SELECT * leaks raw table columns, ignores dimension SQL
    // expressions and aliases, and pulls nothing from joins.
    if (dimensions.length === 0 && measures.length === 0) {
        dimensions = Object.keys(model.dimensions);
        measures = Object.keys(model.measures);
    }

    // Validate date inputs to prevent SQL injection
    if (date_from && !validateDateInput(date_from))
        throw new SqlValidationError(
            `Invalid date_from format: ${date_from}`,
            ['Invalid date format'],
            ['Use YYYY-MM-DD format (e.g., "2024-01-01")']
        );
    
    if (date_to && !validateDateInput(date_to))
        throw new SqlValidationError(
            `Invalid date_to format: ${date_to}`,
            ['Invalid date format'],
            ['Use YYYY-MM-DD format (e.g., "2024-01-31")']
        );

    // Determine the unique set of joins based on the references to dimensions and measures
    const referenced_joins = new Set([
        ...dimensions.map(key => model.dimensions[key].join!).filter(Boolean),
        ...measures.map(key => model.measures[key].join!).filter(Boolean),
        ...where_refs.map(key => model.dimensions[key].join!).filter(Boolean),
        ...having_refs.map(key => model.measures[key].join!).filter(Boolean)
    ]);
    
    // Add always_join joins to the set of required joins
    const always_joins = new Set(model.always_join || []);
    const all_required_joins = new Set([...referenced_joins, ...always_joins]);
    
    // Validate that all referenced joins are defined
    const undefined_joins = Array.from(all_required_joins).filter(key => !model.join[key]);
    if (undefined_joins.length > 0)
        throw new SqlValidationError(
            `Undefined join reference: ${undefined_joins.join(', ')}`,
            [`Undefined join reference: ${undefined_joins.join(', ')}`],
            ['Add the missing join definitions to your model', 'Check for typos in join references']
        );
    
    // Get joins in the order they are defined in the YAML, filtering to only those that are required
    const joins = Object.keys(model.join)
        .filter(key => all_required_joins.has(key))
        .map(key => model.join[key]);

    const dimension_fields = dimensions.map(key => {
        if (key === model.date_field && date_granularity)
            return applyDateGranularity(date_granularity, key, model.dimensions[key].sql!, model.dialect);
        const sql = model.dimensions[key].sql!;
        return sql !== key && !/\sAS\s/i.test(sql) ? `${sql} AS ${key}` : sql;
    });
    // Include any measure referenced in HAVING that was not explicitly selected,
    // so its alias exists in the SELECT list for the HAVING clause to reference.
    // (HAVING emits the alias rather than re-expanding the aggregate SQL — see below.)
    const projected_measures = [...measures, ...having_refs.filter(key => !measures.includes(key))];
    const measure_fields = projected_measures.map(key => model.measures[key].sql);
    const group_by = dimensions.length > 0 && projected_measures.length > 0;
    const select_list = [...dimension_fields, ...measure_fields];
    if (select_list.length === 0)
        throw new SqlValidationError(
            "Model defines no dimensions or measures to select",
            ['Model defines no dimensions or measures to select'],
            ['Add dimensions or measures to your model', 'Specify dimensions or measures in the query']
        );
    const query = [
        (distinct && !group_by ? "SELECT DISTINCT\n" : "SELECT\n") + select_list.map(text => `  ${text}`).join(",\n"),
        `FROM ${model.from}`,
        ...joins
    ];

    const where_clause: string[] = [];
    if (model.date_field) {
        // Use a half-open range [date_from, date_to + 1 day) rather than
        // BETWEEN 'date_from' AND 'date_to'. On a TIMESTAMP column the inclusive
        // upper bound only matches midnight of date_to, so any single-day range
        // (date_from === date_to) returns no rows. Adding a day and using an
        // exclusive upper bound captures the whole date_to day.
        //
        // The upper bound is emitted as a bare next-day string literal (e.g.
        // < '2026-06-27') rather than DATE_ADD('2026-06-26', INTERVAL 1 DAY).
        // DATE_ADD forces a DATE result, which fails against a TIMESTAMP column
        // ("No matching signature for operator <: TIMESTAMP, DATE"); a bare
        // literal coerces to whichever type the column is, so this works for
        // both DATE and TIMESTAMP date_fields with no per-model configuration.
        // Strip any time component from the lower bound too: a DATE column cannot
        // be compared against a datetime literal ("Could not cast literal
        // '2026-06-21 00:00:00' to type DATE"), and for a TIMESTAMP column a
        // date-only literal coerces to midnight — the intended day boundary.
        const from = date_from ? date_from.slice(0, 10) : date_from;
        if (from && date_to) {
            where_clause.push(`${model.date_field} >= '${from}' AND ${model.date_field} < '${nextDayLiteral(date_to)}'`);
        } else if (from)
            where_clause.push(`${model.date_field} >= '${from}'`);
        else if (date_to)
            where_clause.push(`${model.date_field} < '${nextDayLiteral(date_to)}'`);
        else if (model.default_date_range && date_from !== null && date_from !== null)
            appendDefaultDateRange(where_clause, model); // add a default date range, but only if null was not specified for date_from or date_to
    }

    if (where) {
        const validation = validateWhereClause(where, model);
        if (!validation.ok) {
            throw new SqlValidationError(
                `Invalid WHERE clause: ${validation.errors.join(', ')}`,
                validation.errors,
                ['Use simple comparisons like "column = value"', 'Check column names against your model']
            );
        }
        where_clause.push(`(${where})`);
    }
        
    if (model.where)
        where_clause.push(`(${model.where})`);

    if (where_clause.length > 0)
        query.push(`WHERE ${expandWhereReferences(where_clause.join("\nAND "), model.dimensions)}`);
        

    if (group_by)
        query.push("GROUP BY ALL");

    if (having) {
        const validation = validateHavingClause(having, model);
        if (!validation.ok) {
            throw new SqlValidationError(
                `Invalid HAVING clause: ${validation.errors.join(', ')}`,
                validation.errors,
                ['Use simple comparisons like "measure > value"', 'Reference only measures defined in your model']
            );
        }
        // Reference measure aliases directly rather than re-expanding their SQL.
        // Re-expanding a ratio-of-aggregates measure (e.g. SAFE_DIVIDE(SUM(a), SUM(b)))
        // into HAVING produces "aggregations of aggregations" errors; the measure keys
        // already equal their SELECT-list aliases, which both BigQuery and Snowflake
        // accept in HAVING. This mirrors how ORDER BY references aliases below.
        query.push(`HAVING ${having}`);
    }

    if (order_by.length > 0)
        query.push(`ORDER BY ${order_by.map(key => !key.startsWith("-") ? key : `${key.slice(1)} DESC`).join(", ")}`);

    if (limit && !isNaN(limit) && limit > 0)
        query.push(`LIMIT ${limit}`);

    return query.filter(Boolean).join("\n");
}

// Return the date one day after the given date literal, as a bare YYYY-MM-DD
// string. Any time component on the input is dropped (a DATE column cannot be
// compared against a datetime literal). Uses UTC arithmetic so the result is
// independent of the host timezone. Input is already validated as
// YYYY-MM-DD(' 'HH:MM:SS)? upstream (validateDateInput).
function nextDayLiteral(date: string): string {
    const [y, m, d] = date.slice(0, 10).split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    return next.toISOString().slice(0, 10);
}

function appendDefaultDateRange(where_clause: string[], model: MinimlModel): void {
    if (!model.date_field || !model.default_date_range || !model.dialect)
        return;

    let result: RegExpMatchArray | null;

    const is_date = model.date_type?.toUpperCase() === "DATE";

    // last 30 days, last 90 days, etc.
    result = model.default_date_range.match(/^last\s+(\d+)\s+(hours?|days?|weeks?|months?|years?|years)$/i);
    if (result)
        where_clause.push(constructDateRangeExpression(model.dialect, model.date_field, parseInt(result[1]), result[2], model.include_today ?? true, is_date));
}

function applyDateGranularity(date_granularity: string, key: string, date_expr: string, dialect: string): string {
    const [expr, alias] = unwrapSqlExpressionAlias(date_expr);
    const expr_trunc = constructDateTruncExpression(dialect, expr, date_granularity || "DAY");
    return `${expr_trunc} AS ${alias ?? key}`;
}

// Replaces specific keys in a where clause with their corresponding SQL expressions
// from a dictionary, but only for keys where the SQL expression is a valid function-wrapped expression.
function expandWhereReferences(where_clause: string, dictionary: Record<string, MinimlDef>): string {
    if (!where_clause)
        return where_clause;
    let result = where_clause;
    for (const key of Object.keys(dictionary)) {
        const regexp = new RegExp(`\\b${key}\\b`, "g");
        if (regexp.test(where_clause)) {
            const { sql } = dictionary[key];
            if (sql !== key) {
                // unwrap the SQL expression without the alias
                const unwrapped = sql?.includes(" AS ") ? sql.slice(0, sql.lastIndexOf(" AS ")).trim() : undefined;
                if (unwrapped)
                    result = result.replaceAll(regexp, unwrapped); // replace key with sql expression
            }
        }
    }
    return result;
}

function unwrapSqlExpressionAlias(exprression: string): [string] | [string, string] {
    const i = exprression.toUpperCase().lastIndexOf(" AS ");
    if (i > 0) {
        const expression = exprression.slice(0, i).trim();
        const alias = exprression.slice(i + 4).trim();
        return [expression, alias];
    }
    return [exprression];
}

function validateKeys(keys: string[], dictionary: string[]): string[] {
    return keys.filter(key => !dictionary.includes(key));
}

function validateQueryInfo(model: MinimlModel, dimensions: string[], measures: string[], where: string[], having: string[], order_by: string[]): void {
    const invalid_dimensions = validateKeys(dimensions, Object.keys(model.dimensions));
    const invalid_measures = validateKeys(measures, Object.keys(model.measures));
    const invalid_where = validateKeys(where, Object.keys(model.dimensions));
    const invalid_having = validateKeys(having, Object.keys(model.measures));
    const invalid_order = validateKeys(order_by.map(key => key.startsWith("-") ? key.slice(1) : key), [...Object.keys(model.dimensions), ...Object.keys(model.measures)]);

    const errors = [];
    if (invalid_dimensions.length > 0)
        errors.push(`- dimensions: ${invalid_dimensions.join(", ")}`);
    if (invalid_measures.length > 0)
        errors.push(`- measures: ${invalid_measures.join(", ")}`);
    if (invalid_where.length > 0)
        errors.push(`- where: ${invalid_where.join(", ")}`);
    if (invalid_having.length > 0)
        errors.push(`- having: ${invalid_having.join(", ")}`);
    if (invalid_order.length > 0)
        errors.push(`- order_by: ${invalid_order.join(", ")}`);
    if (errors.length > 0)
        throw new SqlValidationError(
            `The following keys are invalid:\n${errors.join("\n")}`,
            errors,
            ['Check that all referenced keys exist in your model']
        );
}
