import { readFile } from "fs/promises";
import { readFileSync } from "fs";
import { createRequire } from "module";

export async function loadYamlFile<T = unknown>(file: string): Promise<T> {
    const require = createRequire(import.meta.url);
    const YAML = require("yaml"); // yaml is a legacy commonjs module
    const text = await readFile(file, "utf-8");
    return YAML.parse(text);
}

export function loadYamlFileSync<T = unknown>(file: string): T {
    const require = createRequire(import.meta.url);
    const YAML = require("yaml"); // yaml is a legacy commonjs module
    const text = readFileSync(file, "utf-8");
    return YAML.parse(text);
}
