import json
import os

filepath = 'notebooks/07_model_training.ipynb'
with open(filepath, 'r', encoding='utf-8') as f:
    notebook = json.load(f)

modified = False
for cell in notebook.get('cells', []):
    if cell.get('cell_type') != 'code':
        continue
    
    full_source = ''.join(cell.get('source', []))
    if "return {'accuracy': accuracy," in full_source:
        full_source = full_source.replace(
            "return {'accuracy': accuracy,",
            "return {'accuracy': balanced_acc,"
        )
        
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
    print("Fixed the return statement in Notebook 07!")
