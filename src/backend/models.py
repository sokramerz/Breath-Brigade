# Database table definitions (SQLAlchemy)
from dotenv import load_dotenv
from sqlalchemy import (
    create_engine, Column, Integer, Numeric,
    CheckConstraint, String, ForeignKey,
    DateTime, func
)
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import ARRAY


Base = declarative_base()

class Location(Base):
    __tablename__ = "zip_geo"

    zip_code = Column(Integer, primary_key=True)
    latitude = Column(Numeric(precision=3, scale=1), nullable=False)
    longitude = Column(Numeric(precision=4, scale=1), nullable=False)

    __table_args__ = (
        CheckConstraint("latitude >= -90.0 AND latitude <= 90.0", name="check_lat_range"),
        CheckConstraint("longitude >= -180.0 AND longitude <= 180.0", name="check_lon_range")
    )

    users_within = relationship("UserProfile", back_populates="location")
    alerts_within = relationship("Alert", back_populates="location")


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True)
    username = Column(String(30), unique=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        CheckConstraint("username ~ '^[a-zA-Z0-9_-]'"),
    )

    profile = relationship("UserProfile", back_populates="user", uselist=False)
    alerts = relationship("Alert", back_populates="user")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    first_name = Column(String)
    last_name = Column(String)
    zip_code = Column(Integer, ForeignKey("zip_geo.zip_code"))
    severity = Column(String)
    triggers = Column(ARRAY(String)) # TODO: define what the triggers can be

    user = relationship("User", back_populates="profile")
    location = relationship("Location", back_populates="users_within")


class Alert(Base):
    __tablename__ = "alert_history"

    alert_id = Column(Integer, primary_key=True)
    date_time = Column(DateTime, server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.user_id"))
    alert_code = Column(Integer, ForeignKey("alert_types.alert_code")) # TODO: define set of alerts, each with a code and description
    zip_code = Column(Integer, ForeignKey("zip_geo.zip_code"))

    user = relationship("User", back_populates="alerts")
    location = relationship("Location", back_populates="alerts_within")
    info = relationship("AlertType", back_populates="alerts")


class AlertType(Base):
    __tablename__ = "alert_types"

    alert_code = Column(Integer, primary_key=True)
    description = Column(String)

    alerts = relationship("Alert", back_populates="info")


class Recommendation(Base):
    __tablename__ = "recommendations"

    rec_id = Column(Integer, primary_key=True)
    drivers = Column(ARRAY(String, dimensions=2)) # list of lists of drivers that trigger this recommendation, e.g. [["aqi_red", "exercise"], ["thunder_pollen"]]
    recom = Column(String, nullable=False)
    sources = Column(ARRAY(String))

    

    