#!/usr/bin/env node

import { parseArgs } from "cli-options";
import { loadModelSync, renderQuery } from "./lib/index.js";

const args = parseArgs({
    required: {
        0: "name of model to use"
    },
    optional: {
        dimensions: "comma separated list of dimensions to use for generating the query",
        measures: "comma separated list of measures to use for generating the query",
        date_from: "start date for filtering (YYYY-MM-DD format)",
        date_to: "end date for filtering (YYYY-MM-DD format)",
        where: "additional WHERE clause conditions",
        having: "HAVING clause conditions for aggregated results",
        order_by: "comma separated list of fields to order by (prefix with - for DESC)",
        limit: "maximum number of rows to return",
        distinct: "use DISTINCT in SELECT",
        date_granularity: "date truncation granularity (day, week, month, quarter, year)"
    }
});

try {
    const file = !args[0].endsWith(".yaml") ? `${args[0]}.yaml` : args[0];
    const model = loadModelSync(file);
    if (Object.keys(args).length === 1) {
        console.log(model.info);
    }
    else {
        const query = renderQuery(model, {
            dimensions: args.dimensions ? args.dimensions.split(",") : [],
            measures: args.measures ? args.measures.split(",") : [],
            date_from: args.date_from,
            date_to: args.date_to,
            where: args.where,
            having: args.having,
            order_by: args.order_by ? args.order_by.split(",") : [],
            limit: args.limit ? parseInt(args.limit) : undefined,
            distinct: !!args.distinct,
            date_granularity: args.date_granularity
        });
        console.log(query);
    }
}
catch (err) {
    console.log(err instanceof Error ? err.message : JSON.stringify(err));
}
