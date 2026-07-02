#!/bin/bash

echo "Starting Celery worker and beat scheduler..."
# Start the Celery worker and beat (scheduler) in the background
celery -A scheduler.celery_app worker --beat --loglevel=info &


echo "Starting FastAPI server..."
# Start Uvicorn in the foreground to keep the container running
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
