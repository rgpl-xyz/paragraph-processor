import uvicorn

from app.settings import load_settings


if __name__ == '__main__':
    uvicorn.run("app.api:app", host='0.0.0.0', port=load_settings().port, log_level='info')
