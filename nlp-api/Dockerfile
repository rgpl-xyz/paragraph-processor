FROM python:3.13-slim

WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Settings are read by app/settings.py; WEB_CONCURRENCY workers each load their own copy of the model
ENV PORT=8080 WEB_CONCURRENCY=2
EXPOSE 8080
CMD ["sh", "-c", "exec uvicorn app.api:app --host 0.0.0.0 --port \"$PORT\" --workers \"$WEB_CONCURRENCY\""]
