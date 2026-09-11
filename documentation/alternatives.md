# MiniML vs. Other Semantic Layers

There are many semantic layers and "metrics" technologies, and the field moved quickly in 2025–2026: every major platform vendor now ships a semantic layer, most of them expose it to AI agents over the Model Context Protocol (MCP), and a handful of new open-source engines have appeared. This document compares MiniML to the most relevant alternatives and explains where MiniML fits — and, more importantly, why you might choose it.

The short version: **MiniML is the smallest thing on this list that actually produces SQL.** It is an MIT-licensed npm library with a handful of small dependencies, no server, no platform, no account, and no query language to learn. The commercial options are bound to a data platform or BI vendor and bill for usage. The open-source options are real and worth knowing about, but each one is either a *server you operate*, a *language you adopt*, or a *runtime you take on* (Python/Ibis, Rust/DataFusion, a full Node data-language toolchain). MiniML is a function call. That is its differentiator.

> **Snapshot date.** Everything here reflects public documentation, repositories, and announcements as of September 2026. Vendor status changes fast; follow the links in [Sources](#sources) for current state.

## The Alternatives

### Platform-bound semantic layers (commercial)

- **dbt Semantic Layer (MetricFlow)** — The metrics/semantic layer built into dbt. You define semantic models and metrics in YAML alongside your dbt project; MetricFlow compiles them into SQL. MetricFlow itself is now Apache-2.0 and dbt Core users can run `mf query` locally, but the *served* Semantic Layer API (and the dbt MCP server that fronts it) is a paid dbt platform feature. dbt Labs completed its merger with Fivetran on June 1, 2026.
- **Snowflake Semantic Views / Cortex Analyst / Cortex Agents** — Snowflake's semantic model is now a first-class schema object (`CREATE SEMANTIC VIEW`) rather than a YAML file on a stage; standard SQL querying of semantic views went GA in March 2026. Cortex Analyst translates natural-language questions into SQL over those views, and as of August 2026 Snowflake recommends transitioning from Cortex Analyst to Cortex Agents.
- **Cube (Cube Cloud / Cube Core)** — A standalone semantic layer (open-core) that defines cubes/views in YAML, JavaScript, or Python and exposes them over SQL, REST, GraphQL, MDX, and MCP, with caching and access control. Cube Core is open source; Cube Cloud and the "D3" agentic analytics platform (launched June 2025) are the commercial offering.
- **Looker (LookML)** — Google Cloud's BI platform. LookML is its modeling language for dimensions, measures, and explores. Looker now ships a Managed MCP server and a Conversational Analytics API so agents can query the semantic layer headlessly, and LookML can sit on top of Snowflake Semantic Views and BigQuery Graph models. The model is still inseparable from the Looker platform that consumes it.
- **Databricks Metric Views (Unity Catalog Business Semantics)** — Databricks' semantic layer, GA since April 2, 2026. Metric views are defined in SQL DDL (early previews used YAML), governed by Unity Catalog, and queried through Databricks SQL, dashboards, and Genie. Databricks is open-sourcing the metric view implementation into Apache Spark (SPARK-54119) and Unity Catalog OSS.
- **Microsoft Fabric / Power BI semantic models** — The Power BI semantic model (tables, relationships, DAX measures, row-level security) is Microsoft's semantic layer. Copilot in Power BI and Fabric IQ agents translate natural language into DAX queries against it. Bound to the Fabric/Power BI platform and licensing.
- **Tableau Semantics (Salesforce)** — Salesforce's semantic layer inside Data 360, powering Tableau Next and Agentforce analytics skills. Sold as part of the Tableau+ SKU / Data 360.
- **Amazon QuickSight Topics** — QuickSight's semantic layer for natural-language Q&A via Amazon Q. Bound to QuickSight/AWS.
- **AtScale (SML)** — A commercial universal semantic layer with an MCP server. AtScale open-sourced its modeling language, SML (Semantic Modeling Language, Apache-2.0), as a spec with an SDK, CLI, and converters — but no open-source query engine.
- **Omni, Honeydew, GoodData, and other BI/semantic vendors** — Each has a proprietary semantic model, most now expose MCP, and most are members of the Apache Ossie interchange effort. They are BI platforms first; the semantic layer is not separable.

### Open-source engines and libraries

- **Malloy (+ Publisher)** — Google-originated, MIT-licensed data *language* implemented in TypeScript. A Malloy source defines dimensions, measures, and joins; queries compile to SQL for BigQuery, Snowflake, DuckDB, MotherDuck, PostgreSQL, MySQL, Trino, Presto, and Databricks. It is embeddable as npm packages (`@malloydata/malloy`), handles fan-out with symmetric aggregates, and the open-source **Publisher** server exposes models over REST and MCP. The trade-off is that Malloy is a full language with its own syntax and toolchain, not a YAML model.
- **Boring Semantic Layer (BSL)** — MIT-licensed Python library from boringdata and xorq-labs, built on Ibis. You attach dimensions and measures to Ibis tables in Python and query them; Ibis compiles to any backend it supports (DuckDB, Snowflake, BigQuery, PostgreSQL, and more). Explicitly "MCP-friendly" and inspired by Malloy. Requires a Python/Ibis runtime; the model is Python code rather than a declarative file.
- **Wren Engine / Wren AI** — Apache-2.0 semantic engine (Rust on Apache DataFusion, with a Python `ibis-server`) that reads a JSON Modeling Definition Language (MDL) and both plans and executes queries across ~25 sources. Ships an MCP server. The engine repo has been folded into the Wren AI monorepo, which is the commercial text-to-SQL product it underpins. It is a service you deploy, not a library.
- **Rill** — Apache-2.0 "BI for humans and agents" tool. Metrics views are YAML (dimensions, measures, time grains) compiled to SQL against DuckDB, ClickHouse, Druid, Pinot, or MotherDuck; it ships an MCP server. Rill is a dashboarding server with a commercial Rill Cloud; the semantic layer is not usable on its own.
- **MetricFlow (standalone)** — Listed above under dbt, but worth calling out: since version 0.209.0 MetricFlow is Apache-2.0 (it was AGPL, then BSL), and dbt Core users can compile metric queries to SQL locally without dbt Cloud. It still requires a dbt project and the Python dbt toolchain.
- **Lightdash** — Open-source BI whose semantic layer is YAML, either as dbt `meta` or standalone "Lightdash YAML" for non-dbt users, with an API and Python SDK. It is a BI server, not a library.
- **Bruin** — Open-source data CLI whose `semantic/` YAML files define metrics, dimensions, segments, and joins that compile to SQL via `bruin query`. Young, CLI-first.
- **OrionBelt** — A *source-available* (BUSL-1.1, not open source) Python "semantic sidecar" that compiles YAML (OBML) models into SQL for eight dialects (BigQuery, ClickHouse, Databricks, Dremio, DuckDB/MotherDuck, MySQL, PostgreSQL, Snowflake), with fan-trap protection via a multi-fact query planner, a REST API, a PostgreSQL wire-protocol endpoint for BI tools, an MCP server, and an OBML↔Ossie converter. Notable for its correctness work (TPC-DS row-level comparisons), but it is a server with commercial tiers.

### Specifications (not engines)

- **Apache Ossie (incubating)** — Formerly Open Semantic Interchange (OSI); renamed and moved into the Apache Incubator on July 10, 2026. A vendor-neutral YAML/JSON format for exchanging semantic models between tools. Spec v0.1 was released January 27, 2026; `main` carries a `0.2.0.dev0` draft. Backed by 50+ organizations (Snowflake, Salesforce, dbt Labs, Databricks, AtScale, Qlik, Denodo, Kyvos, and others). It defines datasets, fields, metrics, and relationships but generates no SQL and has no query API. See [MiniML vs. Apache Ossie](./miniml-vs-apache-ossie.md).
- **SML (AtScale)** — See AtScale above. A second, older YAML modeling spec (multidimensional: hierarchies, semi-additive measures, many-to-many) with converters but no open engine.

### MiniML

- **MiniML** — A minimal, embeddable semantic modeling library. YAML models in, SQL out (BigQuery and Snowflake today). No service, no platform, no account — a small TypeScript/JavaScript library you call from your own code, plus a CLI that prints agent-ready model metadata.

## Headless Semantic Layers vs. Agentic Semantic Models

A useful way to categorize these tools is by **what you hand the semantic layer** and **what comes back**:

### Headless semantic layers — *metadata in, generated SQL out*

A headless semantic layer is "headless" because it has no embedded AI/LLM intelligence of its own. Instead, it **exposes the model's metadata** to an external agent which is responsible for arranging that metadata into a **structured request** — "give me these dimensions and these measures, filtered this way" — and submits it back to the layer, which then deterministically compiles the specified metadata into SQL and returns the query (or the results). The metadata is the contract; the caller does the choosing, and the output is reproducible and auditable.

- **MiniML** is headless: you select dimensions/measures (the metadata) and it returns SQL. Nothing more, nothing less.
- **dbt Semantic Layer (MetricFlow)**, **Cube**, **Malloy/Publisher**, **Boring Semantic Layer**, **Rill**, **OrionBelt**, and **Databricks metric views** are headless: applications (or agents) request named metrics and dimensions and get deterministic SQL or results.
- **LookML** is effectively a (platform-bound) headless model under the hood — explores compile metadata into SQL — and with Looker's MCP server and Conversational Analytics API it is now consumed headlessly as well, but only through Looker's platform.

The defining trait: **the request is metadata, and the translation to SQL is deterministic.** Given the same selection, you get the same SQL every time.

### Agentic semantic models — *natural language in, an embedded LLM generates the SQL, runs it, and returns data*

An agentic semantic model is designed to sit behind a large language model. Instead of a structured selection of fields, you pass a **natural-language question** ("what was revenue by region last quarter?"). The semantic model here functions as *grounding* — it tells the LLM what tables, columns, metrics, and business terms exist, often with extra natural-language descriptions, synonyms, and verified-query examples — and the **model/agent decides** which fields to use and emits the SQL.

- **Snowflake Cortex Analyst / Cortex Agents** is the clearest example: the semantic view exists to steer an LLM that interprets natural-language questions into SQL.
- **Databricks Genie**, **Power BI Copilot**, **Tableau Next / Agentforce**, **Amazon Q in QuickSight**, **Looker Conversational Analytics**, and **Wren AI** layer the same natural-language-to-query behavior over their respective semantic models.

The defining trait: **the request is natural language, and an LLM (not a deterministic compiler) chooses the SQL.** The semantic model is context/instructions for that model, and the same question can produce different SQL across runs.

### Where MiniML sits — and how it bridges both

MiniML is firmly a **headless** semantic layer: its `renderQuery` function is a deterministic metadata-to-SQL compiler. There is no LLM in the query path, so the SQL is reproducible and reviewable.

But MiniML is *also* built to feed agents. It generates compact, model-specific metadata (the `npx miniml model.yaml` description, plus the `info`/Jinja documentation) that you can hand to an LLM as context. The agent reasons in natural language, decides which dimensions and measures it wants, and then calls MiniML's deterministic compiler to produce safe SQL — getting the grounding benefits of an agentic model **without** giving up the determinism, auditability, and SQL-injection guardrails of a headless one. You get the best of both categories without being locked into a vendor's agent.

## MCP Is Now the Common Surface

The biggest change since 2025 is that **nearly every semantic layer now speaks MCP**: Cube, dbt (dbt MCP server), Looker (Managed MCP and the open-source MCP Toolbox), AtScale, Malloy Publisher, Rill, Wren, OrionBelt, Boring Semantic Layer, and Snowflake (Cortex Agents as MCP servers, GA August 2026). The pattern is the same everywhere: the agent lists available measures and dimensions, asks for them by name, and the layer compiles the SQL — which is exactly the headless model described above.

MiniML does not ship an MCP server, and deliberately so. It is the *compiler* you call from inside one. Wrapping MiniML in an MCP server is a few dozen lines: one tool that returns the model description, one tool that takes dimensions/measures/filters and returns `renderQuery` output (or runs it against your warehouse). You own the server, the auth, and the transport, and nothing leaves your environment. Every alternative above that offers MCP does so as part of a service you run or a platform you pay for.

## A Note on Apache Ossie

[Apache Ossie](https://github.com/apache/ossie/) does not fit the headless/agentic split above because it is neither: it is an **interchange format**, not an engine. An Ossie file describes tables, fields, metrics, and relationships (with multi-dialect SQL expressions and `ai_context` hints), and Python converters translate it to and from vendor-native formats (Snowflake, Salesforce/Tableau, dbt, Databricks, Omni, WisdomAI, NVIDIA GSF). Something else still has to turn that model into a query.

That makes Ossie complementary to MiniML rather than an alternative to it. MiniML is exactly the kind of engine an Ossie model would be handed to, and a MiniML model maps cleanly onto Ossie's `fields`, `metrics`, and `relationships`. Ossie is still incubating (v0.1 released January 2026; `0.2.0.dev0` in draft), so its shape may change. The full comparison, including a field-by-field mapping, is in [miniml-vs-apache-ossie.md](./miniml-vs-apache-ossie.md).

## Feature Comparison: MiniML vs. Platform Semantic Layers

| Feature | **MiniML** | dbt Semantic Layer (MetricFlow) | Snowflake Semantic Views / Cortex | Cube | Looker (LookML) | Databricks Metric Views |
|---|---|---|---|---|---|---|
| **Type** | Headless (agent-friendly) | Headless | Agentic (over a governed semantic view) | Headless + agentic (D3) | Platform-bound model, headless via MCP | Headless + agentic (Genie) |
| **Primary input** | Metadata (dimension/measure selection) | Metadata (metrics/dimensions) | Natural language (or SQL over the view) | Metadata | Metadata (via Looker UI/API/MCP) | Metadata + natural language |
| **Output** | SQL string | SQL / data via API | SQL + answer | SQL / data via APIs | Data + visualizations | Data via SQL engine |
| **Model definition** | YAML | YAML | `CREATE SEMANTIC VIEW` DDL (legacy YAML) | YAML / JavaScript / Python | LookML | SQL DDL (Unity Catalog) |
| **Open source** | ✅ MIT | ⚠️ MetricFlow Apache-2.0; SL service is dbt platform | ❌ | ⚠️ Open-core (engine OSS) | ❌ | ⚠️ Engine being upstreamed to Apache Spark; service proprietary |
| **Proprietary / vendor-bound** | ❌ None | ⚠️ Service tied to dbt platform (Fivetran) | ✅ Snowflake only | ⚠️ Engine free; cloud is commercial | ✅ Looker/Google only | ✅ Databricks only |
| **Requires a running service/server** | ❌ | ⚠️ Local `mf query` with dbt Core; ✅ for the SL API | ✅ | ✅ | ✅ | ✅ |
| **Requires a platform account/subscription** | ❌ | ✅ Starter+ plan for the SL API (not on free tier) | ✅ Snowflake | ⚠️ Self-host or Cube Cloud | ✅ Looker | ✅ Databricks |
| **Additional usage/compute cost** | ❌ | ✅ Metered per queried metric (5k/mo Starter, 20k/mo Enterprise) | ✅ (Cortex per-message + warehouse) | ⚠️ (hosting / Cube Cloud) | ✅ | ✅ |
| **Embeddable as a library** | ✅ npm import | ⚠️ Python CLI inside a dbt project | ❌ | ⚠️ via API/SDK | ❌ | ❌ |
| **Deterministic SQL (no LLM in path)** | ✅ | ✅ | ⚠️ Deterministic for SQL-over-view; LLM for Analyst/Agents | ✅ | ✅ | ⚠️ (deterministic for metric views; LLM via Genie) |
| **MCP server** | ❌ (you wrap it; see above) | ✅ dbt MCP server (platform) | ✅ Cortex Agents as MCP | ✅ | ✅ Managed MCP + OSS toolbox | ⚠️ via Databricks MCP servers |
| **SQL dialects** | BigQuery, Snowflake (more planned) | Snowflake, BigQuery, Databricks, Postgres, Redshift | Snowflake | Many | Many | Databricks/Spark SQL |
| **Multi-engine / warehouse-agnostic** | ⚠️ (dialect-based) | ✅ | ❌ | ✅ | ✅ | ❌ |
| **Built-in caching / serving** | ❌ (library only) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Join fan-out protection** | ❌ (see [fanout.md](./fanout.md)) | ✅ | ⚠️ | ✅ | ✅ (symmetric aggregates) | ⚠️ |
| **AI/agent metadata generation** | ✅ Built-in | ⚠️ via API/MCP | ✅ (its whole purpose; Semantic View Autopilot) | ✅ (D3 semantic agent) | ✅ (Conversational Analytics) | ✅ (Genie, agent metadata) |
| **Footprint** | Tiny library | dbt toolchain + platform | Cloud platform | Server/cluster | Enterprise platform | Cloud platform |

Legend: ✅ yes / full · ⚠️ partial, conditional, or with caveats · ❌ no.

## Feature Comparison: MiniML vs. Open-Source Engines

These are the tools that, like MiniML, you can run for free and that actually produce SQL. The question here is not "proprietary or not" but **how much you have to adopt to get SQL out.**

| Feature | **MiniML** | Malloy | Boring Semantic Layer | MetricFlow (local) | Wren Engine | Rill | OrionBelt |
|---|---|---|---|---|---|---|---|
| **License** | MIT | MIT | MIT | Apache-2.0 (≥0.209) | Apache-2.0 | Apache-2.0 | BUSL-1.1 (source-available) |
| **Runtime** | Node.js | Node.js ≥20 | Python + Ibis | Python + dbt Core | Rust (DataFusion) + Python server | Server binary | Python 3.12+ server |
| **Model format** | YAML | Malloy language | Python code (Ibis) | dbt YAML | MDL (JSON) | YAML metrics views | OBML (YAML) |
| **Shape** | Library + CLI | Language + library + Publisher server | Library | CLI within a dbt project | Service (Docker) | BI server | Service + CLI |
| **Embeddable as a library** | ✅ | ✅ (npm) | ✅ (pip) | ❌ CLI | ❌ | ❌ | ⚠️ Python `pipeline.compile` |
| **Returns SQL without executing** | ✅ | ✅ (`compile`) | ⚠️ via Ibis compile | ✅ | ⚠️ | ❌ | ✅ |
| **Learning curve beyond YAML** | None | New language | Python/Ibis API | dbt semantic model spec | MDL + deployment | Rill project layout | OBML + deployment |
| **Dialects** | BigQuery, Snowflake | 9 engines | Any Ibis backend | 5 warehouses | ~25 sources | DuckDB, ClickHouse, Druid, Pinot, MotherDuck | 8 dialects |
| **Fan-out protection** | ❌ (see [fanout.md](./fanout.md)) | ✅ symmetric aggregates | not documented | ✅ | ⚠️ | ⚠️ | ✅ multi-fact planner |
| **MCP server** | ❌ (wrap it) | ✅ Publisher | ✅ | ⚠️ via dbt MCP (platform) | ✅ | ✅ | ✅ |
| **Commercial upsell** | None | None | None (xorq catalog optional) | dbt platform | Wren AI | Rill Cloud | Paid tiers |
| **Ossie interchange** | ❌ (mapping documented) | ❌ | ❌ | ✅ converter | ❌ | ❌ | ✅ OBML↔OSI |

**How to read this:** Malloy and Boring Semantic Layer are MiniML's closest peers — free, embeddable, deterministic. Malloy is far more capable (multi-engine, symmetric aggregates, nested queries) at the cost of being a *language* with its own compiler and toolchain. BSL is Python-native and inherits Ibis's backend breadth, at the cost of a model that is Python code rather than a reviewable YAML file. Wren, Rill, and OrionBelt are services. MiniML is the option for when you want a declarative YAML model and a single function that returns SQL, in a JavaScript/TypeScript codebase, with nothing else to run.

## Commercial and Proprietary Considerations

Every platform-bound alternative is a **commercial product bound to a specific platform or ecosystem**, and using it as an actual semantic *service* generally requires one or more of: a platform subscription, a running managed service, and per-query/compute (or LLM token) usage costs.

- **dbt Semantic Layer** — MetricFlow is Apache-2.0 and runs locally with dbt Core, but the queryable Semantic Layer API and dbt MCP server are **dbt platform** features: unavailable on the free Developer plan, included from Starter up with a metered allowance of queried metrics per month. Your models live inside the dbt toolchain, now owned by Fivetran.
- **Snowflake Semantic Views / Cortex** — Fully proprietary and **Snowflake-only**. Semantic views are Snowflake schema objects; Cortex Analyst/Agents bill per message plus warehouse compute for the generated SQL. Your semantic model is not portable off Snowflake except via the Ossie converter or the Tableau TDS export.
- **Cube** — The core engine is open source, but production use typically means either operating your own Cube server/cluster or paying for **Cube Cloud**; D3's agents are part of the commercial platform. Either way there is real infrastructure and (for the hosted tier) subscription cost.
- **Looker / LookML** — A fully proprietary **Google Cloud** product. LookML is meaningless without the Looker platform that interprets it; the MCP server and Conversational Analytics API are ways *into* Looker, not ways to take the model out. Requires Looker licensing.
- **Databricks Metric Views** — Proprietary to **Databricks**, governed by Unity Catalog and served by the Databricks SQL engine. The metric view *implementation* is being open-sourced into Apache Spark, which may eventually make definitions portable, but today it requires a Databricks account and incurs compute (and, for Genie/AI features, additional) cost.
- **Microsoft Fabric / Power BI, Tableau Semantics, Amazon QuickSight** — Semantic models that exist to serve their own BI product and its copilot. Licensing is per-platform (Fabric capacity / Power BI seats, Tableau+ / Data 360, QuickSight), and the models are not consumable outside that product.
- **AtScale, Omni, Honeydew, GoodData** — Commercial semantic/BI platforms. AtScale's SML spec is open, but the engine that evaluates it is not.

### Why MiniML is different

**MiniML is a library, not a platform or a service.** This is the single most important reason to choose it:

- **No platform, no account, no subscription.** It is an MIT-licensed npm library. `npm install miniml` and you are done.
- **No running service to operate or pay for.** It is a function call — `renderQuery(model, options)` returns a SQL string. There is no server, no cluster, no managed endpoint, no API quota. Even the open-source alternatives that offer MCP do so as a process you deploy.
- **No language or runtime to adopt.** Models are plain YAML; queries are plain objects. You do not learn Malloy, write Ibis, install a Python toolchain, or run Docker. If you already write TypeScript or JavaScript, there is nothing new.
- **No vendor lock-in.** Your models are plain YAML you own. The output is plain SQL you run against *your own* database, however you already connect to it. Nothing about your data, your queries, or your metadata leaves your environment or flows through a vendor. And the model maps onto Apache Ossie if you ever need interchange.
- **No per-query or LLM usage cost.** The query path is a deterministic compiler with zero usage-based billing.
- **Embeddable anywhere.** Because it is just a small library, it drops into any server, app, script, MCP server, or agent — exactly where the platform options force you onto their platform instead.

The trade-off is honest: MiniML is intentionally minimal. It is a **library, not a platform**, so it does not give you a hosted serving API, caching, fan-out protection (see [fanout.md](./fanout.md)), multi-fact query planning, or a wide matrix of warehouse adapters out of the box. If you need a fully managed, governed, multi-engine serving platform with caching and built-in correctness guarantees, one of the commercial options may be the better fit. If you need those things for free and can carry a heavier toolchain, Malloy (Node) or Boring Semantic Layer (Python) are the open-source peers to evaluate.

But if you want a semantic layer you can **embed, fully own, and run for free** — with no platform to buy into, no service to operate, no language to learn, and metadata ready to hand to an AI agent — MiniML is the option that asks nothing of you beyond an `npm install`.

## Sources

Platform status and pricing:

- dbt: [About MetricFlow](https://docs.getdbt.com/docs/build/about-metricflow) · [MetricFlow license history](https://github.com/dbt-labs/metricflow#license-history) · [dbt pricing](https://www.getdbt.com/pricing) · [Fivetran + dbt Labs merger completion (June 1, 2026)](https://www.fivetran.com/press/fivetran-dbt-labs-complete-merger-to-create-the-data-infrastructure-for-trusted-ai-agents)
- Snowflake: [Cortex Analyst](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-analyst) · [2026 feature releases](https://docs.snowflake.com/en/release-notes/feature-releases-2026) · [Native semantic views](https://www.snowflake.com/en/blog/engineering/native-semantic-views-ai-bi/)
- Cube: [Announcing Cube D3](https://cube.dev/blog/announcing-cube-d3) · [Semantic layer for AI agents (2026)](https://cube.dev/articles/semantic-layer-for-ai-agents-2026)
- Looker: [Introducing Looker MCP Server](https://cloud.google.com/blog/products/business-intelligence/introducing-looker-mcp-server) · [Looker in the 2026 Gartner MQ](https://cloud.google.com/blog/products/business-intelligence/looker-in-2026-gartner-analytics-and-bi-platforms-mq) · [Conversational Analytics overview](https://docs.cloud.google.com/looker/docs/conversational-analytics-overview)
- Databricks: [Unity Catalog Business Semantics GA and open sourcing](https://www.databricks.com/blog/redefining-semantics-data-layer-future-bi-and-ai) · [Metric views docs](https://docs.databricks.com/aws/en/uc-semantics/metric-views/)
- Microsoft: [Power BI semantic models in Fabric](https://learn.microsoft.com/en-us/fabric/data-warehouse/semantic-models)
- Salesforce: [Tableau Semantics](https://www.salesforce.com/analytics/tableau-semantics/) · [Tableau Next](https://www.salesforce.com/analytics/tableau-next/)
- AtScale: [SML repository](https://github.com/semanticdatalayer/SML)

Open-source engines:

- [Malloy](https://github.com/malloydata/malloy) · [Malloy Publisher](https://github.com/malloydata/publisher) · [Malloy MCP for agents](https://docs.malloydata.dev/documentation/user_guides/publishing/mcp_agents)
- [Boring Semantic Layer](https://github.com/boringdata/boring-semantic-layer) · [BSL docs](https://boringdata.github.io/boring-semantic-layer/)
- [Wren Engine](https://github.com/Canner/wren-engine) (archived into [Wren AI](https://github.com/Canner/WrenAI))
- [Rill](https://github.com/rilldata/rill) · [Metrics view YAML](https://docs.rilldata.com/reference/project-files/metrics-views)
- [Lightdash semantic layer](https://docs.lightdash.com/guides/lightdash-semantic-layer)
- [Bruin semantic layer tools comparison](https://getbruin.com/blog/semantic-layer-tools/)
- [OrionBelt Semantic Layer](https://github.com/ralforion/orionbelt-semantic-layer)

Specifications:

- [Apache Ossie](https://github.com/apache/ossie/) · [Ossie updates timeline](https://ossie.apache.org/updates/) · [Ossie converters](https://github.com/apache/ossie/tree/main/converters)
