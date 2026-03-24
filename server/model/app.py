import os
import joblib
import pandas as pd
import numpy as np
import datetime
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
