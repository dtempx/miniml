import pkg from "node-sql-parser";
const { Parser } = pkg;
import { MinimlModel } from "./common.js";

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

export class UnsafeConstructError extends SqlValidationError {}
export class UnknownColumnError extends SqlValidationError {}
export class ComplexityLimitError extends SqlValidationError {}

// Safe SQL functions per dialect
const SAFE_FUNCTIONS = {
    bigquery: [
        'UPPER', 'LOWER', 'TRIM', 'LENGTH', 'SUBSTR',
        'DATE', 'TIMESTAMP', 'EXTRACT', 'DATE_TRUNC',
        'COALESCE', 'IFNULL', 'SAFE_CAST', 'CAST',
        'CONCAT', 'REPLACE', 'SPLIT'
    ],
    snowflake: [
        'UPPER', 'LOWER', 'TRIM', 'LENGTH', 'SUBSTRING',
        'TO_DATE', 'TO_TIMESTAMP', 'EXTRACT', 'DATE_TRUNC',
        'COALESCE', 'NVL', 'TRY_CAST', 'CAST',
        'CONCAT', 'REPLACE', 'SPLIT_PART'
    ]
};

// Safe operators and keywords
const SAFE_OPERATORS = [
    '=', '!=', '<>', '>', '<', '>=', '<=',
    'AND', 'OR', 'NOT', 'IS', 'NULL', 'LIKE', 'ILIKE',
    'IN', 'BETWEEN', 'EXISTS'
];

// Dangerous constructs to block
const DANGEROUS_CONSTRUCTS = [
    // DDL statements
    'DROP', 'ALTER', 'CREATE', 'TRUNCATE',
    // DML statements  
    'INSERT', 'UPDATE', 'DELETE', 'MERGE',
    // Schema operations
    'DESCRIBE', 'SHOW', 'EXPLAIN', 'ANALYZE',
    // System functions
    'SYSTEM', 'EXEC', 'EXECUTE', 'CALL', 'LOAD_FILE'
];

// Comment patterns to block (checked separately)
const COMMENT_PATTERNS = ['--', '/*', '*/', '#'];

export function validateSqlExpression(
    expression: string,
    dialect: 'bigquery' | 'snowflake',
    model: MinimlModel
): ValidationResult {
    const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
    };

    if (!expression || expression.trim() === '') {
        return result;
    }

    try {
        // Basic safety checks first
        const basicValidation = performBasicSafetyChecks(expression);
        if (!basicValidation.isValid) {
            return basicValidation;
        }

        // Parse the expression into AST
        const parser = new Parser();
        let ast;
        
        try {
            // Wrap in a dummy SELECT to make it parseable
            const wrappedSql = `SELECT * FROM dummy WHERE ${expression}`;
            ast = parser.astify(wrappedSql);
        } catch (parseError: any) {
            result.isValid = false;
            result.errors.push(`Invalid SQL syntax: ${parseError?.message || 'Unknown parsing error'}`);
            return result;
        }

        // Validate AST structure
        const astValidation = validateAstSafety(ast, dialect);
        if (!astValidation.isValid) {
            return astValidation;
        }

        // Validate column references
        const columnValidation = validateColumnReferences(ast, model);
        if (!columnValidation.isValid) {
            return columnValidation;
        }

    } catch (error: any) {
        result.isValid = false;
        result.errors.push(`Validation error: ${error?.message || 'Unknown validation error'}`);
    }

    return result;
}

export function validateWhereClause(where: string, model: MinimlModel): ValidationResult {
    const dialect = (model.dialect?.toLowerCase() === 'snowflake') ? 'snowflake' : 'bigquery';
    return validateSqlExpression(where, dialect, model);
}

export function validateHavingClause(having: string, model: MinimlModel): ValidationResult {
    const dialect = (model.dialect?.toLowerCase() === 'snowflake') ? 'snowflake' : 'bigquery';
    return validateSqlExpression(having, dialect, model);
}

export function validateDateInput(date: string): boolean {
    if (!date || date.trim() === '') {
        return true; // Empty dates are allowed
    }
    
    // Only allow YYYY-MM-DD format with optional time components
    // Strict validation: exactly 4 digits year, 2 digits month (01-12), 2 digits day (01-31)
    const dateRegex = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(\s([01]\d|2[0-3]):[0-5]\d:[0-5]\d)?$/;
    
    if (!dateRegex.test(date)) {
        return false;
    }
    
    // Additional validation: check if it's a valid date
    const datePart = date.split(' ')[0];
    const parsedDate = new Date(datePart + 'T00:00:00Z');
    const [year, month, day] = datePart.split('-').map(Number);
    
    return parsedDate.getUTCFullYear() === year &&
           parsedDate.getUTCMonth() === month - 1 &&
           parsedDate.getUTCDate() === day;
}

