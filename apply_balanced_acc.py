import json
import os

filepath = 'notebooks/07_model_training.ipynb'
try:
    with open(filepath, 'r', encoding='utf-8') as f:
        notebook = json.load(f)
        
    modified = False
    for cell in notebook.get('cells', []):
        if cell.get('cell_type') != 'code':
            continue
            
        full_source = ''.join(cell.get('source', []))
        original_source = full_source
        
        # Patch the import
        if "from sklearn.metrics import accuracy_score" in full_source and "balanced_accuracy_score" not in full_source:
            # We know it looks something like: ... roc_curve, precision_recall_curve
            # Let's just do a string replace on the import line
            full_source = full_source.replace(
                "precision_recall_curve", 
                "precision_recall_curve, balanced_accuracy_score"
            )
        
        # Patch the metric calculation
        if "accuracy = accuracy_score(y_test, y_pred)" in full_source:
            full_source = full_source.replace(
                "accuracy = accuracy_score(y_test, y_pred)",
                "balanced_acc = balanced_accuracy_score(y_test, y_pred)"
            )
            
        # Patch the print statement
        if "print(f\"Accuracy : {accuracy:.4f}\")" in full_source:
            full_source = full_source.replace(
                "print(f\"Accuracy : {accuracy:.4f}\")",
                "print(f\"Balanced Accuracy: {balanced_acc:.4f}\")"
            )
            
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
        print(f"Successfully patched {filepath} to use Balanced Accuracy!")
    else:
        print(f"No replacements made in {filepath}.")

except Exception as e:
    print(f"Error patching {filepath}: {e}")
