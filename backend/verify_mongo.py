import os
from pymongo import MongoClient
from urllib.parse import quote_plus

# Testing connection
password = quote_plus("Simha1407")
url = f"mongodb+srv://narasimha9663020_db_user:{password}@schoolhub.faj4wrs.mongodb.net/?appName=schoolHub"

print(f"Testing connection to: {url.replace(password, '****')}")

try:
    client = MongoClient(url, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    print("Ping successful!")
except Exception as e:
    print(f"Ping failed: {e}")
