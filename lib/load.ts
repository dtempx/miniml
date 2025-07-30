import { MinimlDef, MinimlModel } from "./common.js";
import { loadYamlFile, loadYamlFileSync, parseYAML } from "./yaml.js";
import { renderJinjaTemplate } from "./jinja.js";

export function createModel(obj: string | {}, file?: string): MinimlModel {
    const model = typeof obj === "string" ? parseYAML(obj) as MinimlModel : obj as MinimlModel;
    if (!model.join)
        model.join = {};
    if (!model.dimensions)
        model.dimensions = {};
    if (!model.measures)
        model.measures = {};
    if (!model.date_field)
        model.date_field = defaultDateField(Object.keys(model.dimensions));
    if (model.date_field)
        model.date_field = model.date_field.trim();
    if (model.default_date_range)
        model.default_date_range = model.default_date_range.trim();

    validateModel(model);
    expandDimensions(model.dimensions);
    expandMeasures(model.measures);
    expandModelInfo(model, file);

    return model;
}

export async function loadModel(file: string): Promise<MinimlModel> {
    const obj = await loadYamlFile(file) as MinimlModel;
    return createModel(obj, file);
}

export function loadModelSync(file: string): MinimlModel {
    const obj = loadYamlFileSync(file) as MinimlModel;
    return createModel(obj, file);
}

function defaultDateField(keys: string[]): string | undefined {
    const predicates: Array<(key: string) => boolean> = [
        key => key === "date",
        key => key === "timestamp",
        key =>
            key.endsWith("date") ||
            key.startsWith("date") ||
            key.endsWith("time") ||
            key.endsWith("_at") ||
            key.endsWith("_on") ||
            key.endsWith("_until") ||
            key.includes("datetime")
    ];

    keys = keys.map(key => key.toLowerCase());
    for (const predicate of predicates) {
        const key = keys.find(predicate);
        if (key)
            return key;
    }
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
function expandModelInfo(model: MinimlModel, file: string | undefined): void {
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
    if (!model.dialect && file)
        model.dialect = inferModelDialect(file);
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
}
