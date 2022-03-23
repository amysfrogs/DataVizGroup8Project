import requests


BASE = "http://127.0.0.1:5000/"

response = requests.get(BASE + "data/worldMap")
print(len(response.json()))

response = requests.get(BASE + "data/facts")
print(len(response.text))

response = requests.get(BASE + "data/facts/year/2019")
print(len(response.text))

response = requests.get(BASE + "data/facts/country/Argentina")
print(len(response.text))

response = requests.get(BASE + "data/facts/year/2019/country/Argentina")
print(len(response.text))
