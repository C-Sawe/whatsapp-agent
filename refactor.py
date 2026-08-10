import re

def refactor():
    with open("main.py", "r") as f:
        content = f.read()

    # The endpoints to refactor
    endpoints = [
        "api_get_sales",
        "api_get_cashiers",
        "api_get_trending",
        "api_get_suppliers",
        "api_get_quarters",
        "api_get_debt",
        "api_get_inventory_prices"
    ]
    
    for ep in endpoints:
        # Step 1: replace the signature and connection creation
        # Match from `def ep(...` until `cur = conn.cursor()`
        pattern = r"(def " + ep + r"\b.*?)(username:\s*str\s*=\s*Depends\(verify_credentials\))(\s*:\s*try:\s*conn\s*=\s*db_pool\.getconn\(\)\s*cur\s*=\s*conn\.cursor\(\))"
        # Replace username... part with cur = Depends(get_db_cursor)
        content = re.sub(pattern, r"\1cur = Depends(get_db_cursor)\n:\n    try:", content, flags=re.DOTALL)
        
    # Step 2: remove all finally blocks that return connections
    finally_block = r"\s*finally:\s*if 'conn' in locals\(\) and conn:\s*try:\s*db_pool\.putconn\(conn\)\s*except:\s*pass"
    content = re.sub(finally_block, "", content)

    with open("main.py", "w") as f:
        f.write(content)
        
    print("Refactoring complete.")

if __name__ == "__main__":
    refactor()
