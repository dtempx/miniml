import { MinimlDef, MinimlModel } from "./common.js";
import { loadYamlFile, loadYamlFileSync } from "./yaml.js";
import { renderJinjaTemplate } from "./jinja.js";

export async function loadModel(file: string): Promise<MinimlModel> {
    const model = await loadYamlFile(file) as MinimlModel;
    if (!model.join)
        model.join = {};

    validateModel(model);
    expandDimensions(model.dimensions);
    expandMeasures(model.measures);
    expandModelInfo(model, file);

    return model;
}

export function loadModelSync(file: string): MinimlModel {
    const model = loadYamlFileSync(file) as MinimlModel;
    if (!model.join)
        model.join = {};

    validateModel(model);
    expandDimensions(model.dimensions);
    expandMeasures(model.measures);
    expandModelInfo(model, file);

    return model;
}

// Substitutes dimensions with corresponding `sql` metadata if defined, mirroring the alias.
// Otherwise simply passes the alias verbatim.
function expandDimensions(dimensions: Record<string, MinimlDef>): void {
    expandMetadataDefs(dimensions);
    for (const obj of Object.values(dimensions))
        if (!obj.sql)
            obj.sql = obj.key;
        else if (!/\s+AS\s+[a-z0-9_]+$/i.test(obj.sql))
            obj.sql = `${obj.sql} AS ${obj.key}`;
}

// Substitutes measures with corresponding `sql` metadata if defined, mirroring the alias.
// Otherwise wraps the alias in a SUM aggregation.
function expandMeasures(measures: Record<string, MinimlDef>): void {
    expandMetadataDefs(measures);
    for (const obj of Object.values(measures))
        if (!obj.sql)
            obj.sql = `SUM(${obj.key}) AS ${obj.key}`;
        else if (!/\s+AS\s+[a-z0-9_]+$/i.test(obj.sql))
            obj.sql = `${obj.sql} AS ${obj.key}`;
}

// Normalized different variants of a dimension or measure to object format.
function expandMetadataDefs(dictionary: Record<string, MinimlDef>): void {
    for (const key of Object.keys(dictionary)) {
        const obj = dictionary[key];
        if (typeof obj === "string")
            dictionary[key] = { key, description: obj };
        else if (Array.isArray(obj))
            dictionary[key] = { key, description: obj[0], sql: obj[1], join: obj[2] };
    }
}

// Expands info section of metadata using Jinja templating.
function expandModelInfo(model: MinimlModel, file: string): void {
    model.info = `
## DIMENSIONS
{%- for dimension in dimensions %}
- \`{{ dimension.key }}\` {{ dimension.description }}
{%- endfor %}

## MEASURES
{%- for measure in measures %}
- \`{{ measure.key }}\` {{ measure.description }}
{%- endfor %}

${model.info || ""}`.trim();

    model.info = renderJinjaTemplate(model.info, {
        dimensions: Object.keys(model.dimensions).map(key => ({ key, description: model.dimensions[key].description })),
        measures: Object.keys(model.measures).map(key => ({ key, description: model.measures[key].description }))
    });
    if (!model.dialect)
        inferModelDialect(file);
    if (model.dialect)
        model.info += `\n\nUse ${model.dialect.toUpperCase()} syntax for generating SQL filter expressions.`;
}

function inferModelDialect(file: string): string {
    if (file.includes("bigquery"))
        return "bigquery";
    else if (file.includes("snowflake"))
        return "snowflake";
    else
        throw new Error(`Unable to determine dialect for model file: ${file}`);
}

function validateModel(model: MinimlModel): void {
    if (model.default_date_range_days !== undefined) {
        if (!Number.isInteger(model.default_date_range_days) || model.default_date_range_days <= 0) {
            throw new Error(`default_date_range_days must be a positive integer, got: ${model.default_date_range_days}`);
        }
    }
}
