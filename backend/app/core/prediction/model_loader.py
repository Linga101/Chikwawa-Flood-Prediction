import os
import pickle
from app.config import settings

class ModelLoader:
    def __init__(self):
        self.model_dir = settings.MODEL_DIR
        self.active_model_file = os.path.join(self.model_dir, "active_model.txt")
        self.model = None
        self.scaler = None
        self.version = "unknown"

    def _get_active_version(self):
        if not os.path.exists(self.active_model_file):
            return "v1" # Default fallback
        with open(self.active_model_file, "r") as f:
            return f.read().strip()

    def load(self):
        version = self._get_active_version()
        model_path = os.path.join(self.model_dir, f"lgb_model_{version}.txt")
        scaler_path = os.path.join(self.model_dir, f"scaler_{version}.pkl")

        # Fallback to unversioned names if versioned files don't exist
        if not os.path.exists(model_path):
            model_path = os.path.join(self.model_dir, "lgb_model.txt")
        if not os.path.exists(scaler_path):
            scaler_path = os.path.join(self.model_dir, "scaler.pkl")

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at {model_path}")
        
        if model_path.endswith('.txt'):
            import lightgbm as lgb
            self.model = lgb.Booster(model_file=model_path)
        else:
            with open(model_path, "rb") as f:
                self.model = pickle.load(f)
        
        with open(scaler_path, "rb") as f:
            self.scaler = pickle.load(f)
        
        self.version = version
        return self.model, self.scaler

model_loader = ModelLoader()
