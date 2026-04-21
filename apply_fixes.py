import json
import os
import glob
from pathlib import Path

def patch_notebook(filepath, replacements):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            notebook = json.load(f)
            
        modified = False
        for cell in notebook.get('cells', []):
            if cell.get('cell_type') != 'code':
                continue
                
            source_lines = cell.get('source', [])
            if not source_lines:
                continue
                
            full_source = ''.join(source_lines)
            original_source = full_source
            
            for old_str, new_str in replacements:
                if old_str in full_source:
                    full_source = full_source.replace(old_str, new_str)
                    
            if full_source != original_source:
                # Basic chunking back into lines, keeping \n
                new_lines = []
                for line in full_source.split('\n'):
                    new_lines.append(line + '\n')
                # remove the trailing newline from the very last line if it didn't have one
                if full_source and not full_source.endswith('\n'):
                    new_lines[-1] = new_lines[-1][:-1]
                
                cell['source'] = new_lines
                modified = True
                
        if modified:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(notebook, f, indent=1)
            print(f"Successfully patched {filepath}")
        else:
            print(f"No replacements made in {filepath} (maybe already patched?)")
            
    except Exception as e:
        print(f"Error patching {filepath}: {e}")

# Define all patches
patches_04C = [
    (
        "before    = col.filterDate(event['sar_before'][0], event['sar_before'][1]).min().clip(aoi)\n            during    = col.filterDate(event['sar_during'][0], event['sar_during'][1]).min().clip(aoi)",
        "before    = col.filterDate(event['sar_before'][0], event['sar_before'][1]).median().focal_median(50, 'circle', 'meters').clip(aoi)\n            during    = col.filterDate(event['sar_during'][0], event['sar_during'][1]).median().focal_median(50, 'circle', 'meters').clip(aoi)"
    )
]

patches_05 = [
    (
        "event_df['Flood'] = int(event['is_flood'])  # fallback: whole district",
        "event_df['Flood'] = np.nan  # Drop missing masks instead of contaminating"
    )
]

patches_06 = [
    (
        "df['elevation_to_river']=df['Elevation_m']/df['Dist_River_m']",
        "df['elevation_to_river'] = df['Elevation_m'] / (df['Dist_River_m'] + 1.0)  # +1 to prevent div by 0\ndf.dropna(subset=['Flood'], inplace=True)  # Clean missing masks"
    ),
    (
        "X_train, X_test, y_train, y_test = train_test_split(\n    X, y, test_size=0.2, random_state=42, stratify=y\n)",
        "from sklearn.model_selection import GroupShuffleSplit\n\ngss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)\ntrain_idx, test_idx = next(gss.split(X, y, groups=df['Point_ID']))\n\nX_train = X.iloc[train_idx]\nX_test = X.iloc[test_idx]\ny_train = y.iloc[train_idx]\ny_test = y.iloc[test_idx]"
    ),
    (
        "if SMOTE_AVAILABLE:\n    smote = SMOTE(sampling_strategy=0.80, random_state=42)  # 20% minority ratio\n    X_train_res, y_train_res = smote.fit_resample(X_train, y_train)\n    print(f'\\nAfter SMOTE:')\n    print(f'  Train size : {len(X_train_res):,} rows')\n    print(f'  Flood=0    : {(y_train_res==0).sum():,}')\n    print(f'  Flood=1    : {(y_train_res==1).sum():,}')\n    print(f'  Flood rate : {y_train_res.mean()*100:.1f}%')",
        "if True:\n    print('\\n[SMOTE removed to prevent spatial interpolation of identical points]')\n    X_train_res, y_train_res = X_train, y_train"
    )
]

patches_07 = [
    (
        "rf_model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)",
        "scale_pos_weight = (y_train == 0).sum() / max(1, (y_train == 1).sum())\nrf_model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1, class_weight='balanced')"
    ),
    (
        "xgb_model = XGBClassifier(n_estimators=100, learning_rate=0.1, random_state=42, eval_metric='logloss')",
        "xgb_model = XGBClassifier(n_estimators=100, learning_rate=0.1, random_state=42, eval_metric='logloss', scale_pos_weight=scale_pos_weight)"
    ),
    (
        "lgb_model = LGBMClassifier(n_estimators=100, learning_rate=0.1, random_state=42)",
        "lgb_model = LGBMClassifier(n_estimators=100, learning_rate=0.1, random_state=42, class_weight='balanced')"
    )
]

notebook_dir =Path('notebooks/')
# Notebook 04C
f_04c = list(notebook_dir.glob('04C*.ipynb'))
if f_04c: patch_notebook(f_04c[0], patches_04C)

# Notebook 05
f_05 = list(notebook_dir.glob('05*.ipynb'))
if f_05: patch_notebook(f_05[0], patches_05)

# Notebook 06
f_06 = list(notebook_dir.glob('06*.ipynb'))
if f_06: patch_notebook(f_06[0], patches_06)

# Notebook 07
f_07 = list(notebook_dir.glob('07*.ipynb'))
if f_07: patch_notebook(f_07[0], patches_07)

print("Patching complete!")
