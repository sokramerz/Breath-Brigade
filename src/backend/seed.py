import pandas as pd
from models import Base, Recommendation, Location, User, UserProfile
from enums import RiskLevel, Severity, Trigger
from database import engine, Session
from ast import literal_eval
from sqlalchemy import MetaData


def nuclear_reset():
    """Empty out the database"""
    metadata = MetaData()
    metadata.reflect(bind=engine)
    metadata.drop_all(bind=engine)

def add_schema():
    """Add all the tables defined in models.py"""
    Base.metadata.create_all(engine)

def fill_recs():
    """Fill the recs table with the data from rec_defs.csv.
    """
    recs_df = pd.read_csv("src/backend/rec_defs.csv", converters={"drivers": literal_eval})
    recs_df["sources"] = recs_df["sources"].apply(lambda x: x.split("|"))
    recs_df.insert(0, "rec_id", recs_df.index)

    recs_df.to_sql("recs", con=engine, if_exists="append", index=False)

def insert_mock_user_1():
    """Insert a mock 'first' user + profile into the database.
    Also interts mock location data for the user.
    """
    with Session() as db:
        first_loc = Location(zip_code=34201, latitude=27.4, longitude=-82.5)
        db.add(first_loc)
        db.flush()

        first_user = User(username="adam")
        db.add(first_user)
        db.flush()

        first_profile = UserProfile(
            user_id=first_user.user_id,
            first_name="Adam",
            last_name="Prime",
            zip_code=first_loc.zip_code,
            severity=Severity.MILD_PERSISTENT,
            triggers=[Trigger.POLLEN_OUTDOOR_MOLD, Trigger.COLD_AIR, Trigger.EXERCISE]
        )
        db.add(first_profile)

        db.commit()

def insert_mock_user(**kwargs):
    """Insert a mock user + profile into the database. Also inserts mock location data for the user."""
    with Session() as db:
        new_loc = Location(zip_code=kwargs["zip_code"], latitude=kwargs["latitude"], longitude=kwargs["longitude"])
        db.add(new_loc)
        db.flush()

        new_user = User(username=kwargs["username"])
        db.add(new_user)
        db.flush()

        new_profile = UserProfile(
            user_id=new_user.user_id,
            first_name=kwargs["first_name"],
            last_name=kwargs["last_name"],
            zip_code=new_loc.zip_code,
            severity=kwargs["severity"],
            triggers=kwargs["triggers"]
        )
        db.add(new_profile)

        db.commit()


if __name__ == "__main__":
    nuclear_reset()
    add_schema()
    fill_recs()
    insert_mock_user_1()

    mock_users = [
    {
        "zip_code": 10001,
        "latitude": 40.7506,
        "longitude": -73.9970,
        "username": "maya",
        "first_name": "Maya",
        "last_name": "Lopez",
        "severity": Severity.INTERMITTENT,
        "triggers": [Trigger.EXERCISE, Trigger.COLD_AIR]
    },
    {
        "zip_code": 60601,
        "latitude": 41.8864,
        "longitude": -87.6186,
        "username": "jordan",
        "first_name": "Jordan",
        "last_name": "Reed",
        "severity": Severity.MILD_PERSISTENT,
        "triggers": [Trigger.POLLEN_OUTDOOR_MOLD, Trigger.PETS]
    },
    {
        "zip_code": 80202,
        "latitude": 39.7527,
        "longitude": -104.9992,
        "username": "sofia",
        "first_name": "Sofia",
        "last_name": "Nguyen",
        "severity": Severity.MODERATE_PERSISTENT,
        "triggers": [Trigger.COLD_AIR, Trigger.OUTDOOR_POLLUTION_WILDFIRE_SMOKE]
    },
    {
        "zip_code": 90012,
        "latitude": 34.0614,
        "longitude": -118.2396,
        "username": "liam",
        "first_name": "Liam",
        "last_name": "Carter",
        "severity": Severity.SEVERE_PERSISTENT,
        "triggers": [
            Trigger.OUTDOOR_POLLUTION_WILDFIRE_SMOKE,
            Trigger.HEAT_HIGH_HUMIDITY,
            Trigger.EXERCISE
        ]
    },
    {
        "zip_code": 33101,
        "latitude": 25.7751,
        "longitude": -80.1947,
        "username": "nina",
        "first_name": "Nina",
        "last_name": "Patel",
        "severity": Severity.MILD_PERSISTENT,
        "triggers": [Trigger.HEAT_HIGH_HUMIDITY, Trigger.INDOOR_MOLD_DAMPNESS]
    }
    ]   
    for mock_user in mock_users:
        insert_mock_user(**mock_user)

    # to test high aqi
    insert_mock_user(**{
        "zip_code": 32052,
        "latitude": 30.5,
        "longitude": -83.0,
        "username": "jeb",
        "first_name": "Jebediah",
        "last_name": "Kerman",
        "severity": Severity.SEVERE_PERSISTENT,
        "triggers": [
            Trigger.POLLEN_OUTDOOR_MOLD,
            Trigger.OUTDOOR_POLLUTION_WILDFIRE_SMOKE,
            Trigger.DUST_DUST_MITES,
            Trigger.INDOOR_MOLD_DAMPNESS,
            Trigger.COLD_AIR,
            Trigger.HEAT_HIGH_HUMIDITY,
            Trigger.EXERCISE
        ]
    })
    