function performBasicSafetyChecks(expression: string): ValidationResult {
    const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
    };


    // Check for dangerous constructs
    for (const construct of DANGEROUS_CONSTRUCTS) {
        const regex = new RegExp(`\\b${construct}\\b`, 'i');
        if (regex.test(expression)) {
            result.isValid = false;
            result.errors.push(`Dangerous SQL construct detected: ${construct}`);
        }
    }

    // Check for comment patterns
    for (const pattern of COMMENT_PATTERNS) {
        if (expression.includes(pattern)) {
            result.isValid = false;
            result.errors.push(`SQL comments are not allowed: ${pattern}`);
        }
    }

    // Check for suspicious patterns
    if (/\bUNION\b/i.test(expression)) {
        result.isValid = false;
        result.errors.push('UNION statements are not allowed in filter expressions');
    }

    if (/\bSELECT\b/i.test(expression)) {
        result.isValid = false;
        result.errors.push('Subqueries are not allowed. Use simple comparisons instead.');
    }

    // Check complexity limits
    if (expression.length > 1000) {
        result.isValid = false;
        result.errors.push('Expression too long. Maximum length is 1000 characters.');
    }

    // Count parentheses depth
    let depth = 0;
    let maxDepth = 0;
    for (const char of expression) {
        if (char === '(') {
            depth++;
            maxDepth = Math.max(maxDepth, depth);
        } else if (char === ')') {
            depth--;
        }
    }
    
    if (maxDepth > 10) {
        result.isValid = false;
        result.errors.push('Expression too complex. Maximum nesting depth is 10 levels.');
    }

    return result;
}

function validateAstSafety(ast: any, dialect: 'bigquery' | 'snowflake'): ValidationResult {
    const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
    };

    const safeFunctions = SAFE_FUNCTIONS[dialect];
    let nodeCount = 0;

    function validateNode(node: any, depth: number = 0): void {
        if (!node || typeof node !== 'object') {
            return;
        }

        nodeCount++;
        
        // Complexity limits
        if (nodeCount > 100) {
            result.isValid = false;
            result.errors.push('Expression too complex. Maximum of 100 AST nodes allowed.');
            return;
        }

        if (depth > 10) {
            result.isValid = false;
            result.errors.push('Expression nesting too deep. Maximum depth is 10 levels.');
            return;
        }

        // Check node types
        if (node.type) {
            switch (node.type.toLowerCase()) {
                case 'select':
                case 'insert':
                case 'update':
                case 'delete':
                case 'create':
                case 'drop':
                case 'alter':
                    result.isValid = false;
                    result.errors.push(`${node.type} statements are not allowed in filter expressions`);
                    return;
            }
        }

        // Check function calls
        if (node.type === 'function' && node.name) {
            const funcName = node.name.toUpperCase();
            if (!safeFunctions.includes(funcName)) {
                result.isValid = false;
                result.errors.push(`Function '${funcName}' is not allowed. Safe functions: ${safeFunctions.join(', ')}`);
                return;
            }
        }

        // Recursively validate child nodes
        for (const key in node) {
            if (key !== 'type' && key !== 'name') {
                const value = node[key];
                if (Array.isArray(value)) {
                    value.forEach(item => validateNode(item, depth + 1));
                } else if (typeof value === 'object') {
                    validateNode(value, depth + 1);
                }
            }
        }
    }

    // Find the WHERE clause in the AST
    if (ast && Array.isArray(ast)) {
        const selectStmt = ast[0];
        if (selectStmt && selectStmt.where) {
            validateNode(selectStmt.where, 0);
        }
    }

    return result;
}

function validateColumnReferences(ast: any, model: MinimlModel): ValidationResult {
    const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
    };

    const availableColumns = new Set([
        ...Object.keys(model.dimensions),
        ...Object.keys(model.measures)
    ]);

    const referencedColumns = new Set<string>();

    function extractColumnReferences(node: any): void {
        if (!node || typeof node !== 'object') {
            return;
        }

        // Look for column references
        if (node.type === 'column_ref' && node.column && node.column !== '*') {
            const columnName = node.column;
            referencedColumns.add(columnName);
        }

        // Recursively check child nodes
        for (const key in node) {
            const value = node[key];
            if (Array.isArray(value)) {
                value.forEach(item => extractColumnReferences(item));
            } else if (typeof value === 'object') {
                extractColumnReferences(value);
            }
        }
    }

    // Extract column references from AST
    if (ast && typeof ast === 'object') {
        // Handle single AST node or array
        const selectStmt = Array.isArray(ast) ? ast[0] : ast;
        if (selectStmt && selectStmt.where) {
            extractColumnReferences(selectStmt.where);
        }
    }

    // Validate all referenced columns exist in model
    for (const column of referencedColumns) {
        if (!availableColumns.has(column)) {
            result.isValid = false;
            const available = Array.from(availableColumns).slice(0, 10).join(', ');
            const totalCount = availableColumns.size;
            const availableText = totalCount > 10 ? `${available} (and ${totalCount - 10} more)` : available;
            result.errors.push(`Column '${column}' not found. Available columns: ${availableText}`);
        }
    }

    return result;
}