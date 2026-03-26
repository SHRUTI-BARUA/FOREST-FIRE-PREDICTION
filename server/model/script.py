import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

# 1. LOAD DATA
df = pd.read_csv('Odisha_Fire_Features_FINAL_ML_READY.csv')

# 2. DATA CLEANING
df = df[(df['temp_c'] > -100) & (df['RH'] < 100)]

# 3. FEATURE ENGINEERING
df['acq_date'] = pd.to_datetime(df['acq_date'], format='%d-%m-%y')
df['month'] = df['acq_date'].dt.month
df['veg_dryness'] = df['NDVI'] * (100 - df['RH'])

# 4. FEATURE SELECTION
train_features = [
    'LST_C', 'NDVI', 'aspect', 'era_precip', 'landcover', 
    'slope', 'temp_c', 'RH', 'wind_speed', 'month', 'veg_dryness'
]

X = df[train_features]
y = df['label']
coords = df[['latitude', 'longitude']] # Numerical Lat/Lon maintained as requested

# 5. DATA SPLIT
X_train, X_test, y_train, y_test, c_train, c_test = train_test_split(
    X, y, coords, test_size=0.3, random_state=42, stratify=y
)

# 6. EXTRACT OOD FRONTIERS
bounds = {
    'temp_c': X_train['temp_c'].max(),
    'LST_C': X_train['LST_C'].max(),
    'RH': X_train['RH'].min(),
    'wind_speed': X_train['wind_speed'].max(),
    'veg_dryness': X_train['veg_dryness'].max()
}

# 7. TRAIN MODEL
model = RandomForestClassifier(
    n_estimators=200, 
    max_depth=10, 
    min_samples_leaf=5, 
    random_state=42
)
model.fit(X_train, y_train)

# # 8. BALANCED MONOTONIC LOGIC (Fixes No Fire Recall & Amplifies Active Risk)
# def predict_balanced_logic(data, model, b, class_threshold=0.52):
#     # Base probability
#     probs = model.predict_proba(data)[:, 1]
    
#     # Monotonic Boosts (Reverted to stable weights for high No Fire recall)
#     t_boost = np.maximum(0, data['temp_c'].values - b['temp_c']) * 0.025
#     r_boost = np.maximum(0, b['RH'] - data['RH'].values) * 0.025
#     w_boost = np.maximum(0, data['wind_speed'].values - b['wind_speed']) * 0.050
#     v_boost = np.maximum(0, data['veg_dryness'].values - b['veg_dryness']) * 0.015
    
#     # Seasonal Safety Margin (Small +3% boost for Odisha Peak Season)
#     seasonal_boost = np.where((data['month'].isin([3, 4, 5])) & (data['RH'] < 45), 0.03, 0)
    
#     combined_prob = probs + t_boost + r_boost + w_boost + v_boost + seasonal_boost
    
#     # --- STEP A: BINARY PREDICTION (Using higher threshold for >0.70 No Fire Recall) ---
#     preds = (combined_prob >= class_threshold).astype(int)
    
#     # --- STEP B: RISK AMPLIFICATION (Stretches the value for the probability column) ---
#     # This pushes a 60% base signal to 75% for visual alerts
#     final_probs = np.where(
#         combined_prob >= 0.45,
#         0.45 + (combined_prob - 0.45) * 1.5, 
#         combined_prob
#     )
#     final_probs = np.clip(final_probs, 0, 1.0)
    
#     return preds, final_probs

# 8. BALANCED MONOTONIC LOGIC (With Water-Body Protection)
def predict_balanced_logic(data, model, b, class_threshold=0.52):
    # Base probability
    probs = model.predict_proba(data)[:, 1]
    
    # 1. Monotonic Boosts 
    t_boost = np.maximum(0, data['temp_c'].values - b['temp_c']) * 0.025
    r_boost = np.maximum(0, b['RH'] - data['RH'].values) * 0.025
    w_boost = np.maximum(0, data['wind_speed'].values - b['wind_speed']) * 0.050
    v_boost = np.maximum(0, data['veg_dryness'].values - b['veg_dryness']) * 0.015
    
    # 2. Seasonal Safety Margin
    seasonal_boost = np.where((data['month'].isin([3, 4, 5])) & (data['RH'] < 45), 0.03, 0)
    
    combined_prob = probs + t_boost + r_boost + w_boost + v_boost + seasonal_boost
    
    # --- STEP A: RISK AMPLIFICATION ---
    final_probs = np.where(
        combined_prob >= 0.50,
        0.50 + (combined_prob - 0.50) * 1.5, 
        combined_prob
    )
    
    # --- STEP B: GEOSPATIAL WATER MASK ---
    # In ESA WorldCover: 80 = Water. 
    # We force these to 0 probability so they show as "No Risk" on your map.
    final_probs = np.where(data['landcover'].values == 80, 0.0, final_probs)
    
    # Clip to ensure values stay between 0 and 1
    final_probs = np.clip(final_probs, 0, 1.0)
    
    # --- STEP C: BINARY PREDICTION ---
    preds = (final_probs >= class_threshold).astype(int)
    
    return preds, final_probs

