import sys
import os

# Add the directory containing the actual app.py to the Python path
# This allows gunicorn to find the imports inside server/model/app.py
model_dir = os.path.join(os.getcwd(), "server", "model")
sys.path.append(model_dir)

# Import the Flask app instance from server/model/app.py
from app import app as application

# Assign application back to app if gunicorn expects app:app or application:app
app = application

if __name__ == "__main__":
    app.run()
