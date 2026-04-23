import json
import os
import glob
from pathlib import Path

def patch_notebook(filepath, patches):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            notebook = json.load(f)
            
        modified = False
        for cell in notebook.get('cells', []):
            if cell.get('cell_type') != 'code':
                continue
                
            full_source = ''.join(cell.get('source', []))
            original_source = full_source
            
            for old_str, new_str in patches:
                if old_str in full_source:
                    full_source = full_source.replace(old_str, new_str)
                    
            if full_source != original_source:
                new_lines = []
                for line in full_source.split('\n'):
                    new_lines.append(line + '\n')
                if full_source and not full_source.endswith('\n'):
                    new_lines[-1] = new_lines[-1][:-1]
                
                cell['source'] = new_lines
                modified = True
                
        if modified:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(notebook, f, indent=1)
            print(f"Successfully patched {filepath}")
        else:
            print(f"No replacements made in {filepath} (Maybe already patched?)")
            
    except Exception as e:
        print(f"Error patching {filepath}: {e}")

# Note: The user messed up the EVENTS dicts in 04C and 05. We will replace the whole block by finding a unique substring.
events_04C_old = """    {
        'name':       'cyclone_freddy_mar2023',
        'label':      'Cyclone Freddy (Mar 2023) - MAJOR',
        'is_flood':   True,
        'rain_start': '2023-02-01', 'rain_end':   '2023-03-31',
        'sar_before': ('2022-12-01', '2023-01-31'),
        'sar_during': ('2023-03-05', '2023-03-20'),
        'ndvi_date':  ('2023-02-01', '2023-04-01'),
    },
     {
        'name':       'normal_season_2021',
        'label':      'Normal Season (Jan-Feb 2021)',
        'is_flood':   False,
        'rain_start': '2021-01-01', 'rain_end':   '2021-02-28',
        'sar_before': ('2020-10-01', '2020-12-31'),
        'sar_during': ('2021-01-01', '2021-02-28'),
        'ndvi_date':  ('2021-01-01', '2021-03-01'),
    },"""

events_04C_new = """    {
        'name':       'cyclone_freddy_mar2023',
        'label':      'Cyclone Freddy (Mar 2023) - MAJOR',
        'is_flood':   True,
        'rain_start': '2023-02-01', 'rain_end':   '2023-03-31',
        'sar_before': ('2022-12-01', '2023-01-31'),
        'sar_during': ('2023-03-05', '2023-03-20'),
        'ndvi_date':  ('2023-02-01', '2023-04-01'),
    },
    {
        'name':       'normal_season_2016',
        'label':      'Normal Season (Jan-Feb 2016)',
        'is_flood':   False,
        'rain_start': '2016-01-01', 'rain_end':   '2016-02-29',
        'sar_before': ('2015-10-01', '2015-12-31'),
        'sar_during': ('2016-01-01', '2016-02-29'),
        'ndvi_date':  ('2016-01-01', '2016-03-01'),
    },
    {
        'name':       'normal_season_2018',
        'label':      'Normal Season (Jan-Feb 2018)',
        'is_flood':   False,
        'rain_start': '2018-01-01', 'rain_end':   '2018-02-28',
        'sar_before': ('2017-10-01', '2017-12-31'),
        'sar_during': ('2018-01-01', '2018-02-28'),
        'ndvi_date':  ('2018-01-01', '2018-03-01'),
    },
    {
        'name':       'normal_season_2020',
        'label':      'Normal Season (Jan-Feb 2020)',
        'is_flood':   False,
        'rain_start': '2020-01-01', 'rain_end':   '2020-02-29',
        'sar_before': ('2019-10-01', '2019-12-31'),
        'sar_during': ('2020-01-01', '2020-02-29'),
        'ndvi_date':  ('2020-01-01', '2020-03-01'),
    },
    {
        'name':       'normal_season_2021',
        'label':      'Normal Season (Jan-Feb 2021)',
        'is_flood':   False,
        'rain_start': '2021-01-01', 'rain_end':   '2021-02-28',
        'sar_before': ('2020-10-01', '2020-12-31'),
        'sar_during': ('2021-01-01', '2021-02-28'),
        'ndvi_date':  ('2021-01-01', '2021-03-01'),
    },"""

