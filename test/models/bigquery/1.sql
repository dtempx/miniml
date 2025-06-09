SELECT
  DATE(sale_date) AS date,
  SUM(total_amount) AS total_amount
FROM acme.sales
WHERE sale_date >= DATEADD(DAY, -90, CURRENT_DATE)
GROUP BY ALL