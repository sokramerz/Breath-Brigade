# defined categorical variables to be used in
# both the database and api response models

from enum import StrEnum

class RiskLevel(StrEnum):
    LOW = "Low"
    ELEVATED = "Elevated"
    HIGH = "High"
    VERY_HIGH = "Very High"
    CRITICAL = "Critical"

class Severity(StrEnum):
    INTERMITTENT = "intermittent"
    MILD_PERSISTENT = "mild_persistent"
    MODERATE_PERSISTENT = "moderate_persistent"
    SEVERE_PERSISTENT = "severe_persistent"

class Trigger(StrEnum):
    # Outdoor aeroallergen sensitivity
    POLLEN_OUTDOOR_MOLD = "Pollen or Outdoor Mold"

    # Outdoor pollution or wildfire smoke sensitivity
    OUTDOOR_POLLUTION_WILDFIRE_SMOKE = "Outdoor Pollution OR Wildfire Smoke"

    # Indoor allergen sensitivity
    DUST_DUST_MITES = "Dust or Dust Mites"
    PETS = "Pets"
    PESTS = "Pests"
    INDOOR_MOLD_DAMPNESS = "Indoor Mold or Dampness"

    # Weather sensitivity
    COLD_AIR = "Cold Air"
    HEAT_HIGH_HUMIDITY = "Heat or High Humidity"

    # Exercise related symptoms
    EXERCISE = "Physical Exercise"
