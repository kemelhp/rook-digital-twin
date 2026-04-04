# rook-digital-twin
Real-time digital twin dashboard for locomotive health monitoring (HackNU, Team The Rook)

docker-compose up --build

source venv/bin/activate
uvicorn app.main:app --reload --port 8000