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
    always_join?: string[];
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
export declare class SqlValidationError extends Error {
    violations: string[];
    suggestions?: string[] | undefined;
    constructor(message: string, violations: string[], suggestions?: string[] | undefined);
}
export declare function extractFieldReferencesFromNode(node: any, field_set: Set<string>): void;
