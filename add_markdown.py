import json

file_path = "c:/Users/linga/Music/Chikwawa-Flood-Prediction/notebooks/06_combined_eda_and_preprocessing.ipynb"

with open(file_path, "r", encoding="utf-8") as f:
    notebook = json.load(f)

new_cells = []

# Map of code cell substrings to their descriptions
explanations = {
    "import pandas as pd": "### Data Loading and Setup\nImports required libraries, sets up plotting styles, defines file paths, loads the Chikwawa flood dataset, and prints dataset dimensions and flood rate.",
    "df.isnull().sum()": "### Missing Value Check\nChecking the dataset for any missing values across all columns.",
    "df.info()": "### Data Types Info\nDisplaying the structure and data types of the DataFrame.",
    "df.describe()": "### Statistical Summary\nGenerating descriptive statistics of the dataset's numerical columns.",
    "sns.heatmap": "### Correlation Heatmap\nVisualizing the correlation between different features to identify strong relationships or multicollinearity.",
    "sns.boxplot": "### Outlier Detection\nPlotting boxplots for environmental features (Rainfall, Distance to River, Elevation, Slope) to detect outliers. We keep all data as they are real-world measurements.",
    "eda_01_class_distribution": "### Distribution Analysis\nVisualizing overall class distribution (Flood vs No Flood) and flood rate across different seasonal events.",
    "eda_02_feature_distributions": "### Feature Distribution (Flood vs No Flood)\nComparing the density distribution of numerical features for flooded versus non-flooded points.",
    "LANDCOVER_LABELS = {": "### Land Cover Mapping\nMapping numeric land cover codes to their respective descriptive category names.",
    "eda_03_landcover_analysis": "### Land Cover Analysis\nAnalyzing the frequency of different land cover classes and measuring their respective flood rates.",
    "eda_05_geographic_flood_map": "### Geospatial Visualization\nPlotting points geographically (Latitude/Longitude) to visualize the spatial distribution of flood occurrences.",
    "df['Slope_deg'].replace(0.0, 1.0)": "### Topographic Index Calculations\nReplacing 0 slope values with 1 to avoid division by zero errors, then calculating Topographic Wetness Index (TWI) and Elevation to River ratio.",
    "df['LC_codes'] = df['LandCover_Name'].cat.codes": "### Categorical Encoding (Land Cover)\nConverting land cover names into categorical numerical codes.",
    "print(flood.to_string())": "### Isolating Flooded Points\nCreating a subset dataframe containing only the flooded data points for threshold analysis.",
    "permeab = {": "### Permeability Scoring\nAssigning a permeability score based on the land cover type (high, moderate, or low permeability).",
    "df['PS_codes'] = df['permeability_score'].cat.codes": "### Categorical Encoding (Permeability)\nConverting permeability qualitative scores into numerical categories.",
    "col = flood[[\"Dist_River_m\",\"Flood\"]]": "### Threshold Analysis: Distance to River\nAnalyzing flooded points to establish danger, middle, and safe zone thresholds based on distance to the nearest river.",
    "col = flood[[\"Rainfall_mm\", \"Flood\"]]": "### Threshold Analysis: Rainfall\nDetermining lower and upper threshold values for rainfall based on the 25th and 75th percentiles of flooded points.",
    "col = flood[[\"Elevation_m\",\"Flood\"]]": "### Threshold Analysis: Elevation\nIdentifying elevation thresholds representing high (danger) and medium risk zones for flooding.",
    "col = flood[[\"Slope_deg\", \"Flood\"]]": "### Threshold Analysis: Slope\nEstablishing critical slope degree boundaries associated with flood events.",
    "col = flood[[\"elevation_to_river\",\"Flood\"]]": "### Threshold Analysis: Elevation to River Ratio\nCalculating and visualizing thresholds for the engineered Elevation-to-River ratio feature.",
    "col = flood[[\"topographic_wet_index\", \"Flood\"]]": "### Threshold Analysis: Topographic Wetness Index (TWI)\nEvaluating the TWI thresholds directly correlated with historical flooding.",
    "from sklearn.model_selection import train_test_split": "### Data Splitting Setup\nChecking for SMOTE availability, defining features and target variables, and analyzing current class imbalance.",
    "X_train, X_test, y_train, y_test = train_test_split": "### Handling Class Imbalance with SMOTE\nSplitting data into train/test sets, then applying SMOTE to the training set to synthetically upsample the minority flood class.",
    "scaler = StandardScaler()": "### Feature Scaling\nApplying StandardScaler to normalize feature variables, ensuring mean=0 and standard deviation=1, and applying the fitted scaler to the test set.",
    "import pickle": "### Saving Processed Artifacts\nExporting the final scaled and balanced training/testing datasets to CSVs, and pickling the StandardScaler for future model inference."
}

def get_markdown_cell(source):
    return {
        "cell_type": "markdown",
        "metadata": {},
        "source": [source]
    }

matched_cells = 0
for cell in notebook["cells"]:
    if cell["cell_type"] == "code":
        cell_text = "".join(cell.get("source", []))
        
        # Determine the matched explanation
        inserted = False
        for key, text in explanations.items():
            if key in cell_text:
                new_cells.append(get_markdown_cell(text))
                inserted = True
                matched_cells += 1
                break
        
        if not inserted:
            print("No match for cell starting with:", cell_text[:50])
            
    new_cells.append(cell)

notebook["cells"] = new_cells

with open(file_path, "w", encoding="utf-8") as f:
    json.dump(notebook, f, indent=1)

print(f"Markdown cells added successfully. Matched {matched_cells} code cells.")
