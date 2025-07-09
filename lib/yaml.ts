import { readFile } from "fs/promises";
import { readFileSync } from "fs";
import { createRequire } from "module";

export async function loadYamlFile<T = unknown>(file: string): Promise<T> {
    const text = await readFile(file, "utf-8");
    return parseYAML(text);
}

export function loadYamlFileSync<T = unknown>(file: string): T {
    const text = readFileSync(file, "utf-8");
    return parseYAML(text);
}

export function parseYAML<T = unknown>(text: string): T {
    const require = createRequire(import.meta.url);
    const YAML = require("yaml"); // yaml is a legacy commonjs module
    return YAML.parse(text);
}
