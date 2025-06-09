SELECT
  DATE(sale_date) AS date,
  store_name AS store_name,
  SUM(total_amount) AS total_amount,
  COUNT(*) AS count
FROM acme.sales
JOIN acme.stores USING (store_id)
WHERE sale_date >= DATEADD(DAY, -90, CURRENT_DATE)
AND (store_name = 'Acme Store')
GROUP BY ALL
HAVING AVG(unit_price) >= 10