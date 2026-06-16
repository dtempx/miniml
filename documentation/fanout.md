# Fan-Out and Join Cardinality (Important Caveat)

> **MiniML does not protect you from join fan-out.** It inlines your aggregate SQL as-written and lets the database evaluate the join. If a join is one-to-many, your additive measures over the *base* table will silently over-count.

This is the classic **"fan trap"** (and the related **"chasm trap"**) from dimensional modeling. When a `LEFT JOIN` matches one base row to *N* joined rows, the base row is duplicated *N* times in the result set **before** aggregation. Any `SUM`, `COUNT(*)`, or `AVG` over a base-table column then counts that row *N* times and returns a plausible-looking but wrong number — no error is raised.

```yaml
from: orders            # one row per order
join:
  line_items_join: LEFT JOIN line_items USING (order_id)   # many rows per order

measures:
  total_revenue:
    - Total order revenue
    - SUM(order_total)   # WRONG when line_items_join is active:
    - line_items_join    # order_total is duplicated per line item
```

Querying `total_revenue` grouped by a line-item dimension multiplies `order_total` by the number of line items on each order.

**MiniML has no automatic mitigation for this.** Unlike Looker/LookML — which neutralizes fan-out with **symmetric aggregates** (it requires a `primary_key` on each joined view and rewrites aggregations to de-duplicate via a hash of that key, so `SUM` stays correct even across a one-to-many join) — MiniML has **no concept of a primary key, join cardinality, or symmetric/hashed aggregation**. The generated SQL is exactly what you wrote, joins and all. Cube and the dbt Semantic Layer (MetricFlow) similarly understand join relationships and handle fan-out for you; MiniML does not.

**How to stay correct in MiniML:**
- **Prefer one model per grain.** Keep a measure and its base table at the same cardinality. Model the order grain and the line-item grain as *separate* models rather than joining across grains in one model. This is the simplest and safest option.
- **Only join down to a finer grain for *dimensions / filtering*,** not for aggregating the coarser table's columns. Drilling an order into its line items for grouping is fine; summing `order_total` in that same query is not.
- **Count the coarse entity with `COUNT(DISTINCT <key>)`** instead of `COUNT(*)` when a fan-out join is active — `COUNT(DISTINCT order_id)` survives duplication, `COUNT(*)` does not.
- **Aggregate at the finest grain.** If you must combine, base the model on the *finest* (most granular) table so that `SUM` operates on un-duplicated rows (e.g. base on `line_items` and treat `orders` columns as joined dimensions), and avoid additive measures sourced from the coarser table entirely.
- **Be aware that `always_join: all` and any always-on one-to-many join apply this fan-out to *every* query** — including ones that look grain-safe.

If your data has one-to-many joins, treat additive measures with care and document the grain each measure is valid at.