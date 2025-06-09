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
