import { MinimlModel } from "./common.js";
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
export declare function renderQuery(model: MinimlModel, { dimensions, measures, date_from, date_to, where, having, order_by, limit, distinct, date_granularity }: MinimlQueryOptions): string;
