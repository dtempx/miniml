# MiniML vs. Other Semantic Layers

There are several well-known semantic layers and "metrics" technologies. This document compares MiniML to the most prominent alternatives and explains where MiniML fits — and, more importantly, why you might choose it.

The short version: **MiniML is the only completely non-proprietary, dependency-free option in this list.** Every other tool here is either a commercial product or bound to a specific data platform, BI tool, or vendor ecosystem — and most carry an additional subscription and/or per-query usage cost. That is MiniML's key differentiator and the reason to choose it over all the others.

## The Alternatives

- **dbt Semantic Layer (MetricFlow)** — The metrics/semantic layer built into dbt. You define metrics and semantic models in YAML alongside your dbt project; MetricFlow compiles them into SQL. The semantic layer *service* (the queryable API) is part of dbt Cloud.
- **Snowflake Cortex Analyst / Cortex Agents** — Snowflake's AI-driven analytics layer. You define a "semantic model" (a YAML spec of tables, dimensions, metrics, and natural-language hints), and Cortex translates *natural-language questions* into SQL that runs on Snowflake.
- **Cube (Cube Semantic Layer)** — A standalone semantic layer (open-core) that defines cubes/views in YAML or JavaScript and exposes them over SQL, REST, GraphQL, and MDX APIs, with caching and access control. Open source for the engine; Cube Cloud is the commercial hosted offering.
- **Looker (LookML)** — Google Cloud's BI platform. LookML is its modeling language for defining dimensions, measures, and explores. The model is inseparable from the Looker platform that consumes it.
- **Databricks Metric Views / Unity Catalog Metrics** — Databricks' semantic-layer feature. Metrics are defined as YAML-backed objects governed by Unity Catalog and queried through the Databricks SQL engine and its AI/BI tooling (Genie, dashboards).
- **MiniML** — A minimal, embeddable semantic modeling library. YAML models in, SQL out. No service, no platform, no account — a small TypeScript/JavaScript library you call from your own code.

## Headless Semantic Layers vs. Agentic Semantic Models

A useful way to categorize these tools is by **what you hand the semantic layer** and **what comes back**:

### Headless semantic layers — *you pass metadata, you get SQL/data*

A headless semantic layer is "headless" because it has no UI of its own. Your application (or a BI tool, notebook, or AI agent) passes a **structured request built from the model's metadata** — "give me these dimensions and these measures, filtered this way" — and the layer deterministically compiles that request into SQL and returns the query (or the results). The model metadata is the contract; the output is reproducible and auditable.

- **MiniML** is headless: you select dimensions/measures (the metadata) and it returns SQL. Nothing more, nothing less.
- **dbt Semantic Layer (MetricFlow)** is headless: applications query defined metrics/dimensions through its API.
- **Cube** is headless: it serves metadata-driven queries over SQL/REST/GraphQL APIs.
- **LookML** is effectively a (platform-bound) headless model under the hood — explores compile metadata into SQL — but in practice it is consumed through Looker's own UI and API rather than as a free-standing headless layer.

The defining trait: **the request is metadata, and the translation to SQL is deterministic.** Given the same selection, you get the same SQL every time.

### Agentic semantic models — *you pass natural language, an LLM picks the SQL*

An agentic semantic model is designed to sit behind a large language model. Instead of a structured selection of fields, you pass a **natural-language question** ("what was revenue by region last quarter?"). The semantic model here functions as *grounding* — it tells the LLM what tables, columns, metrics, and business terms exist, often with extra natural-language descriptions, synonyms, and verified-query examples — and the **model/agent decides** which fields to use and emits the SQL.

- **Snowflake Cortex Analyst / Cortex Agents** is the clearest example: the semantic model exists to steer an LLM that interprets natural-language questions into SQL.
- **Databricks Genie** layers similar natural-language-to-SQL behavior over its metric views.

The defining trait: **the request is natural language, and an LLM (not a deterministic compiler) chooses the SQL.** The semantic model is context/instructions for that model, and the same question can produce different SQL across runs.

### Where MiniML sits — and how it bridges both

MiniML is firmly a **headless** semantic layer: its `renderQuery` function is a deterministic metadata-to-SQL compiler. There is no LLM in the query path, so the SQL is reproducible and reviewable.

But MiniML is *also* built to feed agents. It generates compact, model-specific metadata (the `npx miniml model.yaml` description, plus the `info`/Jinja documentation) that you can hand to an LLM as context. The agent reasons in natural language, decides which dimensions and measures it wants, and then calls MiniML's deterministic compiler to produce safe SQL — getting the grounding benefits of an agentic model **without** giving up the determinism, auditability, and SQL-injection guardrails of a headless one. You get the best of both categories without being locked into a vendor's agent.

## Feature Comparison

