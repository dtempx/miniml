import { createRequire } from "module";
import { collapseWhitespace } from "./utilities.js";

export function renderJinjaTemplate(text: string, context: object): string {
    const require = createRequire(import.meta.url);
    const nunjucks = require("nunjucks"); // nunjucks is a legacy commonjs module
    const he = require("he"); // he is a legacy commonjs module

    let result = nunjucks.renderString(text, context);
    result = he.decode(result);
    result = collapseWhitespace(result);
    return result;
}