# 9. EXECUTE PREDICTIONS
train_preds, _ = predict_balanced_logic(X_train, model, bounds)
test_preds, test_probs = predict_balanced_logic(X_test, model, bounds)

# 10. PRINT METRICS (Verifying both training and testing)
print(f"--- BALANCED EVALUATION (Target: No Fire Recall > 0.70) ---")
print("\n[TRAINING PERFORMANCE]")
print(classification_report(y_train, train_preds, target_names=['No Fire (0)', 'Fire (1)']))

print("\n[TESTING PERFORMANCE]")
print(classification_report(y_test, test_preds, target_names=['No Fire (0)', 'Fire (1)']))

# 11. SAVE NUMERICAL OUTPUT
results = c_test.copy().reset_index(drop=True)
results['Actual_Fire'] = y_test.values
results['Predicted_Fire'] = test_preds
results['Fire_Probability'] = test_probs

# Add Risk Level categorization
results['Risk_Level'] = pd.cut(results['Fire_Probability'], 
                               bins=[0, 0.3, 0.65, 1.0], 
                               labels=['LOW', 'MODERATE', 'HIGH'])

results.to_csv('monotonic_balanced_results.csv', index=False)
joblib.dump(model, 'final_fire_model.pkl')
joblib.dump(bounds, 'training_frontiers.pkl')

print("\nSuccess: 'monotonic_balanced_results.csv' created with numerical coordinates.")

""" 

import numpy as np
import pandas as pd
import joblib

# 1. TEST SCENARIO: Hot Water Body (Should be 0% risk)
# new_scenario = {
#     'latitude': 20.1523,       
#     'longitude': 84.8821,      
#     'LST_C': 39.50,            
#     'NDVI': -0.1,              
#     'aspect': 0,               
#     'era_precip': 0.0,         
#     'landcover': 80,           # ESA WorldCover: Permanent Water
#     'slope': 0,           
#     'temp_c': 35.0,            
#     'RH': 40.0,             
#     'wind_speed': 2.0,      
#     'month': 4                 
# }

def predict_real_unseen(input_data):
    # Load model and training boundaries
    model = joblib.load('final_fire_model.pkl')
    bounds = joblib.load('training_frontiers.pkl')
    
    # Pre-process: Calculate veg_dryness
    input_data['veg_dryness'] = input_data['NDVI'] * (100 - input_data['RH'])
    
    # Prepare features for model
    features = ['LST_C', 'NDVI', 'aspect', 'era_precip', 'landcover', 
                'slope', 'temp_c', 'RH', 'wind_speed', 'month', 'veg_dryness']
    
    df_input = pd.DataFrame([input_data])[features]
    
    # 1. Get Base Probability
    base_prob = model.predict_proba(df_input)[0, 1]
    
    # 2. Calculate Monotonic/Seasonal Boosts
    t_boost = max(0, input_data['temp_c'] - bounds['temp_c']) * 0.025
    r_boost = max(0, bounds['RH'] - input_data['RH']) * 0.025
    w_boost = max(0, input_data['wind_speed'] - bounds['wind_speed']) * 0.050
    v_boost = max(0, input_data['veg_dryness'] - bounds['veg_dryness']) * 0.015
    seasonal_boost = 0.03 if (input_data['month'] in [3, 4, 5] and input_data['RH'] < 45) else 0
    
    combined_prob = base_prob + t_boost + r_boost + w_boost + v_boost + seasonal_boost
    
    # 3. Risk Amplification
    if combined_prob >= 0.45:
        final_prob = 0.45 + (combined_prob - 0.45) * 2.0
    else:
        final_prob = combined_prob

    # --- THE WATER FIX: Hard override for landcover 80 ---
    if input_data['landcover'] == 80:
        final_prob = 0.0
    # ----------------------------------------------------
        
    final_prob = np.clip(final_prob, 0, 1.0)
    prob_percent = final_prob * 100

    # 4. Risk Tier Logic
    if prob_percent < 40:
        risk_level = "LOW RISK"
    elif 40 <= prob_percent < 70:
        risk_level = "MODERATE RISK"
    else:
        risk_level = "HIGH RISK"
    
    # 5. Output
    print(f"--- PREDICTION FOR COORDS: {input_data['latitude']}, {input_data['longitude']} ---")
    print(f"Base Model Probability: {base_prob:.2%}")
    print(f"Seasonal/OOD Boost:     {(t_boost + r_boost + w_boost + v_boost + seasonal_boost):.2%}")
    print(f"Final Amplified Risk:   {final_prob:.2%}")
    print(f"Risk Category:          {risk_level}")
    print("-" * 50)

# Run the test
predict_real_unseen(new_scenario) """

