SELECT
  DATE(sale_date) AS date,
  SUM(total_amount) AS total_amount
FROM acme.sales
WHERE DATE(sale_date) >= CURRENT_TIMESTAMP - INTERVAL '7 DAY'
GROUP BY ALL