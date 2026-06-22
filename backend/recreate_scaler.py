import pickle
import numpy as np
from sklearn.preprocessing import StandardScaler

def recreate_scaler():
    print(f"Using NumPy version: {np.__version__}")
    scaler = StandardScaler()
    
    # Values extracted from the original scaler.pkl
    means = np.array([2.26494931e+02, 3.31421897e+00, 6.67651417e-01, 3.28144007e+02,
                      9.50426945e+02, 2.16831988e+02, 2.00655579e+00, 3.56104167e+00,
                      1.34555556e+00])
                      
    scales = np.array([1.46296944e+02, 3.93457422e+00, 1.14045377e-01, 1.08205135e+02,
                       1.05242973e+03, 1.91521364e+02, 1.02600423e+01, 1.07594740e+00,
                       9.32980423e-01])
                       
    variances = scales ** 2
    
    scaler.mean_ = means
    scaler.scale_ = scales
    scaler.var_ = variances
    scaler.n_features_in_ = 9
    
    with open('models/scaler.pkl', 'wb') as f:
        pickle.dump(scaler, f)
        
    print("Successfully recreated scaler.pkl for NumPy 1.x compatibility.")

if __name__ == "__main__":
    recreate_scaler()
