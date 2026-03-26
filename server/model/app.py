import os
import joblib
import requests
import pandas as pd
import numpy as np
import datetime
import urllib3
from flask import Flask, request, jsonify
from flask_cors import CORS
from fire_spread import simulate_fire
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
