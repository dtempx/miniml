SELECT
  DATE(sale_date) AS date,
  SUM(total_amount) AS total_amount
FROM acme.sales
WHERE DATE(sale_date) >= DATEADD(DAY, -7, DATE(sale_date))
GROUP BY ALL