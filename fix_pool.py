import re

with open('main.py', 'r') as f:
    content = f.read()

# Remove the explicit putconn inside try blocks
content = content.replace("        db_pool.putconn(conn)\n", "")

# Add the finally block right after except Exception as e:
replacement = """    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'conn' in locals() and conn:
            try:
                db_pool.putconn(conn)
            except:
                pass"""

content = re.sub(r"    except Exception as e:\n        raise HTTPException\(status_code=500, detail=str\(e\)\)", replacement, content)

with open('main.py', 'w') as f:
    f.write(content)
print("main.py fixed!")
