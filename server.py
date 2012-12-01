#Imports
from flask import Flask, redirect, request, sesison, render_template
import json

# Define some awesome vars
app = Flask(__name__)


# Define routes
@app.route("/")
def index():
    return "Hello World"

# Run the app
if __name__ == "__main__":
    app.debug = True
    app.run(host='0.0.0.0', port=5003)
