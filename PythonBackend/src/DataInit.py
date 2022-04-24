import pandas as pd


class DataInit:

    homicide_data = "./data/IntentionalHomicideVictimsByCountsAndRates.csv"
    happiness_data = "./data/ConsolidatedHappiness.csv"
    homicide_data_refined = "./data/IntentionalHomicidesFormatted.csv"
    consolidated_data = "./data/ConsolidatedHappinessWithHomicideData.csv"
    country_name_mapping = "./data/CountryNameMapping.csv"

    def __init__(self):
        print("Initializing DataInit Class...")

    def generate_pivoted_homicide_data(self):
        print("Reading Homicide RAW Data...")
        df = pd.read_csv(self.homicide_data)
        country_name_map_df = pd.read_csv(self.country_name_mapping)

        df = pd.merge(df, country_name_map_df[['Country', 'Homicide']], how='left',
                      left_on=['country'], right_on=['Homicide'])

        print("Unpivoting by Year to extract Homicide count and rate from RAW Data...")
        homicide_count_df = df[['Country', '2000',
                                '2001', '2002', '2003', '2004', '2005',
                                '2006', '2007', '2008', '2009', '2010',
                                '2011', '2012', '2013', '2014', '2015',
                                '2016', '2017', '2018', '2019', '2020']]

        homicide_count_unpivoted_df = homicide_count_df.melt(
            id_vars=['Country'], var_name='Year', value_name='NumberOfHomicides')

        homicide_rate_df = df[['Country', '2000.1',
                               '2001.1', '2002.1', '2003.1', '2004.1', '2005.1',
                               '2006.1', '2007.1', '2008.1', '2009.1', '2010.1',
                               '2011.1', '2012.1', '2013.1', '2014.1', '2015.1',
                               '2016.1', '2017.1', '2018.1', '2019.1', '2020.1']]

        homicide_rate_unpivoted_df = homicide_rate_df.melt(
            id_vars=['Country'], var_name='Year', value_name='RateOfHomicides')

        homicide_rate_unpivoted_df['Year'] = homicide_rate_unpivoted_df['Year'].str.replace('.1', '', regex=False)

        homicide_merged_df = pd.merge(homicide_count_unpivoted_df, homicide_rate_unpivoted_df, how='left',
                                      left_on=['Country', 'Year'], right_on=['Country', 'Year'])
        homicide_merged_df.fillna(0, inplace=True)

        print("Writing to output file: " + self.homicide_data_refined)
        homicide_merged_df.to_csv(self.homicide_data_refined, sep=',', encoding='utf-8', index=False)

    def consolidate_happiness_data_with_homicide_data(self):
        print("Reading Happiness RAW Data...")
        happiness_df = pd.read_csv(self.happiness_data)
        homicide_df = pd.read_csv(self.homicide_data_refined)
        country_name_map_df = pd.read_csv(self.country_name_mapping)

        happiness_df = pd.merge(happiness_df, country_name_map_df[['Country', 'Happiness']], how='left',
                                left_on=['country'], right_on=['Happiness'])

        consolidated_df = pd.merge(happiness_df,
                                   homicide_df[['NumberOfHomicides', 'RateOfHomicides', 'Country', 'Year']],
                                   how='left',
                                   left_on=['Country', 'Year'], right_on=['Country', 'Year'])

        print("Writing to output file: " + self.consolidated_data)
        consolidated_df.to_csv(self.consolidated_data, sep=',', encoding='utf-8', index=False)
