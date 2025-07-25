import pkg from "node-sql-parser";
const { Parser } = pkg;
import { extractFieldReferencesFromNode, MinimlModel } from "./common.js";

/**
 * Extracts field references from a SQL expression (where/having clause)
 * and returns the join keys needed for those field
 */
export function extractFieldReferences(expression: string | undefined, model: MinimlModel): string[] {
    if (!expression?.trim())
        return [];

    let ast;
    try {
        const parser = new Parser();
        // Wrap in a dummy SELECT to make it parseable
        const wrappedSql = `SELECT * FROM dummy WHERE ${expression.trim()}`;
        ast = parser.astify(wrappedSql, { database: model.dialect });
    } catch (error) {
        // If parsing fails, return empty array to avoid breaking the query
        // The validation layer will catch actual syntax errors
        return [];
    }
    
    const reference_fields = new Set<string>();

    // Extract column references from AST
    if (ast && typeof ast === 'object') {
        // Handle single AST node or array
        const selectStmt = Array.isArray(ast) ? ast[0] : ast;
        if (selectStmt && typeof selectStmt === 'object' && 'where' in selectStmt)
            extractFieldReferencesFromNode(selectStmt.where, reference_fields);
    }

    return Array.from(reference_fields);
}

