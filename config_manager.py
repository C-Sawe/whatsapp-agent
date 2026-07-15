import os

ENV_FILE = ".env"

def get_env_vars() -> dict:
    """Reads all current variables from the .env file."""
    vars = {}
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    if '=' in line:
                        key, value = line.split('=', 1)
                        vars[key.strip()] = value.strip()
    return vars

def update_env_vars(new_vars: dict):
    """Updates the .env file with new variables."""
    current_vars = get_env_vars()
    
    # Update with new values
    for k, v in new_vars.items():
        if v is not None:
            current_vars[k] = v
            
    # Write back to file
    with open(ENV_FILE, 'w') as f:
        for k, v in current_vars.items():
            f.write(f"{k}={v}\n")
            
    # Also update os.environ so the current process sees the changes
    for k, v in new_vars.items():
        if v is not None:
            os.environ[k] = str(v)
