# rook-digital-twin
Real-time digital twin dashboard for locomotive health monitoring (HackNU, Team The Rook)

docker-compose up --build

docker compose -f docker-compose.yml -f docker-compose.dev.yml up

source venv/bin/activate
uvicorn app.main:app --reload --port 8000

Auth defaults after startup:
- Admin: `admin@rook.local` / `ChangeMe123!`
- Staff: `staff@rook.local` / `ChangeMe123!`

Frontend routes:
- Login: `http://localhost:3000/login`
- Profile: `http://localhost:3000/profile`