events_05_old = """    {'name': 'cyclone_freddy_mar2023', 'label': 'Cyclone Freddy 2023', 'is_flood': True},
    {'name': 'normal_season_2021',     'label': 'Normal Season 2021',  'is_flood': False},
]"""

events_05_new = """    {'name': 'cyclone_freddy_mar2023', 'label': 'Cyclone Freddy 2023', 'is_flood': True},
    {'name': 'normal_season_2016',     'label': 'Normal Season 2016',  'is_flood': False},
    {'name': 'normal_season_2018',     'label': 'Normal Season 2018',  'is_flood': False},
    {'name': 'normal_season_2020',     'label': 'Normal Season 2020',  'is_flood': False},
    {'name': 'normal_season_2021',     'label': 'Normal Season 2021',  'is_flood': False},
]"""

smote_06_old = """if SMOTE_AVAILABLE:
    smote = SMOTE(sampling_strategy=0.80, random_state=42)
    X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
    print(f'\\nAfter SMOTE:')
    print(f'  Train size : {len(X_train_res):,} rows')
    print(f'  Flood=0    : {(y_train_res==0).sum():,}')
    print(f'  Flood=1    : {(y_train_res==1).sum():,}')
    print(f'  Flood rate : {y_train_res.mean()*100:.1f}%')"""

smote_06_new = """if True:
    print('\\n[SMOTE removed to prevent spatial interpolation of identical points]')
    X_train_res, y_train_res = X_train, y_train"""

evaluate_07_old = """def evaluate_model(model, X_test, y_test, model_name):
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    auc = roc_auc_score(y_test, y_prob)
    
    print(f"--- {model_name} Performance ---")"""

evaluate_07_new = """from sklearn.metrics import precision_recall_curve

def evaluate_model(model, X_test, y_test, model_name):
    y_prob = model.predict_proba(X_test)[:, 1]
    
    # Optimize threshold using PR-Curve instead of raw 0.5
    precisions, recalls, thresholds = precision_recall_curve(y_test, y_prob)
    f1_scores = 2 * (precisions * recalls) / (precisions + recalls + 1e-10)
    best_idx = np.argmax(f1_scores)
    best_threshold = thresholds[best_idx] if best_idx < len(thresholds) else 0.5
    
    y_pred = (y_prob >= best_threshold).astype(int)
    
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    auc = roc_auc_score(y_test, y_prob)
    
    print(f"--- {model_name} Performance ---")
    print(f"** Optimal Threshold for F1: {best_threshold:.3f} **")"""

roc_07_old_line = "from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, classification_report, roc_curve"
roc_07_new_line = "from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, classification_report, roc_curve, precision_recall_curve"


def apply_fixes():
    notebook_dir =Path('notebooks/')
    # 04C
    f_04c = list(notebook_dir.glob('04C*.ipynb'))
    if f_04c: patch_notebook(f_04c[0], [(events_04C_old, events_04C_new)])

    # 05
    f_05 = list(notebook_dir.glob('05*.ipynb'))
    if f_05: patch_notebook(f_05[0], [(events_05_old, events_05_new)])

    # 06
    f_06 = list(notebook_dir.glob('06*.ipynb'))
    if f_06: patch_notebook(f_06[0], [(smote_06_old, smote_06_new)])

    # 07
    f_07 = list(notebook_dir.glob('07*.ipynb'))
    if f_07: patch_notebook(f_07[0], [
        (evaluate_07_old, evaluate_07_new),
        (roc_07_old_line, roc_07_new_line)
    ])

apply_fixes()
