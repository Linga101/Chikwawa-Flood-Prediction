import json

notebook = {
 "cells": [
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "# 07 - Model Training (Random Forest, XGBoost, LightGBM)\n",
    "In this notebook, we load the preprocessed and scaled train/test datasets to build three powerful ensemble models for flood prediction. We will evaluate and compare their performance."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "import pandas as pd\n",
    "import numpy as np\n",
    "import matplotlib.pyplot as plt\n",
    "import seaborn as sns\n",
    "from pathlib import Path\n",
    "import os\n",
    "import pickle\n",
    "import warnings\n",
    "warnings.filterwarnings('ignore')\n",
    "\n",
    "# Check if xgboost and lightgbm are available.\n",
    "try:\n",
    "    from xgboost import XGBClassifier\n",
    "    from lightgbm import LGBMClassifier\n",
    "except ImportError:\n",
    "    print(\"Please run: pip install xgboost lightgbm\")\n",
    "\n",
    "from sklearn.ensemble import RandomForestClassifier\n",
    "from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, classification_report, roc_curve\n",
    "\n",
    "# Paths\n",
    "notebook_dir = Path(os.path.abspath(''))\n",
    "project_root = notebook_dir.parent\n",
    "processed_dir = project_root / 'data' / 'processed'\n",
    "models_dir = project_root / 'models'\n",
    "models_dir.mkdir(exist_ok=True)\n",
    "figures_dir = project_root / 'figures'\n",
    "\n",
    "plt.rcParams.update({'figure.dpi': 120, 'font.size': 11})\n",
    "sns.set_style('whitegrid')"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "## 1. Load Data\n",
    "The data was already scaled (`StandardScaler`) and oversampled (`SMOTE`) during step 06. The test set remains untouched by SMOTE to ensure a realistic physical evaluation base."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "print(\"Loading datasets...\")\n",
    "train_df = pd.read_csv(processed_dir / 'train_set.csv')\n",
    "test_df = pd.read_csv(processed_dir / 'test_set.csv')\n",
    "\n",
    "X_train = train_df.drop(columns=['Flood'])\n",
    "y_train = train_df['Flood']\n",
    "\n",
    "X_test = test_df.drop(columns=['Flood'])\n",
    "y_test = test_df['Flood']\n",
    "\n",
    "print(f\"X_train shape: {X_train.shape}, y_train shape: {y_train.shape}\")\n",
    "print(f\"X_test shape:  {X_test.shape}, y_test shape:  {y_test.shape}\")"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "## 2. Evaluation Wrapper Function\n",
    "We create a reusable function to streamline the evaluation of all our models and standardized outputs."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "def evaluate_model(model, X_test, y_test, model_name):\n",
    "    y_pred = model.predict(X_test)\n",
    "    y_prob = model.predict_proba(X_test)[:, 1]\n",
    "    \n",
    "    accuracy = accuracy_score(y_test, y_pred)\n",
    "    precision = precision_score(y_test, y_pred, zero_division=0)\n",
    "    recall = recall_score(y_test, y_pred, zero_division=0)\n",
    "    f1 = f1_score(y_test, y_pred, zero_division=0)\n",
    "    auc = roc_auc_score(y_test, y_prob)\n",
    "    \n",
    "    print(f\"--- {model_name} Performance ---\")\n",
    "    print(f\"Accuracy : {accuracy:.4f}\")\n",
    "    print(f\"Precision: {precision:.4f}\")\n",
    "    print(f\"Recall   : {recall:.4f}\")\n",
    "    print(f\"F1 Score : {f1:.4f}\")\n",
    "    print(f\"ROC AUC  : {auc:.4f}\\n\")\n",
    "    print(\"Classification Report:\")\n",
    "    print(classification_report(y_test, y_pred, zero_division=0))\n",
    "    \n",
    "    # Confusion Matrix Plot\n",
    "    cm = confusion_matrix(y_test, y_pred)\n",
    "    plt.figure(figsize=(5, 4))\n",
    "    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')\n",
    "    plt.title(f'{model_name} - Confusion Matrix')\n",
    "    plt.ylabel('Actual')\n",
    "    plt.xlabel('Predicted')\n",
    "    plt.tight_layout()\n",
    "    plt.savefig(figures_dir / f'cm_{model_name.replace(\" \", \"_\").lower()}.png')\n",
    "    plt.show()\n",
    "    \n",
    "    return {'accuracy': accuracy, 'precision': precision, 'recall': recall, 'f1': f1, 'auc': auc, 'y_prob': y_prob}"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "## 3. Train Models"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "print(\"Training Random Forest...\")\n",
    "rf_model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)\n",
    "rf_model.fit(X_train, y_train)\n",
    "\n",
    "rf_metrics = evaluate_model(rf_model, X_test, y_test, \"Random Forest\")"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "print(\"Training XGBoost...\")\n",
    "xgb_model = XGBClassifier(n_estimators=100, learning_rate=0.1, random_state=42, eval_metric='logloss')\n",
    "xgb_model.fit(X_train, y_train)\n",
    "\n",
    "xgb_metrics = evaluate_model(xgb_model, X_test, y_test, \"XGBoost\")"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "print(\"Training LightGBM...\")\n",
    "lgb_model = LGBMClassifier(n_estimators=100, learning_rate=0.1, random_state=42)\n",
    "lgb_model.fit(X_train, y_train)\n",
    "\n",
    "lgb_metrics = evaluate_model(lgb_model, X_test, y_test, \"LightGBM\")"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "## 4. Compare Models and Evaluate ROC"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "# Compare all models gracefully\n",
    "models_comparison = pd.DataFrame({\n",
    "    'Random Forest': rf_metrics,\n",
    "    'XGBoost': xgb_metrics,\n",
    "    'LightGBM': lgb_metrics\n",
    "}).T.drop(columns=['y_prob'])\n",
    "\n",
    "print(\"Model Comparison Summary:\")\n",
    "display(models_comparison.sort_values(by='f1', ascending=False))\n",
    "\n",
    "# Plot ROC Curves\n",
    "plt.figure(figsize=(8, 6))\n",
    "\n",
    "fpr_rf, tpr_rf, _ = roc_curve(y_test, rf_metrics['y_prob'])\n",
    "fpr_xgb, tpr_xgb, _ = roc_curve(y_test, xgb_metrics['y_prob'])\n",
    "fpr_lgb, tpr_lgb, _ = roc_curve(y_test, lgb_metrics['y_prob'])\n",
    "\n",
    "plt.plot(fpr_rf, tpr_rf, label=f\"Random Forest (AUC = {rf_metrics['auc']:.4f})\")\n",
    "plt.plot(fpr_xgb, tpr_xgb, label=f\"XGBoost (AUC = {xgb_metrics['auc']:.4f})\")\n",
    "plt.plot(fpr_lgb, tpr_lgb, label=f\"LightGBM (AUC = {lgb_metrics['auc']:.4f})\")\n",
    "plt.plot([0, 1], [0, 1], 'k--', label='Random Guess')\n",
    "\n",
    "plt.title('ROC Curves Comparison')\n",
    "plt.xlabel('False Positive Rate')\n",
    "plt.ylabel('True Positive Rate')\n",
    "plt.legend(loc='lower right')\n",
    "plt.tight_layout()\n",
    "plt.savefig(figures_dir / 'roc_curves_comparison.png')\n",
    "plt.show()"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "## 5. Persistence\n",
    "Save the trained models locally into the `models/` directory so they can be loaded by evaluating scripts or the deployment dashboard."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "with open(models_dir / 'rf_model.pkl', 'wb') as f:\n",
    "    pickle.dump(rf_model, f)\n",
    "\n",
    "with open(models_dir / 'xgb_model.pkl', 'wb') as f:\n",
    "    pickle.dump(xgb_model, f)\n",
    "\n",
    "with open(models_dir / 'lgb_model.pkl', 'wb') as f:\n",
    "    pickle.dump(lgb_model, f)\n",
    "\n",
    "print(f\"Models successfully saved to: {models_dir}\")"
   ]
  }
 ],
 "metadata": {
  "kernelspec": {
   "display_name": "python3",
   "language": "python",
   "name": "python3"
  },
  "language_info": {
   "codemirror_mode": {
    "name": "ipython",
    "version": 3
   },
   "file_extension": ".py",
   "mimetype": "text/x-python",
   "name": "python",
   "nbconvert_exporter": "python",
   "pygments_lexer": "ipython3",
   "version": "3.10.0"
  }
 },
 "nbformat": 4,
 "nbformat_minor": 5
}

with open("c:/Users/linga/Music/Chikwawa-Flood-Prediction/notebooks/07_model_training.ipynb", "w", encoding="utf-8") as f:
    json.dump(notebook, f, indent=1)
