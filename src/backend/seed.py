# adding things to the local database for testing purposes
import pandas as pd
from .models import Base, Recommendation
from .database import engine, Session
from ast import literal_eval


def setup_recs_table():
    Base.metadata.create_all(bind=engine)
    db = Session()

    recs_df = pd.read_csv("backend/recommendations.csv", converters={"drivers": literal_eval})
    recs_df["drivers"] = recs_df["drivers"].apply(lambda x: [d.split("|") for d in x])
    recs_df["rec_id"] = [int(i) for i in range(recs_df.shape[0])]

    recs_df.to_sql("recommendations", con=engine, if_exists="append", index=False)

    # for _, row in recs_df.iterrows():
    #     new_rec = Recommendation(rec_id=row["rec_id"], recom=row["recom"], drivers=row["drivers"])
    #     db.add(new_rec)

    db.commit()
    db.close()


if __name__ == "__main__":
    setup_recs_table()