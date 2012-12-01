#Imports
from flask import Flask, render_template
from subprocess import call

# Define some awesome vars
app = Flask(__name__)


# Define routes
@app.route('/')
def index():
    return render_template('main.html')


@app.route('/timeline')
def timeline():
    return render_template('timeline.html')


@app.route('/update')
def update():
    call(["git", "pull"])
    return "Site updating... please wait just a few seconds. </br> (This page will not update)"


# Run the app
if __name__ == "__main__":
    app.debug = True
    app.run(host='0.0.0.0', port=5003)
