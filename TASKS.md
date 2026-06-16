- [ ] If at least one dimension or measure is not specified, then render as SELECT *

- [ ] When date_from and date_to are the same no rows are returned which is a common scenario

- [ ] Category level for models for 3-stage breakdowns

- [ ] Implement tags scheme that limits metadata rendering and model access

- [ ] Specifying order_by with a date field that has an underlying expression and that is not in the select list will cause a SQL error, fix is to expand the underlying expression in the order_by clause in this case

- [ ] Specifying a date_field that is not of type TIMESTAMP will cause errors when SQL is generated from the following call tree:
    - appendDefaultDateRange [query.ts]
    - constructDateRangeExpression [dialect.ts]
    - constructCurrentTimeOffsetExpression [dialect.ts] 
    - generates an expression like `date >= CURRENT_TIMESTAMP - INTERVAL 1 DAY` which fails when `date` is not of type TIMESTAMP
    - Consider adding an additional miniml field named `date_type` so type can be specified as either TIMESTAMP or DATE and generates CURRENT_TIMESTAMP or CURRENT_DATE appropriately

- [ ] Consider refactoring dialect.ts to break each dialect into a seperate module file (one file for bigquery, one file for snowflake, etc.)

- [ ] Split validation.test into the following
    - generic.test ARRAY_TO_STRING(colors, ', ')
    - bigquery.test 'red' IN UNNEST(colors)
    - snowflake-test ARRAY_CONTAINS('red'::VARIANT, colors)

- [ ] Consider a new feature to join between models



- [x] Add MAX_EXPRESSION_LENGTH 10X
- [x] Support function calls in where clause like ARRAY_CONTAINS('At Risk'::VARIANT, trackers) = TRUE
- [x] refactor expandWhereReferences to use AST instead of regexp's
- [x] validate default_date_range parameter
- [x] validate date_field parameter
- [x] validate that all sql inputs end with "as <name>", a lot of assumptions this is the case
- [x] validate dialect is only bigquery or snowflake
- [x] check that alias matches the key name (is this a problem?)
- [x] add params to inputs
- [x] allow formulas in dimensions like `CONCAT(first_name, ' ', last_name) AS person_name`
- [x] also allow jinja expansion like `CONCAT(retailer_url, '{{product_path}}') AS page_url`
- [x] tests to verify important notes are appended to info field
