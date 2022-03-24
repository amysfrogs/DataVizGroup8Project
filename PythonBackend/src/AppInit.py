from flask import Flask
import DataBroker as db
from DataInit import DataInit

app = Flask(__name__)

data_init = DataInit()
data_init.generate_pivoted_homicide_data()
data_init.consolidate_happiness_data_with_homicide_data()


@app.route('/data/worldMap')
def get_world_map():
    return db.DataBroker().get_world_map()


@app.route('/data/facts')
def get_data():
    return db.DataBroker().get_data()


@app.route('/data/facts/year/<year>')
def get_data_by_year(year):
    return db.DataBroker().get_data_by_year(year)


@app.route('/data/facts/country/<country>')
def get_data_by_country(country):
    return db.DataBroker().get_data_by_country(country)


@app.route('/data/facts/year/<year>/country/<country>')
def get_data_by_year_and_country(year, country):
    return db.DataBroker().get_data_by_year_and_country(year, country)


if __name__ == "__main__":
    app.run(debug=True)
