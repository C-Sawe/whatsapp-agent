import psycopg2

PG_DSN = "host=localhost dbname=evolution user=evolution_user password=evolution_db_password_secure_placeholder"

try:
    conn = psycopg2.connect(PG_DSN)
    conn.autocommit = True
    cur = conn.cursor()
    
    with open("rls_migration.sql", "r") as f:
        sql = f.read()
        
    cur.execute(sql)
    print("RLS Migration applied successfully!")
    
except Exception as e:
    print("Error:", e)
finally:
    if 'cur' in locals():
        cur.close()
    if 'conn' in locals():
        conn.close()
