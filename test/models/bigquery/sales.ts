import { expect } from "chai";
import { loadModelSync, renderQuery, MinimlModel } from "../../../index.js";

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tests = fs.readdirSync(__dirname).filter(file => file.endsWith(".json"));
let model: MinimlModel;

describe("sales", () => {
    before(() =>
        model = loadModelSync(path.join(__dirname, "sales.yaml")));

    for (const test of tests) {
        const name = test.replace(/\.json$/, "");
        it(name, () => {
            const options = JSON.parse(fs.readFileSync(path.join(__dirname, `${name}.json`), "utf8"));
            const sql = fs.readFileSync(path.join(__dirname, `${name}.sql`), "utf8");
            expect(renderQuery(model, options)).equals(sql);
        });
    }
});
