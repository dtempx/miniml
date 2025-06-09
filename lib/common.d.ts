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
    date_field: string;
    default_date_range_days?: number;
    dimensions: Record<string, MinimlDef>;
    measures: Record<string, MinimlDef>;
    info: string;
}
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
