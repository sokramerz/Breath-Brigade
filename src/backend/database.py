# Connection to PostgreSQL database
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv() # loads variables from .env
DATABASE_URL = os.getenv("DATABASE_URL") or "sqlite:///./test.db"

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

def get_db():
    db = Session()
    try:
        yield db
    finally:
        db.close()

