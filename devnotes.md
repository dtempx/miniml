
## examples
To replicate results in the README...
- `node command test/models/snowflake/sales.yaml`
- `node command test/models/snowflake/sales.yaml --dimensions=date --measures=total_amount`
- `node command test/models/snowflake/sales.yaml --dimensions=date,customer_name,product_name --measures=total_amount,price_avg,count --date_from=2025-01-01 --date_to=2025-01-31 --order_by=-date --limit=10`
- `node command test/models/snowflake/sales.yaml --dimensions=date,customer_name --measures=total_amount,count --date_from=2025-01-01 --date_to=2025-01-31 --order_by=-date --limit=10`
