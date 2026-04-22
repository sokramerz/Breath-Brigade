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


if __name__ == "__main__":
    nuclear_reset()
    add_schema()
    fill_recs()
    insert_mock_user_1()