| Feature | **MiniML** | dbt Semantic Layer (MetricFlow) | Snowflake Cortex Analyst/Agents | Cube | Looker (LookML) | Databricks Metric Views |
|---|---|---|---|---|---|---|
| **Type** | Headless (agent-friendly) | Headless | Agentic | Headless | Platform-bound model | Headless + agentic (Genie) |
| **Primary input** | Metadata (dimension/measure selection) | Metadata (metrics/dimensions) | Natural language | Metadata | Metadata (via Looker UI/API) | Metadata + natural language |
| **Output** | SQL string | SQL / data via API | SQL + answer | SQL / data via APIs | Data + visualizations | Data via SQL engine |
| **Model definition** | YAML | YAML | YAML semantic model | YAML / JavaScript | LookML | YAML (Unity Catalog) |
| **Open source** | ✅ MIT | ⚠️ MetricFlow OSS; SL service is dbt Cloud | ❌ | ⚠️ Open-core (engine OSS) | ❌ | ❌ |
| **Proprietary / vendor-bound** | ❌ None | ⚠️ Service tied to dbt Cloud | ✅ Snowflake only | ⚠️ Engine free; cloud is commercial | ✅ Looker/Google only | ✅ Databricks only |
| **Requires a running service/server** | ❌ | ✅ (for the SL API) | ✅ | ✅ | ✅ | ✅ |
| **Requires a platform account/subscription** | ❌ | ✅ dbt Cloud | ✅ Snowflake | ⚠️ Self-host or Cube Cloud | ✅ Looker | ✅ Databricks |
| **Additional usage/compute cost** | ❌ | ✅ | ✅ (Cortex token + warehouse) | ⚠️ (hosting / Cube Cloud) | ✅ | ✅ |
| **Embeddable as a library** | ✅ npm import | ❌ | ❌ | ⚠️ via API/SDK | ❌ | ❌ |
| **Deterministic SQL (no LLM in path)** | ✅ | ✅ | ❌ | ✅ | ✅ | ⚠️ (deterministic for metric views; LLM via Genie) |
| **SQL dialects** | BigQuery, Snowflake (more planned) | Many (via dbt adapters) | Snowflake | Many | Many | Databricks/Spark SQL |
| **Multi-engine / warehouse-agnostic** | ⚠️ (dialect-based) | ✅ | ❌ | ✅ | ✅ | ❌ |
| **Built-in caching / serving** | ❌ (library only) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Join fan-out protection** | ❌ (see [fanout.md](./fanout.md)) | ✅ | ⚠️ | ✅ | ✅ (symmetric aggregates) | ⚠️ |
| **AI/agent metadata generation** | ✅ Built-in | ⚠️ via API | ✅ (its whole purpose) | ⚠️ via API | ⚠️ | ✅ (Genie) |
| **Footprint** | Tiny library | Part of dbt toolchain | Cloud platform | Server/cluster | Enterprise platform | Cloud platform |

Legend: ✅ yes / full · ⚠️ partial, conditional, or with caveats · ❌ no.

## Commercial and Proprietary Considerations

With the exception of MiniML (and the open-core *engines* of Cube and MetricFlow), every alternative here is a **commercial, highly proprietary product bound to a specific platform or ecosystem**, and using it as an actual semantic *service* generally requires one or more of: a platform subscription, a running managed service, and per-query/compute (or LLM token) usage costs.

- **dbt Semantic Layer** — MetricFlow is open source, but the queryable Semantic Layer API is a **dbt Cloud** feature. To use it as a service you need a dbt Cloud subscription; your models live inside the dbt toolchain.
- **Snowflake Cortex** — Fully proprietary and **Snowflake-only**. It requires a Snowflake account, runs on Snowflake compute, and bills both warehouse usage and Cortex (LLM) token consumption. Your semantic model is not portable off Snowflake.
- **Cube** — The core engine is open source, but production use typically means either operating your own Cube server/cluster or paying for **Cube Cloud**. Either way there is real infrastructure and (for the hosted tier) subscription cost.
- **Looker / LookML** — A fully proprietary **Google Cloud** product. LookML is meaningless without the Looker platform that interprets it; it requires Looker licensing and is bound to the Looker/Google ecosystem.
- **Databricks Metric Views** — Proprietary to **Databricks**, governed by Unity Catalog and served by the Databricks SQL engine. Requires a Databricks account and incurs compute (and, for Genie/AI features, additional) cost.

### Why MiniML is different

**MiniML is completely non-proprietary.** This is the single most important reason to choose it:

- **No platform, no account, no subscription.** It is an MIT-licensed npm library. `npm install miniml` and you are done.
- **No running service to operate or pay for.** It is a function call — `renderQuery(model, options)` returns a SQL string. There is no server, no cluster, no managed endpoint, no API quota.
- **No vendor lock-in.** Your models are plain YAML you own. The output is plain SQL you run against *your own* database, however you already connect to it. Nothing about your data, your queries, or your metadata leaves your environment or flows through a vendor.
- **No per-query or LLM usage cost.** The query path is a deterministic compiler with zero usage-based billing.
- **Embeddable anywhere.** Because it is just a small library, it drops into any server, app, script, or agent — exactly where the proprietary options force you onto their platform instead.

The trade-off is honest: MiniML is intentionally minimal. It is a **library, not a platform**, so it does not give you a hosted serving API, caching, a query cache/accelerator, fan-out protection (see [fanout.md](./fanout.md)), or a wide matrix of warehouse adapters out of the box. If you need a fully managed, governed, multi-engine serving platform with caching and built-in correctness guarantees, one of the commercial options may be the better fit.

But if you want a semantic layer you can **embed, fully own, and run for free** — with no platform to buy into, no service to operate, and metadata ready to hand to an AI agent — MiniML is the option that asks nothing of you beyond an `npm install`.
