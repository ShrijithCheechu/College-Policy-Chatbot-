@echo off
echo ===================================================
echo Starting Northbridge College Policy Assistant
echo Django Backend + React Single Page App
echo ===================================================

echo Starting Django Server on http://127.0.0.1:8000 ...
cd backend
python manage.py runserver 0.0.0.0:8000
