# MiniML vs. Apache Ossie

[Apache Ossie](https://github.com/apache/ossie/) (incubating) is the Apache Software Foundation's effort to define a **vendor-neutral interchange specification for semantic models**. It was previously known as **Open Semantic Interchange (OSI)** and is backed by a coalition of 50+ organizations including Snowflake, Salesforce, dbt Labs, Databricks, Cloudera, and Informatica. Its stated goal is to eliminate "semantic fragmentation" by providing "a single JSON- and YAML-based specification that any tool can read and write."

MiniML is a **small, embeddable compiler** that turns a YAML model plus a selection of dimensions and measures into a SQL string.

The two are easy to confuse because both describe tables, dimensions, and metrics in YAML. But they solve different problems and sit at different points in the stack. This document explains where they overlap, where they differ, and how they could work together.

> **Snapshot date.** Ossie is a pre-release draft (spec version `0.2.0.dev0`; spec v0.1 was released January 27, 2026, and the project was renamed from OSI to Apache Ossie on July 10, 2026) and is changing quickly. Everything below reflects the repository as of September 2026. Check the [spec](https://github.com/apache/ossie/blob/main/core-spec/spec.md) for the current state.

## The one-sentence difference

**Ossie is a file format. MiniML is a query compiler.**

Ossie standardizes *how a semantic model is written down* so that dbt, Snowflake, Databricks, Salesforce, GoodData, and others can exchange definitions without re-authoring them. It does not generate SQL, does not accept queries, and does not run anything. Converters (currently Python packages) translate between Ossie YAML and each vendor's native format; the vendor's own engine then does the querying.

MiniML defines a model format too, but the format exists in service of one job: `renderQuery(model, { dimensions, measures, ... })` returns SQL you can run against your own BigQuery or Snowflake warehouse. There is no interchange goal and no external engine. MiniML *is* the engine.

## What Apache Ossie actually is

### Project shape

| | Apache Ossie |
|---|---|
| **Type** | Specification + reference converters + validator |
| **Governance** | Apache Incubator podling (PPMC, consensus voting) |
| **Formerly** | Open Semantic Interchange (OSI) |
| **License** | Apache-2.0 |
| **Spec version** | `0.2.0.dev0` draft (release `0.1.1`) |
| **Model formats** | YAML and JSON, validated by `ossie-schema.json` |
| **Reference tooling language** | Python (converters, `validation/validate.py`) |
| **Converters** | dbt (MetricFlow), Snowflake, Databricks, Salesforce, GoodData, Polaris, Omni, Honeydew, NVIDIA, WisdomAI, OrionBelt, ontology |
| **Query engine** | None. Ossie hands the model to a vendor's engine. |

The repo is organized as `core-spec/` (the specification, `spec.yaml`, `ossie-schema.json`, `expression_language.md`), `converters/`, `examples/`, `validation/`, and `docs/`.

### Model structure

An Ossie file has a `version` and a `semantic_model` array. Each semantic model contains:

- **`datasets`** — logical tables. Each has a `name`, a physical `source`, `primary_key` / `unique_keys`, `description`, `ai_context`, and a list of `fields`.
- **`fields`** — row-level attributes (what MiniML calls dimensions). Each carries an `expression`, a logical `datatype` (`String`, `Integer`, `Decimal`, `Float`, `Boolean`, `Date`, `Time`, `DateTime`, `DateTimeTz`, `Opaque`), an optional `dimension.is_time` flag marking it as a time dimension, `label`, `description`, and `ai_context`.
- **`relationships`** — key-based joins between datasets: `from`, `to`, `from_columns`, `to_columns`.
- **`metrics`** — aggregations that can span datasets, using dotted `dataset.field` references in their expressions.
- **`ai_context`** — either a string or a structured object with `instructions`, `synonyms`, and `examples`, attachable at the model, dataset, field, and metric level.
- **`custom_extensions`** — vendor-specific escape hatch: `vendor_name` plus a free-form `data` payload. Well-known vendors include Snowflake, Salesforce, dbt, Databricks, and GoodData.

An excerpt from the repository's TPC-DS example:

```yaml
version: "0.2.0.dev0"

semantic_model:
  - name: tpcds_retail_model
    description: TPC-DS retail semantic model for sales and customer analytics
    ai_context:
      instructions: "Use this semantic model for retail analytics. ..."

    datasets:
      - name: store_sales
        source: tpcds.public.store_sales
        primary_key: [ss_item_sk, ss_ticket_number]
        fields:
          - name: d_year
            expression:
              dialects:
                - dialect: ANSI_SQL
                  expression: d_year
            description: Year
            datatype: Integer
            dimension:
              is_time: true

    relationships:
      - name: store_sales_to_date
        from: store_sales
        to: date_dim
        from_columns: [ss_sold_date_sk]
        to_columns: [d_date_sk]

    metrics:
      - name: total_sales
        expression:
          dialects:
            - dialect: ANSI_SQL
              expression: SUM(store_sales.ss_ext_sales_price)
        description: Total sales revenue across all transactions
```

### Expressions and dialects

Every field and metric expression is a list of `dialects`, each pairing a dialect name with an expression string. The enumerated dialects are `ANSI_SQL`, `Snowflake`, `BigQuery`, `Databricks`, `MDX`, `Tableau`, `MAQL`, and `ThoughtSpot`. The spec defines a portable default dialect, **Ossie_SQL_2026**, based on ANSI SQL:2003 Core, and classifies aggregate functions by decomposability (distributive, algebraic, holistic, sketch-based) so downstream engines can plan multi-stage aggregation.

The important point: Ossie *stores* expressions in multiple dialects; it does not *translate* between them and it does not *evaluate* them.

### The ontology layer

Ossie also has an **ontology** layer that MiniML has no analogue for. The `flights.yaml` example defines `concept` entries with `type: ValueType`, inheritance via `extends`, and declarative constraints via `requires` (for example `DegreesLatitude <= 90`). This is closer to a business glossary or a type system than to a query model.

## What MiniML actually is

| | MiniML |
|---|---|
| **Type** | Library (npm) + CLI |
| **License** | MIT |
| **Model format** | YAML |
| **Language** | TypeScript / JavaScript |
| **Output** | A SQL string |
| **Dialects** | BigQuery, Snowflake |
| **Query engine** | MiniML itself: deterministic metadata-to-SQL compiler |

A MiniML model is a single `from` table, named `join` clauses written as raw SQL, `dimensions`, `measures`, a `date_field` with `default_date_range`, an optional base `where`, and `tags`. Query time adds dimension/measure selection, date range, filters, `HAVING`, ordering, and limit. The result is reproducible SQL with no LLM in the path.

## Side-by-side

| Concern | MiniML | Apache Ossie |
|---|---|---|
| **Primary purpose** | Generate SQL from a model + selection | Exchange semantic models between tools |
| **Produces SQL** | ✅ Core function | ❌ Not in scope |
| **Accepts a query** | ✅ dimensions, measures, dates, filters, order, limit | ❌ No query concept |
| **Executes anything** | ❌ Returns a string; you run it | ❌ Converters and validator only |
| **Runtime dependency** | Node.js library | None for the format; Python for reference tooling |
| **Base table** | Single `from` per model | Many `datasets` per model |
| **Joins** | Raw SQL `join` clauses, keyed by name, opt-in per field | Key-based `relationships` (`from_columns` / `to_columns`) |
| **Dimensions** | `dimensions` (description, SQL, join) | `fields` with `datatype`, `dimension.is_time`, `label` |
| **Measures** | `measures` (default `SUM`) | `metrics` with cross-dataset dotted references |
| **Multi-dialect expressions** | One SQL per model; `dialect` set at model level | Per-expression `dialects` list |
| **Dialects named** | BigQuery, Snowflake | ANSI_SQL, Snowflake, BigQuery, Databricks, MDX, Tableau, MAQL, ThoughtSpot |
| **Date handling** | `date_field`, `default_date_range`, `include_today`, auto-detection | `dimension.is_time` flag only |
| **Base filter** | `where` | ❌ |
| **Always-on joins** | `always_join` | ❌ |
| **Access tags** | `tags` | ❌ (would go in `custom_extensions`) |
| **AI grounding** | `description`, `info` (Jinja), generated model summary | `ai_context` (`instructions`, `synonyms`, `examples`) at every level |
| **Type system / ontology** | ❌ | ✅ `concept`, `ValueType`, `extends`, `requires` |
| **Vendor extensions** | ❌ | ✅ `custom_extensions` |
| **Schema validation** | Runtime validation of queries against the model | JSON Schema (`ossie-schema.json`) + Python validator |
| **Converters to other tools** | ❌ | ✅ dbt, Snowflake, Databricks, Salesforce, GoodData, and more |
| **Fan-out protection** | ❌ (see [fanout.md](./fanout.md)) | N/A (no engine) |
| **Maturity** | Stable, used in production | Draft spec (`0.2.0.dev0`), incubating |
| **Governance** | Single maintainer | Apache PPMC, 50+ member organizations |

## Where they overlap

Both encode the same three ideas: **tables, groupable attributes, and aggregations**. A MiniML `dimension` is an Ossie `field`; a MiniML `measure` is an Ossie `metric`; a MiniML `join` approximates an Ossie `relationship`. Both attach natural-language descriptions intended to be read by an LLM. Both are plain text, version-controllable, and vendor-independent in ownership (MIT vs. Apache-2.0).

## Where they diverge

1. **Ossie stops at the model. MiniML starts there.** Ossie has no notion of a query: no selection, no filter, no date range, no ordering. Those belong to whatever engine consumes the model. MiniML's entire surface area is the query.

2. **Ossie is multi-dataset and key-based. MiniML is single-fact-table and SQL-based.** An Ossie model describes a graph of datasets connected by column pairs, leaving join strategy to the engine. A MiniML model is one `from` table with hand-written join clauses that are included only when a selected field needs them. MiniML's approach is less abstract but produces exactly the SQL you wrote, in the order you defined.

3. **Ossie is designed for round-tripping. MiniML is designed for rendering.** Ossie's `custom_extensions` exist so that dbt-specific or Snowflake-specific metadata survives a trip through the neutral format. MiniML has no need for this because nothing else reads its files.

4. **Ossie is a standards body's draft. MiniML is a shipped tool.** Ossie's value depends on vendors implementing converters and honoring the spec, and its schema is still changing. MiniML's value is realized the moment you call `renderQuery`.

5. **Ossie carries a type system and ontology. MiniML carries date semantics.** Ossie models declare logical `datatype`s and can define constrained value concepts. MiniML instead invests in the operational detail an analytics query needs: which field is the date, what the default window is, whether today's partial data is included.

## They are complementary, not competitors

Ossie explicitly positions itself as a hub: "2×N converters for N vendors rather than N×(N-1) point-to-point connections." Under that framing, **MiniML is a natural spoke**: a lightweight engine that could consume an Ossie model and emit SQL, or export its own model as Ossie so the same definitions can flow into dbt, Snowflake Cortex, or Databricks.

A MiniML ↔ Ossie converter would map roughly as follows:

| MiniML | Ossie | Notes |
|---|---|---|
| model file | one `semantic_model` entry | |
| `description` | `description` | |
| `info` | `ai_context.instructions` | Rendered Jinja output, not the template |
| `from` | first `dataset.source` | MiniML has one base table |
| `join` entries | `datasets` + `relationships` | Lossy: MiniML joins are arbitrary SQL, Ossie relationships are column pairs. `USING (col)` / `ON a = b` joins map cleanly; anything else does not. |
| `dimensions` | `fields` with `dimension` | `dialects: [{dialect: BigQuery \| Snowflake, expression: <sql>}]` from the model's `dialect` |
| `measures` | `metrics` | Default `SUM(x)` expanded explicitly |
| `date_field` | `dimension.is_time: true` on that field | Ossie has no "primary" time dimension; a `custom_extensions` entry would be needed to preserve which one MiniML filters on |
| `default_date_range`, `include_today`, `where`, `always_join`, `tags` | `custom_extensions` with `vendor_name: miniml` | No Ossie equivalent |

Going the other direction (Ossie → MiniML) is straightforward for a single-dataset model and requires choosing a base dataset and synthesizing `JOIN ... ON` clauses from `relationships` for multi-dataset models. Metrics that reference multiple datasets would pull in the necessary joins automatically, which is exactly how MiniML's per-field join references already behave.

None of this exists today. It is listed here to make the point that adopting Ossie would not mean abandoning MiniML, and vice versa.

## When to reach for which

**Use Apache Ossie when** you already run several semantic-layer-aware tools (dbt, Snowflake, Databricks, Salesforce, GoodData) and need one canonical model that all of them can import, or when you are a vendor building a product that should interoperate with that ecosystem.

**Use MiniML when** you need SQL *now*, from your own code, against BigQuery or Snowflake, without a platform, a service, or a Python toolchain. MiniML answers the question Ossie deliberately leaves to others: given this model and this request, what is the query?

**Use both when** you want your definitions to be portable across the industry *and* you want a free, embeddable engine to render them for your own agents and applications.

## References

- Repository: <https://github.com/apache/ossie/>
- Core specification: <https://github.com/apache/ossie/blob/main/core-spec/spec.md>
- Expression language: <https://github.com/apache/ossie/blob/main/core-spec/expression_language.md>
- JSON Schema: <https://github.com/apache/ossie/blob/main/core-spec/ossie-schema.json>
- Converters: <https://github.com/apache/ossie/tree/main/converters>
- Examples: <https://github.com/apache/ossie/tree/main/examples>
- Back to the broader comparison: [alternatives.md](./alternatives.md)
