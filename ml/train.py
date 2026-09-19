"""Train a model to predict minutes until a laundry machine is available."""
import os
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import joblib

RNG = np.random.default_rng(42)
N = 5000

hour = RNG.integers(0, 24, N)
day = RNG.integers(0, 7, N)
machine_type = RNG.integers(0, 2, N)  # 0 = washer, 1 = dryer
minutes_since = RNG.integers(0, 60, N)

base = np.where(machine_type == 0, 35, 45)
rush = ((hour >= 18) & (hour <= 23)).astype(int) * 8
weekend = (day >= 5).astype(int) * -3
noise = RNG.normal(0, 5, N)
remaining = np.clip(base + rush + weekend - minutes_since + noise, 1, 120)

X = pd.DataFrame({
    "hour": hour,
    "day_of_week": day,
    "machine_type": machine_type,
    "minutes_since_report": minutes_since,
})
y = remaining

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = GradientBoostingRegressor(
    n_estimators=200, max_depth=4, learning_rate=0.05, random_state=42
)
model.fit(X_train, y_train)

mae = mean_absolute_error(y_test, model.predict(X_test))
print(f"Validation MAE: {mae:.2f} minutes")

os.makedirs("model", exist_ok=True)
joblib.dump(model, "model/suds_model.joblib")
print("Saved model -> model/suds_model.joblib")
