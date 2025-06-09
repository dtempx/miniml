import { MinimlModel } from "./common.js";
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
export declare class SqlValidationError extends Error {
    violations: string[];
    suggestions?: string[] | undefined;
    constructor(message: string, violations: string[], suggestions?: string[] | undefined);
}
export declare class UnsafeConstructError extends SqlValidationError {
}
export declare class UnknownColumnError extends SqlValidationError {
}
export declare class ComplexityLimitError extends SqlValidationError {
}
export declare function validateSqlExpression(expression: string, dialect: 'bigquery' | 'snowflake', model: MinimlModel): ValidationResult;
export declare function validateWhereClause(where: string, model: MinimlModel): ValidationResult;
export declare function validateHavingClause(having: string, model: MinimlModel): ValidationResult;
export declare function validateDateInput(date: string): boolean;
