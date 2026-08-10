import re

with open('main.py', 'r') as f:
    content = f.read()

# Find the loop body to replace
pattern = r"""        for q_name, q_year, q_num, rev in quarters_raw:.*?results\.append\(\{"""
replacement = """        for q_name, q_year, q_num, rev in quarters_raw:
            if q_num == 1:
                start_date = f"{int(q_year)}-01-01 00:00:00"
                end_date = f"{int(q_year)}-03-31 23:59:59"
            elif q_num == 2:
                start_date = f"{int(q_year)}-04-01 00:00:00"
                end_date = f"{int(q_year)}-06-30 23:59:59"
            elif q_num == 3:
                start_date = f"{int(q_year)}-07-01 00:00:00"
                end_date = f"{int(q_year)}-09-30 23:59:59"
            else:
                start_date = f"{int(q_year)}-10-01 00:00:00"
                end_date = f"{int(q_year)}-12-31 23:59:59"

            cur.execute(f\"\"\"
                WITH Ranked AS (
                    SELECT cashier_name, SUM(revenue) as rev,
                    ROW_NUMBER() OVER(ORDER BY SUM(revenue) DESC) as rn
                    FROM sales_analytics
                    WHERE transaction_time >= %s AND transaction_time <= %s
                    {("AND store_id = " + str(store_id)) if store_id else ""}
                    GROUP BY cashier_name
                )
                SELECT cashier_name FROM Ranked WHERE rn = 1
            \"\"\", (start_date, end_date))
            best_cashier_row = cur.fetchone()
            best_cashier = best_cashier_row[0] if best_cashier_row else "N/A"

            cur.execute(f\"\"\"
                WITH Ranked AS (
                    SELECT sku, SUM(revenue) as rev,
                    ROW_NUMBER() OVER(ORDER BY SUM(revenue) DESC) as rn
                    FROM sales_analytics
                    WHERE transaction_time >= %s AND transaction_time <= %s
                    {("AND store_id = " + str(store_id)) if store_id else ""}
                    GROUP BY sku
                )
                SELECT l.description FROM Ranked r
                LEFT JOIN live_inventory l ON r.sku = l.sku
                WHERE r.rn = 1 LIMIT 1
            \"\"\", (start_date, end_date))
            best_product_row = cur.fetchone()
            best_product = best_product_row[0] if best_product_row else "N/A"

            cur.execute(f\"\"\"
                WITH Ranked AS (
                    SELECT TO_CHAR(transaction_time, 'Month') as m_name, SUM(revenue) as rev,
                    ROW_NUMBER() OVER(ORDER BY SUM(revenue) DESC) as rn
                    FROM sales_analytics
                    WHERE transaction_time >= %s AND transaction_time <= %s
                    {("AND store_id = " + str(store_id)) if store_id else ""}
                    GROUP BY TO_CHAR(transaction_time, 'Month')
                )
                SELECT m_name FROM Ranked WHERE rn = 1
            \"\"\", (start_date, end_date))
            best_month_row = cur.fetchone()
            best_month = best_month_row[0].strip() if best_month_row else "N/A"

            results.append({"""

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('main.py', 'w') as f:
    f.write(new_content)
print("main.py optimized!")
