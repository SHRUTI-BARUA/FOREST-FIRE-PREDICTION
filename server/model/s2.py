import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

# 1. LOAD DATA
df = pd.read_csv('Odisha_Fire_Features_FINAL_ML_READY.csv')

# 2. DATA CLEANING
# Remove rows with corrupted weather placeholders
df = df[(df['temp_c'] > -100) & (df['RH'] < 100)]

# 3. FEATURE ENGINEERING
df['acq_date'] = pd.to_datetime(df['acq_date'], format='%d-%m-%y')
df['month'] = df['acq_date'].dt.month
# Vegetation dryness is the interaction of NDVI and Humidity
df['veg_dryness'] = df['NDVI'] * (100 - df['RH'])

# 4. FEATURE SELECTION
# Excluded: Elevation (as requested), Latitude, Longitude (kept for output only)
train_features = [
    'LST_C', 'NDVI', 'aspect', 'era_precip', 'landcover', 
    'slope', 'temp_c', 'RH', 'wind_speed', 'month', 'veg_dryness'
]

X = df[train_features]
y = df['label']
coords = df[['latitude', 'longitude']] # Numerical lat/lo for mapping

# 5. DATA SPLIT
X_train, X_test, y_train, y_test, c_train, c_test = train_test_split(
    X, y, coords, test_size=0.3, random_state=42, stratify=y
)

# 6. EXTRACT OOD FRONTIERS (Training Maximums/Minimums)
# These define the boundaries for monotonic risk scaling
bounds = {
    'temp_c': X_train['temp_c'].max(),
    'LST_C': X_train['LST_C'].max(),
    'RH': X_train['RH'].min(),
    'wind_speed': X_train['wind_speed'].max(),
    'veg_dryness': X_train['veg_dryness'].max()
}

# 7. TRAIN CONSTRAINED MODEL
# max_depth=10 prevents the 1.00 overfitting you saw earlier
model = RandomForestClassifier(
    n_estimators=200, 
    max_depth=10, 
    min_samples_leaf=5, 
    random_state=42
)
model.fit(X_train, y_train)

# 8. MONOTONIC OOD RISK FUNCTION
def predict_with_monotonic_logic(data, model, b, threshold=0.5):
    # Base probability from the Random Forest
    probs = model.predict_proba(data)[:, 1]
    
    # Calculate Risk Boosts for OOD values
    # Ensures risk increases even after training max is reached
    temp_boost = np.maximum(0, data['temp_c'].values - b['temp_c']) * 0.025
    lst_boost = np.maximum(0, data['LST_C'].values - b['LST_C']) * 0.020
    rh_boost = np.maximum(0, b['RH'] - data['RH'].values) * 0.025
    wind_boost = np.maximum(0, data['wind_speed'].values - b['wind_speed']) * 0.050
    veg_boost = np.maximum(0, data['veg_dryness'].values - b['veg_dryness']) * 0.015
    
    # Combine boosts and cap probability at 1.0 (100%)
    total_boost = temp_boost + lst_boost + rh_boost + wind_boost + veg_boost
    final_probs = np.clip(probs + total_boost, 0, 1.0)
    
    return (final_probs >= threshold).astype(int), final_probs

# 9. EXECUTE PREDICTIONS
train_preds, _ = predict_with_monotonic_logic(X_train, model, bounds)
test_preds, test_probs = predict_with_monotonic_logic(X_test, model, bounds)

# 10. PRINT FULL METRICS
print(f"--- EVALUATION AT CUSTOM THRESHOLD: 0.5 ---")
print("\n[TRAINING PERFORMANCE]")
print(classification_report(y_train, train_preds, target_names=['No Fire (0)', 'Fire (1)']))

print("\n[TESTING PERFORMANCE]")
print(classification_report(y_test, test_preds, target_names=['No Fire (0)', 'Fire (1)']))

# 11. SAVE NUMERICAL OUTPUT FOR MAPPING
results = c_test.copy().reset_index(drop=True)
results['Actual_Fire'] = y_test.values
results['Predicted_Fire'] = test_preds
results['Fire_Probability'] = test_probs

# Save files for use in your project
results.to_csv('monotonic_final_results.csv', index=False)
joblib.dump(model, 'final_fire_model.pkl')
joblib.dump(bounds, 'training_frontiers.pkl')

print("\nSuccess: Model trained and 'monotonic_final_results.csv' created with numerical coordinates.")