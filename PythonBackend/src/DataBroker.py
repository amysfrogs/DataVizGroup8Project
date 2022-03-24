from flask import Response
from flask_restful import Resource
import pandas as pd


class DataBroker(Resource):

    consolidated_data = "./data/ConsolidatedHappinessWithHomicideData.csv"
    country_data = "./data/50m.json"
    columns = ['Year', 'Country', 'Happiness rank', 'Score', 'GDP per capita', 'Social support Index',
               'Healthy life expectancy', 'Freedom Index', 'Generosity Index', 'Corruption Index',
               'NumberOfHomicides', 'RateOfHomicides']

    def __init__(self):
        print("Initializing DataBroker Class...")

    def get_world_map(self):
        f = open(self.country_data, 'r')
        return Response(
            f.read(),
            mimetype="application/json"
        )

    def get_data(self):
        df = pd.read_csv(self.consolidated_data)
        return Response(
            bytes(df[self.columns]
                  .to_csv(sep=',', encoding='utf-8', index=False), encoding='UTF-8'),
            mimetype="text/csv",
            headers={"Content-Disposition": "inline;filename=data.csv"}
        )

    def get_data_by_year(self, year):
        df = pd.read_csv(self.consolidated_data)
        return Response(
            bytes(df[df.Year == int(year)][self.columns]
                  .to_csv(sep=',', encoding='utf-8', index=False), encoding='UTF-8'),
            mimetype="text/csv",
            headers={"Content-Disposition": "inline;filename=data.csv"}
        )

    def get_data_by_country(self, country):
        df = pd.read_csv(self.consolidated_data)
        return Response(
            bytes(df[df.Country == country][self.columns]
                  .to_csv(sep=',', encoding='utf-8', index=False), encoding='UTF-8'),
            mimetype="text/csv",
            headers={"Content-Disposition": "inline;filename=data.csv"}
        )

    def get_data_by_year_and_country(self, year, country):
        df = pd.read_csv(self.consolidated_data)
        return Response(
            bytes(df[df.Year == int(year)][df.Country == country][self.columns]
                  .to_csv(sep=',', encoding='utf-8', index=False), encoding='UTF-8'),
            mimetype="text/csv",
            headers={"Content-Disposition": "inline;filename=data.csv"}
        )
