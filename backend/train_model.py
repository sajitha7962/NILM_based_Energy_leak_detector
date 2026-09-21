import os
import json
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'public', 'data')
COMBINED_CSV = os.path.join(DATA_DIR, 'combined', 'energyguard_combined.csv')
MODEL_DIR = os.path.join(BASE_DIR, 'backend')

def extract_features(df):
    """
    Extract features from the raw dataset.
    """
    df = df.sort_values('timestamp').reset_index(drop=True)
    
    df['mean_power'] = df['power'].rolling(window=5, min_periods=1).mean()
    df['std_power'] = df['power'].rolling(window=5, min_periods=1).std().fillna(0)
    df['min_power'] = df['power'].rolling(window=5, min_periods=1).min()
    df['max_power'] = df['power'].rolling(window=5, min_periods=1).max()
    
    df['power_change'] = df['power'].diff().fillna(0)
    df['current_change'] = df['current'].diff().fillna(0)
    
    return df

def time_based_split(df, val_size=0.15, test_size=0.15):
    df = df.sort_values('timestamp')
    train_list, val_list, test_list = [], [], []
    
    for _, group in df.groupby('appliance'):
        group = group.sort_values('timestamp')
        n = len(group)
        n_train = int(n * (1 - val_size - test_size))
        n_val = int(n * val_size)
        
        train_list.append(group.iloc[:n_train])
        val_list.append(group.iloc[n_train:n_train+n_val])
        test_list.append(group.iloc[n_train+n_val:])
        
    return pd.concat(train_list), pd.concat(val_list), pd.concat(test_list)

def train():
    if not os.path.exists(COMBINED_CSV):
        print(f"Error: Combined dataset not found at {COMBINED_CSV}")
        return

    print("Loading combined dataset...")
    df = pd.read_csv(COMBINED_CSV)
    
    print("Extracting features...")
    df = extract_features(df)
    
    feature_cols = [
        'voltage', 'current', 'power', 'energy',
        'mean_power', 'std_power', 'min_power', 'max_power',
        'power_change', 'current_change'
    ]
    
    print(f"Dataset shape: {df.shape}")
    print("Performing time-based Train/Val/Test split (70/15/15) per appliance...")
    
    train_df, val_df, test_df = time_based_split(df)
    
    X_train, y_train = train_df[feature_cols], train_df['appliance']
    X_val, y_val = val_df[feature_cols], val_df['appliance']
    X_test, y_test = test_df[feature_cols], test_df['appliance']
    
    print(f"Train samples: {len(X_train)}, Val samples: {len(X_val)}, Test samples: {len(X_test)}")
    
    # 1. Train Random Forest Classifier (Supervised NILM Disaggregation)
    print("\n--- Model 1: Training Random Forest Classifier (NILM Disaggregation) ---")
    rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
    rf_model.fit(X_train, y_train)
    
    print("Validating Random Forest on Validation set...")
    val_pred = rf_model.predict(X_val)
    val_acc = accuracy_score(y_val, val_pred)
    print(f"Validation Accuracy: {val_acc * 100:.2f}%")
    
    print("Evaluating Random Forest on Test set...")
    y_pred = rf_model.predict(X_test)
    test_acc = accuracy_score(y_test, y_pred)
    print(f"Test Accuracy: {test_acc * 100:.2f}%")
    
    print("\nClassification Report (Test Set):")
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    print(classification_report(y_test, y_pred, zero_division=0))
    
    print("\nConfusion Matrix (Test Set):")
    cm = confusion_matrix(y_test, y_pred, labels=rf_model.classes_)
    cm_df = pd.DataFrame(cm, index=rf_model.classes_, columns=rf_model.classes_)
    print(cm_df)
    
    # 2. Train Isolation Forest (Unsupervised Energy Leak & Anomaly Detection)
    print("\n--- Model 2: Training Isolation Forest (Energy Leak & Anomaly Detection) ---")
    contamination = 0.05
    if_model = IsolationForest(n_estimators=100, contamination=contamination, random_state=42)
    if_model.fit(X_train)
    
    if_test_pred = if_model.predict(X_test)
    anomaly_rate = float(np.mean(if_test_pred == -1) * 100)
    print(f"Isolation Forest test anomaly rate: {anomaly_rate:.2f}% (Expected ~{contamination*100:.1f}%)")
    
    # Save the dual-model ensemble bundle
    bundle = {
        'classifier': rf_model,
        'anomaly_detector': if_model,
        'feature_cols': feature_cols,
        'classes': list(rf_model.classes_)
    }
    
    model_path = os.path.join(MODEL_DIR, 'model.pkl')
    joblib.dump(bundle, model_path)
    print(f"\nCombined model ensemble saved to {model_path}")
    
    # Save model metadata
    model_info = {
        'model': 'Random Forest + Isolation Forest (Hybrid Ensemble)',
        'classifier': 'Random Forest',
        'anomaly_detector': 'Isolation Forest',
        'dataset': 'UK-DALE + synthetic LED bulb',
        'evaluation_type': 'time_based_test_split',
        'classes': int(len(rf_model.classes_)),
        'features': len(feature_cols),
        'accuracy': float(test_acc * 100),
        'precision_macro': float(report['macro avg']['precision'] * 100),
        'recall_macro': float(report['macro avg']['recall'] * 100),
        'f1_macro': float(report['macro avg']['f1-score'] * 100),
        'contamination_rate': contamination,
        'if_estimators': 100,
        'anomaly_rate_test': anomaly_rate,
        'last_trained': datetime.now().strftime('%Y-%m-%d'),
        'total_samples': int(len(df)),
        'led_bulb_samples': int(len(df[df['appliance'] == 'LED_Bulb']))
    }
    
    info_path = os.path.join(MODEL_DIR, 'model_info.json')
    with open(info_path, 'w') as f:
        json.dump(model_info, f, indent=2)
    print(f"Model info saved to {info_path}")

if __name__ == '__main__':
    train()
