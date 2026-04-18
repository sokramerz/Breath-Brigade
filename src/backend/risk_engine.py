from typing import List
from .enums import RiskLevel, Severity, Trigger

class RiskEngine:
    # class attribute for severity baseline and multiplier
    SEVERITY_BASELINE = {
        Severity.INTERMITTENT: 0,
        Severity.MILD_PERSISTENT: 5,
        Severity.MODERATE_PERSISTENT: 10,
        Severity.SEVERE_PERSISTENT: 18
    }
    SEVERITY_MULTIPLIER = {
        Severity.INTERMITTENT: 1,
        Severity.MILD_PERSISTENT: 1.10,
        Severity.MODERATE_PERSISTENT: 1.20,
        Severity.SEVERE_PERSISTENT: 1.35
    }
    INTERACTION_CAP = 100 # TODO: determine how to set this cap

    def __init__(
            self, aqi: int, temp: float,
            thunder: bool, hum: float,
            severity: Severity, triggers: List[Trigger]
    ):
        self.aqi = aqi
        self.temp = temp
        self.thunder = thunder
        self.hum = hum
        self.severity = severity
        self.triggers = triggers

        self.drivers = {}
        # add triggers as a driver with 0 points, to be used in recommendations
        if Trigger.EXERCISE in triggers:
            self.drivers["exercise"] = 0
        if Trigger.POLLEN_OUTDOOR_MOLD in triggers:
            self.drivers["pollen_mold"] = 0
        

    
    def aqi_points(self):
        points_cat = (
            (0, "aqi_green") if self.aqi <= 50 else # green
            (2, "aqi_yellow") if self.aqi <= 100 else # yellow
            (8, "aqi_orange") if self.aqi <= 150 else # orange
            (14, "aqi_red") if self.aqi <= 200 else # red
            (20, "aqi_purple") if self.aqi <= 300 else # purple
            (24, "aqi_maroon") # maroon
        )
        self.drivers[points_cat[1]] = points_cat[0]
        return points_cat[0]
    
    def temp_points(self):
        points_cat = (
            (0, "temp_green") if 10.0 <= self.temp <= 29.0 else
            (2, "temp_yellow") if 5.0 <= self.temp < 10.0 or 29.0 < self.temp <= 32.0 else
            (4, "temp_orange") if 0.0 <= self.temp < 5.0 or 32.0 < self.temp <= 37.0 else
            (6, "temp_red") # below 0 C or above 37 C
        )
        self.drivers[points_cat[1]] = points_cat[0]
        return points_cat[0]
    
    def hum_points(self):
        points_cat = (
            (0, "hum_green") if 30.0 <= self.hum <= 60.0 else
            (1, "hum_yellow") if 20.0 <= self.hum < 30.0 or 60.0 < self.hum <= 70.0 else
            (2, "hum_orange") if self.hum < 20.0 or 70.0 < self.hum <= 80.0 else
            (4, "hum_red") # above 80% humidity
        )
        self.drivers[points_cat[1]] = points_cat[0]
        return points_cat[0]
    
    def thunder_points(self):
        points = 1 if self.thunder else 0
        self.drivers["thunder"] = points
        return points
    
    def inter_points(self):
        # points for interactions between environment and user info
        inter_drivers = {}

        if self.thunder and Trigger.POLLEN_OUTDOOR_MOLD in self.triggers:
            inter_drivers["thunder_pollen"] = 8

        if self.aqi >= 51 and Trigger.OUTDOOR_POLLUTION_WILDFIRE_SMOKE in self.triggers:
            inter_drivers["aqi_match_moderate"] = 2

        if self.aqi >= 100 and Trigger.OUTDOOR_POLLUTION_WILDFIRE_SMOKE in self.triggers:
            inter_drivers["aqi_match_mild"] = 4

        if self.temp >= 30.0 and self.hum >= 70.0:
            inter_drivers["hot_hum_base"] = 4
            if Trigger.HEAT_HIGH_HUMIDITY in self.triggers:
                inter_drivers["hot_hum_match"] = 2

        if self.temp <= 10.0 and self.hum <= 40.0:
            inter_drivers["cold_dry_base"] = 4
            if Trigger.COLD_AIR in self.triggers:
                inter_drivers["cold_dry_match"] = 2
        
        if self.hum >= 70.0 and Trigger.INDOOR_MOLD_DAMPNESS in self.triggers:
            inter_drivers["high_hum_mold_match"] = 3
        
        for driver in inter_drivers:
            self.drivers[driver] = inter_drivers[driver]

        return sum(inter_drivers.values())
    
    def calculate_risk(self):
        b = self.SEVERITY_BASELINE[self.severity]
        m = self.SEVERITY_MULTIPLIER[self.severity]
        w = (
            self.aqi_points() +
            self.temp_points() +
            self.hum_points() +
            self.thunder_points()
        )
        x = self.inter_points()
        risk_score = min(100, b + m * (w + min(x, self.INTERACTION_CAP)))




        

    






    