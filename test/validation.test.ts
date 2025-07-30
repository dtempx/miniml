import { expect } from "chai";
import { loadModelSync } from "../lib/load.js";
import { renderQuery } from "../lib/query.js";
import { validateWhereClause, validateHavingClause, validateDateInput } from "../lib/validation.js";
import { SqlValidationError } from "../lib/common.js";
import { MinimlModel } from "../lib/common.js";

describe("SQL Injection Protection", () => {
    let model: MinimlModel;

    before(() => {
        // Load test model
        model = loadModelSync("test/models/bigquery/sales.yaml");
    });

    describe("Basic Validation", () => {
        it("should allow safe WHERE expressions", () => {
            const result = validateWhereClause("customer_name = 'Acme Corp'", model);
            expect(result.ok).to.be.true;
            expect(result.errors).to.be.empty;
        });

        it("should allow safe HAVING expressions", () => {
            const result = validateHavingClause("count > 100", model);
            expect(result.ok).to.be.true;
            expect(result.errors).to.be.empty;
        });

        it("should allow complex safe expressions", () => {
            const result = validateWhereClause(
                "customer_name = 'Test' AND date >= '2024-01-01' OR count IS NOT NULL", 
                model
            );
            expect(result.ok).to.be.true;
        });
    });

    describe("SQL Injection Prevention", () => {
        it("should block classic injection attempts", () => {
            const malicious = "1=1; DROP TABLE users; --";
            const result = validateWhereClause(malicious, model);
            expect(result.ok).to.be.false;
            expect(result.errors.some(e => e.includes('DROP'))).to.be.true;
        });

        it("should prevent UNION-based attacks", () => {
            const malicious = "1=1 UNION SELECT password FROM users";
            const result = validateWhereClause(malicious, model);
            expect(result.ok).to.be.false;
            expect(result.errors.some(e => e.includes('UNION'))).to.be.true;
        });

        it("should block subquery injections", () => {
            const malicious = "customer_id IN (SELECT id FROM secret_table)";
            const result = validateWhereClause(malicious, model);
            expect(result.ok).to.be.false;
            expect(result.errors.some(e => e.includes('Subqueries'))).to.be.true;
        });

        it("should prevent comment-based injections", () => {
            const malicious = "customer_name = 'test' -- OR 1=1";
            const result = validateWhereClause(malicious, model);
            expect(result.ok).to.be.false;
            expect(result.errors.some(e => e.includes('--'))).to.be.true;
        });

        it("should block DDL statements", () => {
            const attacks = [
                "customer_name = 'test'; CREATE TABLE hack(id INT)",
                "1=1; ALTER TABLE users ADD COLUMN hacked VARCHAR(255)",
                "1=1; TRUNCATE TABLE important_data"
            ];

            attacks.forEach(attack => {
                const result = validateWhereClause(attack, model);
                expect(result.ok).to.be.false;
                expect(result.errors.length).to.be.greaterThan(0);
            });
        });

        it("should block DML statements", () => {
            const attacks = [
                "1=1; INSERT INTO logs VALUES('hacked')",
                "1=1; UPDATE users SET password='hacked'",
                "1=1; DELETE FROM important_table"
            ];

            attacks.forEach(attack => {
                const result = validateWhereClause(attack, model);
                expect(result.ok).to.be.false;
                expect(result.errors.length).to.be.greaterThan(0);
            });
        });
    });

    describe("Column Reference Validation", () => {
        it("should validate column references against model", () => {
            const result = validateWhereClause("nonexistent_column = 'value'", model);
            expect(result.ok).to.be.false;
            expect(result.errors.some(e => e.includes('not found'))).to.be.true;
        });

        it("should accept valid dimension references", () => {
            // Check what dimensions exist in the traffic model
            const dimensions = Object.keys(model.dimensions);
            if (dimensions.length > 0) {
                const result = validateWhereClause(`${dimensions[0]} = 'value'`, model);
                expect(result.ok).to.be.true;
            }
        });

        it("should accept valid measure references in HAVING", () => {
            const measures = Object.keys(model.measures);
            if (measures.length > 0) {
                const result = validateHavingClause(`${measures[0]} > 100`, model);
                expect(result.ok).to.be.true;
            }
        });
    });

    describe("Function Safety", () => {
        it("should allow safe functions", () => {
            const safeFunctions = [
                "UPPER(customer_name) = 'TEST'",
                "LOWER(customer_name) LIKE 'test%'",
                "LENGTH(customer_name) > 5"
            ];

            safeFunctions.forEach(expr => {
                const result = validateWhereClause(expr, model);
                expect(result.ok).to.be.true;
            });
        });

        it("should block unsafe functions", () => {
            const unsafeFunctions = [
                "SYSTEM('rm -rf /')",
                "EXEC('dangerous command')",
                "LOAD_FILE('/etc/passwd')"
            ];

            unsafeFunctions.forEach(expr => {
                const result = validateWhereClause(expr, model);
                expect(result.ok).to.be.false;
            });
        });
    });

    describe("Complexity Limits", () => {
        it("should limit expression length", () => {
            const longExpression = "customer_name = '" + "a".repeat(1000) + "'";
            const result = validateWhereClause(longExpression, model);
            expect(result.ok).to.be.false;
            expect(result.errors.some(e => e.includes('too long'))).to.be.true;
        });

        it("should limit nesting depth", () => {
            const deepExpression = "(" + "(".repeat(15) + "1=1" + ")".repeat(15) + ")";
            const result = validateWhereClause(deepExpression, model);
            expect(result.ok).to.be.false;
            expect(result.errors.some(e => e.includes('nesting depth'))).to.be.true;
        });
    });

    describe("Integration with Query Generation", () => {
        it("should throw SqlValidationError for invalid WHERE clause", () => {
            expect(() => {
                renderQuery(model, {
                    dimensions: Object.keys(model.dimensions).slice(0, 1),
                    measures: Object.keys(model.measures).slice(0, 1),
                    where: "1=1; DROP TABLE users"
                });
            }).to.throw(SqlValidationError);
        });

        it("should throw SqlValidationError for invalid HAVING clause", () => {
            expect(() => {
                renderQuery(model, {
                    dimensions: Object.keys(model.dimensions).slice(0, 1),
                    measures: Object.keys(model.measures).slice(0, 1),
                    having: "nonexistent_measure > 100"
                });
            }).to.throw(SqlValidationError);
        });

        it("should generate SQL successfully with valid expressions", () => {
            const dimensions = Object.keys(model.dimensions);
            const measures = Object.keys(model.measures);
            
            if (dimensions.length > 0 && measures.length > 0) {
                const sql = renderQuery(model, {
                    dimensions: [dimensions[0]],
                    measures: [measures[0]],
                    where: `${dimensions[0]} IS NOT NULL`,
                    having: `${measures[0]} > 0`
                });
                
                expect(sql).to.be.a('string');
                expect(sql).to.include('SELECT');
                expect(sql).to.include('WHERE');
                expect(sql).to.include('HAVING');
            }
        });
    });

    describe("Dialect-Specific Validation", () => {
        it("should handle BigQuery dialect", () => {
            const result = validateWhereClause("DATE(date) = '2024-01-01'", { ...model, dialect: 'bigquery' });
            expect(result.ok).to.be.true;
        });

        it("should handle Snowflake dialect", () => {
            const result = validateWhereClause("TO_DATE(date) = '2024-01-01'", { ...model, dialect: 'snowflake' });
            expect(result.ok).to.be.true;
        });
    });

    describe("Join Validation", () => {
        it("should throw SqlValidationError for undefined join in dimension", () => {
            // Create a model with a dimension that references an undefined join
            const testModel = {
                ...model,
                dimensions: {
                    ...model.dimensions,
                    test_dimension: {
                        key: "test_dimension",
                        description: "Test dimension with undefined join",
                        sql: "test_field",
                        join: "undefined_join"
                    }
                }
            };

            expect(() => {
                renderQuery(testModel, {
                    dimensions: ["test_dimension"],
                    measures: Object.keys(model.measures).slice(0, 1)
                });
            }).to.throw(SqlValidationError)
              .with.property('message')
              .that.includes('Undefined join reference: undefined_join');
        });

        it("should throw SqlValidationError for undefined join in measure", () => {
            // Create a model with a measure that references an undefined join
            const testModel = {
                ...model,
                measures: {
                    ...model.measures,
                    test_measure: {
                        key: "test_measure",
                        description: "Test measure with undefined join",
                        sql: "SUM(test_field)",
                        join: "undefined_join"
                    }
                }
            };

            expect(() => {
                renderQuery(testModel, {
                    dimensions: Object.keys(model.dimensions).slice(0, 1),
                    measures: ["test_measure"]
                });
            }).to.throw(SqlValidationError)
              .with.property('message')
              .that.includes('Undefined join reference: undefined_join');
        });

        it("should work correctly with valid join references", () => {
            // This should not throw an error
            const sql = renderQuery(model, {
                dimensions: ["customer_name"],
                measures: ["total_amount"]
            });
            
            expect(sql).to.be.a('string');
            expect(sql).to.include('JOIN acme.customers USING (customer_id)');
        });

        it("should include joins for fields referenced in WHERE clause", () => {
            const sql = renderQuery(model, {
                dimensions: ["date"],
                measures: ["total_amount"],
                where: "customer_name = 'John Doe'"
            });
            
            expect(sql).to.be.a('string');
            expect(sql).to.include('JOIN acme.customers USING (customer_id)');
            expect(sql).to.include("customer_name = 'John Doe'");
        });

        it("should include joins for fields referenced in HAVING clause", () => {
            const sql = renderQuery(model, {
                dimensions: ["date"],
                measures: ["total_amount"],
                having: "total_amount > 1000"
            });
            
            expect(sql).to.be.a('string');
            expect(sql).to.include("SUM(total_amount) > 1000");
        });

        it("should include multiple joins for fields referenced in both WHERE and HAVING clauses", () => {
            const sql = renderQuery(model, {
                dimensions: ["date"],
                measures: ["total_amount", "count"],
                where: "store_name = 'Main Street'",
                having: "count > 5"
            });
            
            expect(sql).to.be.a('string');
            expect(sql).to.include('JOIN acme.stores USING (store_id)');
            expect(sql).to.include("store_name = 'Main Street'");
            expect(sql).to.include("COUNT(*) > 5");
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty expressions", () => {
            const result = validateWhereClause("", model);
            expect(result.ok).to.be.true;
        });

        it("should handle whitespace-only expressions", () => {
            const result = validateWhereClause("   ", model);
            expect(result.ok).to.be.true;
        });

        it("should handle null expressions", () => {
            const result = validateWhereClause(null as any, model);
            expect(result.ok).to.be.true;
        });

        it("should provide helpful error messages", () => {
            const result = validateWhereClause("invalid_column = 'test'", model);
            expect(result.ok).to.be.false;
            expect(result.errors[0]).to.include('not found');
            expect(result.errors[0]).to.include('Available columns');
        });
    });

    describe("Date Input Validation", () => {
        it("should accept valid date formats", () => {
            const validDates = [
                "2024-01-01",
                "2024-12-31", 
                "2024-01-01 12:30:45",
                "2024-12-31 23:59:59"
            ];

            validDates.forEach(date => {
                expect(validateDateInput(date)).to.be.true;
            });
        });

        it("should reject invalid date formats", () => {
            const invalidDates = [
                "01/01/2024",        // MM/DD/YYYY format
                "2024/01/01",        // YYYY/MM/DD format
                "24-01-01",          // YY-MM-DD format
                "2024-1-1",          // Single digit month/day
                "2024-13-01",        // Invalid month
                "2024-01-32",        // Invalid day
                "not-a-date",        // Text
                "2024-01-01T12:30:45Z",  // ISO format (not supported)
                "2024-01-01 25:00:00"    // Invalid time
            ];

            invalidDates.forEach(date => {
                expect(validateDateInput(date)).to.be.false;
            });
        });

        it("should allow empty dates", () => {
            expect(validateDateInput("")).to.be.true;
            expect(validateDateInput("   ")).to.be.true;
        });

        it("should block SQL injection attempts in dates", () => {
            const injectionAttempts = [
                "2024-01-01'; DROP TABLE users; --",
                "2024-01-01' OR 1=1 --",
                "2024-01-01' UNION SELECT * FROM secrets --",
                "'; DELETE FROM logs; --",
                "2024-01-01\"",
                "2024-01-01;",
                "2024-01-01--"
            ];

            injectionAttempts.forEach(maliciousDate => {
                expect(validateDateInput(maliciousDate)).to.be.false;
            });
        });

        it("should prevent date injection in renderQuery", () => {
            const dimensions = Object.keys(model.dimensions);
            const measures = Object.keys(model.measures);
            
            if (dimensions.length > 0 && measures.length > 0) {
                expect(() => {
                    renderQuery(model, {
                        dimensions: [dimensions[0]],
                        measures: [measures[0]], 
                        date_from: "2024-01-01'; DROP TABLE users; --"
                    });
                }).to.throw(SqlValidationError);

                expect(() => {
                    renderQuery(model, {
                        dimensions: [dimensions[0]],
                        measures: [measures[0]],
                        date_to: "2024-01-31' OR 1=1 --"
                    });
                }).to.throw(SqlValidationError);
            }
        });

        it("should generate SQL successfully with valid dates", () => {
            const dimensions = Object.keys(model.dimensions);
            const measures = Object.keys(model.measures);
            
            if (dimensions.length > 0 && measures.length > 0) {
                const sql = renderQuery(model, {
                    dimensions: [dimensions[0]],
                    measures: [measures[0]],
                    date_from: "2024-01-01",
                    date_to: "2024-01-31"
                });
                
                expect(sql).to.be.a('string');
                expect(sql).to.include('SELECT');
                expect(sql).to.include("BETWEEN '2024-01-01' AND '2024-01-31'");
            }
        });
    });
});