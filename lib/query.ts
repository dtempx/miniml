import { MinimlDef, MinimlModel, SqlValidationError } from "./common.js";
import { validateWhereClause, validateHavingClause, validateDateInput } from "./validation.js";
import { extractFieldReferences } from "./parse.js";

export interface MinimlQueryOptions {
    dimensions?: string[];
    measures?: string[];
    date_from?: string;
    date_to?: string;
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
    const where_refs = extractFieldReferences(where, model);
    const having_refs = extractFieldReferences(having, model);

    validateQueryInfo(model, dimensions, measures, where_refs, having_refs, order_by);
    
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

    const dimension_fields = dimensions.map(key => model.dimensions[key].sql);
    const measure_fields = measures.map(key => model.measures[key].sql);

    // Truncate the date field if a date granularity is specified
    if (date_granularity) {
        const i = dimension_fields.findIndex(key => key === model.date_field);
        if (i >= 0)
            dimension_fields[i] = `DATE_TRUNC('${date_granularity.toUpperCase()}', ${model.date_field}) AS ${model.date_field}`;
    }

    // Determine the unique set of joins based on the references to dimensions and measures
    const join_keys = Array.from(new Set([
        ...dimensions.map(key => model.dimensions[key].join!).filter(Boolean),
        ...measures.map(key => model.measures[key].join!).filter(Boolean),
        ...where_refs.map(key => model.dimensions[key].join!).filter(Boolean),
        ...having_refs.map(key => model.measures[key].join!).filter(Boolean)
    ]));
    
    // Validate that all referenced joins are defined
    const undefined_joins = join_keys.filter(key => !model.join[key]);
    if (undefined_joins.length > 0)
        throw new SqlValidationError(
            `Undefined join reference: ${undefined_joins.join(', ')}`,
            [`Undefined join reference: ${undefined_joins.join(', ')}`],
            ['Add the missing join definitions to your model', 'Check for typos in join references']
        );
    
    const joins = join_keys.map(key => model.join[key]);

    const group_by = dimensions.length > 0 && measures.length > 0;
    const query = [
        distinct && !group_by ? "SELECT DISTINCT" : "SELECT",
        [
            ...dimension_fields,
            ...measure_fields
        ].map(text => `  ${text}`).join(",\n"),
        `FROM ${model.from}`,
        ...joins
    ];

    const where_clause = [];
    if (model.date_field) {
        if (date_from && date_to)
            where_clause.push(`${model.date_field} BETWEEN '${date_from}' AND '${date_to}'`);
        else if (date_from)
            where_clause.push(`${model.date_field} >= '${date_from}'`);
        else if (date_to)
            where_clause.push(`${model.date_field} <= '${date_to}'`);
        else {
            const days = model.default_date_range_days ?? 30;
            where_clause.push(`${model.date_field} >= DATEADD(DAY, -${days}, CURRENT_DATE)`);
        }
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
        where_clause.push(`(${expandWhereReferences(where, model.dimensions, dimensions)})`);
    }
        
    if (model.where)
        where_clause.push(`(${model.where})`);

    if (where_clause.length > 0)
        query.push(`WHERE ${where_clause.join("\nAND ")}`);

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
        query.push(`HAVING ${expandWhereReferences(having, model.measures, measures)}`);
    }

    if (order_by.length > 0)
        query.push(`ORDER BY ${order_by.map(key => !key.startsWith("-") ? key : `${key.slice(1)} DESC`).join(", ")}`);

    if (limit && !isNaN(limit) && limit > 0)
        query.push(`LIMIT ${limit}`);

    return query.filter(Boolean).join("\n");
}

// Replaces specific keys in a where clause with their corresponding SQL expressions
// from a dictionary, but only for keys not listed in the references array and where the
// SQL expression is a valid function-wrapped expression.
function expandWhereReferences(where_clause: string, dictionary: Record<string, MinimlDef>, references: string[]): string {
    let result = where_clause;
    if (result) {
        // narrow to keys that are not a member of references
        const keys = Object.keys(dictionary).filter(key => !references.includes(key));
        for (const key of keys) {
            const regexp = new RegExp(`\\b${key}\\b`);
            if (regexp.test(where_clause)) {
                const { sql } = dictionary[key];
                // unwrap the SQL expression without the alias
                const unwrapped = sql?.includes(" AS ") ? sql.slice(0, sql.lastIndexOf(" AS ")).trim() : undefined;
                if (unwrapped)
                    result = result.replaceAll(key, unwrapped); // replace key with sql expression
            }
        }
    }
    return result;
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
