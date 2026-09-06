import os
from main import db_pool

with open("stocktake_migration.sql", "r") as f:
    sql = f.read()

conn = db_pool.getconn()
try:
    cur = conn.cursor()
    cur.execute(sql)
    conn.commit()
    print("Migration successful!")
except Exception as e:
    conn.rollback()
    print("Migration failed:", e)
finally:
    db_pool.putconn(conn)
