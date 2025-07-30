export interface MinimlDef {
    key: string;
    description: string;
    sql?: string;
    join?: string;
}

export interface MinimlModel {
    description: string;
    dialect: string;
    from: string;
    join: Record<string, string>;
    where: string;
    date_field?: string;
    default_date_range?: string;
    include_today?: boolean;
    dimensions: Record<string, MinimlDef>;
    measures: Record<string, MinimlDef>;
    info: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export class SqlValidationError extends Error {
    constructor(
        message: string,
        public violations: string[],
        public suggestions?: string[]
    ) {
        super(message);
        this.name = 'SqlValidationError';
    }
}

/**
 * Recursively extracts column references from an AST node
 */
export function extractFieldReferencesFromNode(node: any, field_set: Set<string>): void {
    if (!node || typeof node !== 'object')
        return;

    // Look for column references
    if (node.type === 'column_ref') {
        // Handle simple string column names
        if (typeof node.column === 'string' && node.column !== '' && node.column !== '*')
            field_set.add(node.column);
        // Handle object-based column references with expr.value
        else if (typeof node.column === 'object' && node.column !== null && 
                 typeof node.column.expr === 'object' && typeof node.column.expr.value === 'string')
            field_set.add(node.column.expr.value);
        
        // Handle qualified references with subFields (schema.table.column)
        if (Array.isArray(node.subFields) && node.subFields.length > 0) {
            // The actual column name is the last subField
            const columnName = node.subFields[node.subFields.length - 1];
            if (typeof columnName === 'string' && columnName !== '')
                field_set.add(columnName);
        }
    }

    // Recursively check child nodes
    for (const key in node) {
        const value = node[key];
        if (Array.isArray(value))
            value.forEach(item => extractFieldReferencesFromNode(item, field_set));
        else if (typeof value === 'object')
            extractFieldReferencesFromNode(value, field_set);
    }
}
