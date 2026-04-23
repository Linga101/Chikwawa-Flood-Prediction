import json
import os

filepath = 'notebooks/06_combined_eda_and_preprocessing.ipynb'
with open(filepath, 'r', encoding='utf-8') as f:
    notebook = json.load(f)

old_str = "if True:\n    print('\\n[SMOTE removed to prevent spatial interpolation of identical points]')\n    X_train_res, y_train_res = X_train, y_train"
new_str = "if SMOTE_AVAILABLE:\n    smote = SMOTE(sampling_strategy=0.80, random_state=42)\n    X_train_res, y_train_res = smote.fit_resample(X_train, y_train)\n    print(f'\\nAfter SMOTE:')\n    print(f'  Train size : {len(X_train_res):,} rows')\n    print(f'  Flood=0    : {(y_train_res==0).sum():,}')\n    print(f'  Flood=1    : {(y_train_res==1).sum():,}')\n    print(f'  Flood rate : {y_train_res.mean()*100:.1f}%')"

modified = False
for cell in notebook.get('cells', []):
    if cell.get('cell_type') != 'code':
        continue
    
    full_source = ''.join(cell.get('source', []))
    if old_str in full_source:
        full_source = full_source.replace(old_str, new_str)
        
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
    print("SMOTE successfully re-applied in Notebook 06.")
else:
    print("Could not find the target block. Maybe it was already changed?")
