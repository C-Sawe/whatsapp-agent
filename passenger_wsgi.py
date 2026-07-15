import os
import sys

# Ensure your app directory is in the Python path and set as working directory
app_dir = os.path.dirname(__file__)
os.chdir(app_dir)
if app_dir not in sys.path:
    sys.path.insert(0, app_dir)

# Import your FastAPI app from main.py
from main import app as asgi_app
from a2wsgi import ASGIMiddleware

_wsgi_app = None

def application(environ, start_response):
    global _wsgi_app
    if _wsgi_app is None:
        _wsgi_app = ASGIMiddleware(asgi_app)
    return _wsgi_app(environ, start_response)
