import sqlite3
conn = sqlite3.connect('chikwawa_flood_db.sqlite')
cur = conn.cursor()
cur.execute("SELECT source, timestamp, value FROM sensor_readings ORDER BY timestamp DESC LIMIT 5")
print("Sensor Readings:", cur.fetchall())

cur.execute("SELECT grid_id, probability, risk_level, run_timestamp FROM prediction_logs ORDER BY run_timestamp DESC LIMIT 5")
print("Prediction Logs:", cur.fetchall())
