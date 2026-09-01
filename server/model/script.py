import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
import sklearn



# Custom Fire Risk Model Class
class FireRiskModel:
    
    def __init__(self, model, bounds):
        self.model = model
        self.bounds = bounds
        
    def predict_proba(self, data):
        
        probs = self.model.predict_proba(data)[:, 1]
        
        # Monotonic Boosts
        t_boost = np.maximum(0, data['temp_c'].values - self.bounds['temp_c']) * 0.025
        r_boost = np.maximum(0, self.bounds['RH'] - data['RH'].values) * 0.025
        w_boost = np.maximum(0, data['wind_speed'].values - self.bounds['wind_speed']) * 0.050
        v_boost = np.maximum(0, data['veg_dryness'].values - self.bounds['veg_dryness']) * 0.015
        
        # Seasonal Boost
        seasonal_boost = np.where(
            (data['month'].isin([3,4,5])) & (data['RH'] < 45),
            0.03,
            0
        )
        
        combined_prob = probs + t_boost + r_boost + w_boost + v_boost + seasonal_boost
        
        # Risk Amplification
        final_probs = np.where(
            combined_prob >= 0.50,
            0.50 + (combined_prob - 0.50) * 1.5,
            combined_prob
        )
        
        # Water Mask Fix
        final_probs = np.where(data['landcover'].values == 80, 0.0, final_probs)
        
        final_probs = np.clip(final_probs, 0, 1.0)
        
        return final_probs
    
    def predict(self, data, threshold=0.52):
        probs = self.predict_proba(data)
        return (probs >= threshold).astype(int)


# 1. LOAD DATA
df = pd.read_csv('Odisha_Fire_Features_FINAL_ML_READY.csv')


# 2. DATA CLEANING
df = df[(df['temp_c'] > -100) & (df['RH'] < 100)]

# 3. FEATURE ENGINEERING
df['acq_date'] = pd.to_datetime(df['acq_date'], format='%d-%m-%y')
df['month'] = df['acq_date'].dt.month
df['veg_dryness'] = df['NDVI'] * (100 - df['RH'])

# Water bodies → No Fire
df.loc[df['landcover'] == 80, 'label'] = 0


# 4. FEATURES
train_features = [
    'LST_C', 'NDVI', 'aspect', 'era_precip', 'landcover',
    'slope', 'temp_c', 'RH', 'wind_speed', 'month', 'veg_dryness'
]

X = df[train_features]
y = df['label']
coords = df[['latitude', 'longitude']]


# 5. TRAIN TEST SPLIT
X_train, X_test, y_train, y_test, c_train, c_test = train_test_split(
    X, y, coords,
    test_size=0.3,
    random_state=42,
    stratify=y
)


# 6. TRAINING FRONTIERS

bounds = {
    'temp_c': X_train['temp_c'].max(),
    'LST_C': X_train['LST_C'].max(),
    'RH': X_train['RH'].min(),
    'wind_speed': X_train['wind_speed'].max(),
    'veg_dryness': X_train['veg_dryness'].max()
}


# 7. RANDOM FOREST

rf_model = RandomForestClassifier(
    n_estimators=200,
    max_depth=10,
    min_samples_leaf=5,
    random_state=42
)

rf_model.fit(X_train, y_train)


# 8. WRAP MODEL
model = FireRiskModel(rf_model, bounds)



# 9. PREDICTIONS
train_preds = model.predict(X_train)
test_probs = model.predict_proba(X_test)
test_preds = model.predict(X_test)


# 10. METRICS
print("\n--- BALANCED MODEL PERFORMANCE ---")

print("\n[TRAINING PERFORMANCE]")
print(classification_report(
    y_train,
    train_preds,
    target_names=['No Fire (0)', 'Fire (1)']
))

print("\n[TESTING PERFORMANCE]")
print(classification_report(
    y_test,
    test_preds,
    target_names=['No Fire (0)', 'Fire (1)']
))



# 11. SAVE RESULTS
results = c_test.copy().reset_index(drop=True)
results['Actual_Fire'] = y_test.values
results['Predicted_Fire'] = test_preds
results['Fire_Probability'] = test_probs

results['Risk_Level'] = pd.cut(
    results['Fire_Probability'],
    bins=[0, 0.35, 0.70, 1.0],
    labels=['LOW', 'MODERATE', 'HIGH']
)

results.to_csv('monotonic_balanced_results.csv', index=False)



# 12. SAVE MODEL

joblib.dump(model, 'final_fire_model.pkl')
print("Saved with sklearn:", sklearn.__version__)

# 13. SAVE FRONTIERS

joblib.dump(bounds, 'training_frontiers.pkl')


print("\n✅ Model Training Complete")
print("✅ final_fire_model.pkl saved")
print("✅ training_frontiers.pkl saved")
print("✅ monotonic_balanced_results.csv saved")