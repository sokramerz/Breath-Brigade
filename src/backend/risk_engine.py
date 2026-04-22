from typing import List
from .enums import RiskLevel, Severity, Trigger
import pandas as pd
from .database import engine
from .schemas import RiskAssessment

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
        # add triggers as a driver with 1 points, to be used in recommendations
        if Trigger.EXERCISE in triggers:
            self.drivers["exercise"] = 1
        if Trigger.POLLEN_OUTDOOR_MOLD in triggers:
            self.drivers["pollen_mold"] = 1
        

    
    def aqi_points(self):
        points_driver = (
            (0, "aqi_green") if self.aqi <= 50 else # green
            (2, "aqi_yellow") if self.aqi <= 100 else # yellow
            (8, "aqi_orange") if self.aqi <= 150 else # orange
            (14, "aqi_red") if self.aqi <= 200 else # red
            (20, "aqi_purple") if self.aqi <= 300 else # purple
            (24, "aqi_maroon") # maroon
        )
        self.drivers[points_driver[1]] = points_driver[0]
        return points_driver[0]
    
    def temp_points(self):
        points_driver = (
            (0, "temp_green") if 10.0 <= self.temp <= 29.0 else
            (2, "temp_yellow") if 5.0 <= self.temp < 10.0 or 29.0 < self.temp <= 32.0 else
            (4, "temp_orange") if 0.0 <= self.temp < 5.0 or 32.0 < self.temp <= 37.0 else
            (6, "temp_red") # below 0 C or above 37 C
        )
        self.drivers[points_driver[1]] = points_driver[0]
        return points_driver[0]
    
    def hum_points(self):
        points_driver = (
            (0, "hum_green") if 30.0 <= self.hum <= 60.0 else
            (1, "hum_yellow") if 20.0 <= self.hum < 30.0 or 60.0 < self.hum <= 70.0 else
            (2, "hum_orange") if self.hum < 20.0 or 70.0 < self.hum <= 80.0 else
            (4, "hum_red") # above 80% humidity
        )
        self.drivers[points_driver[1]] = points_driver[0]
        return points_driver[0]
    
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
            inter_drivers["aqi_match_high"] = 4

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

        risk_level = (
            RiskLevel.LOW if risk_score <= 19 else
            RiskLevel.ELEVATED if risk_score <= 39 else
            RiskLevel.HIGH if risk_score <= 59 else
            RiskLevel.VERY_HIGH if risk_score <= 79 else
            RiskLevel.CRITICAL
        )

        self.drivers[risk_level + "_risk"] = 1
        return risk_level
    
    def get_recs(self):
        try:
            recs_df = pd.read_sql("SELECT * FROM recs", con=engine)
        except:
            # Fallback to CSV for demo if DB table doesn't exist
            import os
            csv_path = os.path.join(os.path.dirname(__file__), "rec_defs.csv")
            recs_df = pd.read_csv(csv_path)
            
        # Parse drivers column which is stored as pipe-separated strings in CSV or DB
        def parse_drivers(d_str):
            # If it's already a list of lists, return as is
            if isinstance(d_str, list): return d_str
            # Format is "dr1|dr2,dr3|dr4" -> [[dr1,dr2], [dr3,dr4]]
            return [group.split("|") for group in str(d_str).split(",")]

        recs_df["drivers_parsed"] = recs_df["drivers"].apply(parse_drivers)

        points_contrib = []
        for drivers_lists in recs_df["drivers_parsed"]:
            points = 0
            for drs in drivers_lists:
                temp_points = sum([self.drivers[dr] for dr in drs if dr in self.drivers])
                if temp_points == 0:
                    points = 0
                    break
                points += temp_points
            points_contrib.append(points)

        # keep track of recommendations sent for alert_history table
        ids_sent = []
        
        # filter for only recommendations that were activated
        recs_df["points_contrib"] = points_contrib
        recs_df = recs_df[recs_df["points_contrib"] > 0]

        # core recommendations are first 5 rows in recs table, there should be only one active here
        core_rec_df = recs_df[recs_df["rec_id"].isin([0, 1, 2, 3, 4])]
        assert core_rec_df.shape[0] == 1, "There should be exactly one active core recommendation"
        ids_sent.append(int(core_rec_df["rec_id"].iloc[0]))
        core_rec = core_rec_df["recom"].iloc[0]

        # driver recommendations are top 3 active recommendations outside of the core recs
        driver_recs_df = recs_df[~recs_df["rec_id"].isin([0, 1, 2, 3, 4])]
        driver_recs_df = driver_recs_df.sort_values(by="points_contrib", ascending=False).head(3)
        ids_sent.extend(driver_recs_df["rec_id"].tolist())
        driver_recs = driver_recs_df["recom"].tolist()

        return ids_sent, core_rec, driver_recs

    
    def assess(self):
        risk_level = self.calculate_risk()
        rec_ids, core_rec, driver_recs = self.get_recs()
        return rec_ids, RiskAssessment(
            risk_level=risk_level,
            core_rec=core_rec,
            driver_recs=driver_recs
        )




        

    






    