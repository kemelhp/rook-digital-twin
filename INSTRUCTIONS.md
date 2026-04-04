# Инструкции для команды — Цифровой двойник локомотива

> Дата: 2026-04-04 | Статус: актуально

---

## 1. Где мы сейчас — аудит бэкенда

### Что уже сделано и работает

| Компонент | Файл | Статус |
|---|---|---|
| Pydantic-модели KZ8A / ТЭ33А | `app/models/telemetry.py` | ГОТОВО |
| Модель индекса здоровья (A–E) | `app/models/health_index.py` | ГОТОВО |
| Модели алертов | `app/models/alerts.py` | ГОТОВО (баг с импортом Optional исправлен) |
| Симулятор с 8 сценариями | `app/services/simulator.py` | ГОТОВО |
| Движок индекса здоровья | `app/services/health_engine.py` | ГОТОВО |
| Движок алертов | `app/services/alert_engine.py` | ГОТОВО |
| Кольцевой буфер + EMA | `app/services/buffer.py` | ГОТОВО |
| WebSocket `/ws/telemetry` | `app/routers/websocket.py` | ГОТОВО |
| REST история / replay | `app/routers/history.py` | ГОТОВО |
| REST индекс здоровья | `app/routers/health.py` | ГОТОВО |
| REST алерты | `app/routers/alerts_router.py` | ГОТОВО |
| REST конфиг + auth | `app/routers/config_api.py` | ГОТОВО |
| Экспорт CSV / JSON | `app/routers/export.py` | ГОТОВО |
| In-memory хранилище (72ч) | `app/storage/time_series.py` | ГОТОВО |
| PostgreSQL (async SQLAlchemy) | `app/db/` | ГОТОВО |
| HTTP Basic Auth | `app/auth/basic_auth.py` | ГОТОВО |
| Пороги в YAML (горячая замена) | `config/thresholds.yaml` | ГОТОВО |
| Docker + docker-compose | `Dockerfile`, `docker-compose.yml` | ГОТОВО |
| Тесты (12 шт.) | `tests/` | ГОТОВО |

### Что ещё НУЖНО добавить до демо

| Приоритет | Задача | Почему важно |
|---|---|---|
| ВЫСОКИЙ | PDF-экспорт отчёта | В документе явно написано "PDF/CSV" для replay |
| ВЫСОКИЙ | WebSocket reconnect + backoff на фронтенде | Оценивается в критерии "Real-time 35%" |
| СРЕДНИЙ | `.gitignore` | Инженерная культура (10%) |
| СРЕДНИЙ | Архитектурная диаграмма | Нужна для презентации 10-12 слайдов |
| СРЕДНИЙ | Карта маршрута на фронте (Leaflet/MapLibre) | Требование из PDF: карта с положением поезда |
| НИЗКИЙ | Метрики сервиса (счётчики WS-соединений, рpс) | Улучшает оценку Engineering Culture |

---

## 2. Мы на правильном пути? ДА. Вот соответствие требованиям

### Real-time (35%) — наш главный приоритет

| Требование из кейса | Наша реализация |
|---|---|
| WebSocket / SSE, частота от 1 Гц | `GET /ws/telemetry?frequency=1.0` — любая частота |
| Буферизация и EMA-сглаживание | `app/services/buffer.py` + `_smooth()` в симуляторе |
| Дедубликация и валидация | Pydantic v2 валидирует каждый фрейм |
| Reconnect и индикация "нет связи" | Heartbeat ping каждые 15 сек — **на фронте нужен reconnect** |
| Highload x10 | Сценарий `highload` уменьшает интервал в 10 раз |

### Frontend (30%) — задача для React-команды

| Требование | Что нужно от API |
|---|---|
| Индекс здоровья крупный виджет | `health.index` (0–100) + `health.grade` (A–E) из WS |
| Панели: скорость, топливо, давления | Все поля в `telemetry.traction` и `telemetry.resources` |
| Интерактивные графики n-минут | `GET /api/telemetry/history?loco_id=X&from_ts=Y` |
| Карта маршрута | `telemetry.navigation.latitude/longitude` — обновляется каждый тик |
| Алерты и рекомендации | `alerts.alerts[]` в WS-сообщении |
| Темная/светлая тема | Чисто frontend |
| Top-5 факторов индекса | `health.top_factors[]` в WS-сообщении |

### Backend (25%) — почти всё закрыто

| Требование | Статус |
|---|---|
| Модульная архитектура | Да — models / services / routers / storage / db |
| Хранение истории 24–72ч | In-memory (72ч) + PostgreSQL |
| Конфигурация без перекомпиляции | `config/thresholds.yaml` + `GET/PUT /api/config/thresholds` |
| OpenAPI/Swagger | Автоматически на `/docs` |
| Health-check | `GET /api/healthcheck` |
| Логи | `logging` во всех модулях |

---

## 3. Как работает симулятор — объяснение для команды

### Что происходит внутри

Симулятор — это **программа, которая притворяется настоящим локомотивом**.
Вместо реальных датчиков она генерирует числа, которые меняются по физически
правдоподобным формулам: скорость разгоняется плавно, температуры растут
под нагрузкой, топливо убывает.

```
Симулятор → генерирует фрейм каждую секунду
         → Health Engine считает индекс
         → Alert Engine ищет нарушения порогов
         → WS отправляет клиенту JSON с тремя объектами
```

### 8 сценариев и что они делают

| Сценарий | Что меняется | Когда показывать |
|---|---|---|
| `normal` | Скорость ~70 км/ч, синусоидальные колебания. Всё в норме. | Старт демо |
| `acceleration` | Скорость растёт до 110 км/ч. Ток ТЭД и мощность растут. | Разгон на прямом участке |
| `braking` | Скорость падает до 20 км/ч. Давление тормозных цилиндров растёт. Светофор жёлтый. | Подъезд к станции |
| `overheat` | Температура ТЭД растёт до ~170°C (норма 40–160). Появляется E001_OVERTEMP. | Демонстрация алертов |
| `fuel_low` | Уровень топлива быстро падает до 8% (только ТЭ33А). Алерт LOW_FUEL. | Демонстрация критической ситуации |
| `voltage_drop` | Напряжение КС падает до ~20.5 кВ (норма 24–26 кВ). Только KZ8A. | Демонстрация электрических проблем |
| `emergency` | Множественные алерты, DTC-коды, вентиляторы ломаются, вода в топливе. Индекс падает ниже 40. | Финальная демонстрация crisis mode |
| `highload` | x10 событий в секунду (10 Гц). Нагрузочный тест. | Демонстрация устойчивости |

### Как переключить сценарий в реальном времени

**Вариант 1 — через WebSocket (рекомендуется для демо):**

Фронтенд отправляет в открытый WS-канал JSON:
```json
{"scenario": "overheat"}
```
Сервер мгновенно переключает симулятор. Данные начинают меняться на следующем тике.

**Вариант 2 — через URL при подключении:**
```
ws://localhost:8000/ws/telemetry?loco_type=TE33A&scenario=emergency&frequency=1.0
```

**Вариант 3 — для теста из браузерной консоли:**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/telemetry?loco_type=TE33A&scenario=normal');
ws.onmessage = (e) => console.log(JSON.parse(e.data).health.index);

// Переключить сценарий через 10 секунд:
setTimeout(() => ws.send(JSON.stringify({scenario: "overheat"})), 10000);
```

### Как выглядит одно WS-сообщение (структура)

```json
{
  "telemetry": {
    "loco_type": "TE33A",
    "loco_id": "TE33A-A1B2C3",
    "timestamp": 1712345678.123,
    "scenario": "normal",
    "traction": {
      "speed": 68.4,
      "tractive_effort": 312.5,
      "traction_motor_current": [420, 415, 418, 422, 410, 425],
      "controller_position": 4,
      "brake_pipe_pressure": 506.2,
      "brake_cylinder_pressure": 10.1,
      "brake_force": 5.2
    },
    "resources": {
      "fuel_level": 84.3,
      "fuel_consumption": 285.6,
      "coolant_temperature": 82.1,
      "oil_pressure": 410.0,
      "engine_rpm": 720.0,
      ...
    },
    "nodes": {
      "motor_temperatures": [82, 79, 84, 81, 83, 80],
      "axle_bearing_temps": [46, 44, 47, 45, 46, 44],
      "cooling_fan_statuses": ["running","running","running","running","running","running"],
      "error_codes": [],
      "active_alerts": []
    },
    "navigation": {
      "latitude": 51.1523,
      "longitude": 71.6204,
      "odometer": 12.4,
      "route_section": "P-01",
      "speed_limit": 120.0,
      "signal_status": "green",
      "connection_status": "connected"
    }
  },
  "health": {
    "loco_id": "TE33A-A1B2C3",
    "index": 87.3,
    "grade": "A",
    "group_scores": [
      {"group": "traction", "score": 95.0, "weight": 0.30},
      {"group": "resources", "score": 91.2, "weight": 0.25},
      {"group": "nodes", "score": 88.5, "weight": 0.25},
      {"group": "brakes", "score": 97.1, "weight": 0.15}
    ],
    "top_factors": [
      {
        "param_id": "fuel_level",
        "label": "Уровень топлива",
        "value": 84.3,
        "unit": "%",
        "normalized": 1.0,
        "contribution": -0.0,
        "group": "resources",
        "status": "ok"
      }
    ],
    "alert_penalty": 0.0
  },
  "alerts": {
    "loco_id": "TE33A-A1B2C3",
    "total": 0,
    "critical": 0,
    "warning": 0,
    "info": 0,
    "alerts": []
  }
}
```

---

## 4. Инструкция по запуску (шаг за шагом)

### Вариант A — Docker (для демо, рекомендуется)

```bash
# Клонировать репозиторий
git clone <repo-url>
cd rook-digital-twin

# Запустить PostgreSQL + API
docker-compose up --build

# API доступен на: http://localhost:8000
# Swagger UI:       http://localhost:8000/docs
# WebSocket тест:   ws://localhost:8000/ws/telemetry
```

### Вариант B — Локально (для разработки)

```bash
# 1. Создать виртуальное окружение
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 2. Установить зависимости
pip install -r requirements.txt

# 3. Скопировать конфиг
cp .env.example .env

# 4. Запустить PostgreSQL (через Docker отдельно)
docker run -d \
  --name loco-db \
  -e POSTGRES_USER=loco \
  -e POSTGRES_PASSWORD=loco \
  -e POSTGRES_DB=digital_twin \
  -p 5432:5432 \
  postgres:16-alpine

# 5. Запустить API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Переменные окружения (.env)

```env
DATABASE_URL=postgresql+asyncpg://loco:loco@localhost:5432/digital_twin
AUTH_USERNAME=admin
AUTH_PASSWORD=changeme
SIMULATOR_FREQUENCY_HZ=1
```

---

## 5. Все API эндпоинты — шпаргалка для фронтенда

### WebSocket (главное соединение)

```
ws://localhost:8000/ws/telemetry
  ?loco_type=TE33A          # или KZ8A
  &scenario=normal          # сценарий при старте
  &frequency=1.0            # Гц (1 = 1 раз/сек)
  &loco_id=MY-LOCO-01       # опционально, иначе генерируется
```

**Отправить команду смены сценария (от клиента к серверу):**
```json
{"scenario": "emergency"}
```

### REST эндпоинты

```
GET  /api/healthcheck                          — статус сервиса
GET  /api/locomotive/profiles                  — список профилей KZ8A / TE33A
GET  /api/health?loco_id=X                     — текущий индекс (из памяти)
GET  /api/health/history?loco_id=X&from_ts=Y   — история из PostgreSQL
GET  /api/telemetry/history?loco_id=X          — история телеметрии
GET  /api/telemetry/replay?loco_id=X&minutes=5 — последние N минут
GET  /api/alerts?loco_id=X                     — активные алерты (из памяти)
GET  /api/alerts/history?loco_id=X             — история алертов из БД
GET  /api/export?loco_id=X&format=csv&minutes=15  — скачать CSV
GET  /api/export?loco_id=X&format=json&minutes=15 — скачать JSON
GET  /api/config/thresholds                    — посмотреть пороги (auth!)
PUT  /api/config/thresholds                    — обновить пороги (auth!)
GET  /docs                                     — Swagger UI
```

**Auth для config-эндпоинтов:** HTTP Basic Auth
- логин: `admin`, пароль: `changeme` (меняется через ENV)

---

## 6. Сценарий демо на защите (рекомендуемый порядок)

```
1. [0:00] Запустить docker-compose up, открыть дашборд
2. [0:30] Подключить WS: loco_type=TE33A, scenario=normal
          → Показать живые графики скорости, топлива, температур
          → Индекс здоровья ~85-95 (A/B)

3. [1:30] Переключить сценарий → acceleration
          → Показать как растёт ток ТЭД и тяговое усилие на графике
          → Скорость плавно растёт до 110 км/ч

4. [2:30] Переключить → braking
          → Показать рост давления тормозных цилиндров
          → Скорость падает, светофор меняется на жёлтый на карте

5. [3:30] Переключить → overheat
          → Показать как температура ТЭД пересекает WARNING-порог (красная подсветка)
          → Появляется алерт E001_OVERTEMP
          → Индекс падает до ~60-70 (B/C)

6. [4:30] Переключить → emergency
          → Множественные алерты, индекс падает ниже 40 (D/E)
          → Показать top-5 факторов которые тянут индекс вниз
          → Показать рекомендации машинисту

7. [5:30] Replay: GET /api/telemetry/replay?minutes=5
          → Показать "перемотку" как прошли через все сценарии

8. [6:00] Переключить → highload (frequency=10)
          → Показать что UI не зависает при x10 нагрузке

9. [6:30] Скачать отчёт: GET /api/export?format=csv&minutes=15
          → Показать CSV с историей

10. [7:00] Открыть /docs → Swagger UI → показать документацию API
```

---

## 7. Что нужно сделать фронтенду

### Подключение к WebSocket (JavaScript)

```javascript
class LocoWebSocket {
  constructor(locoType = 'TE33A', scenario = 'normal') {
    this.url = `ws://localhost:8000/ws/telemetry?loco_type=${locoType}&scenario=${scenario}&frequency=1`;
    this.reconnectDelay = 1000;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('Connected');
      this.reconnectDelay = 1000; // сброс backoff
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'ping') return; // heartbeat, игнорировать

      // data.telemetry — все параметры
      // data.health    — индекс здоровья
      // data.alerts    — активные алерты
      this.onData(data);
    };

    this.ws.onclose = () => {
      console.warn('Disconnected, reconnecting in', this.reconnectDelay, 'ms');
      // показать индикатор "нет связи"
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // exponential backoff
    };
  }

  setScenario(scenario) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ scenario }));
    }
  }
}

// Использование:
const loco = new LocoWebSocket('TE33A', 'normal');
loco.onData = ({ telemetry, health, alerts }) => {
  updateHealthGauge(health.index, health.grade);
  updateSpeedChart(telemetry.traction.speed);
  updateMap(telemetry.navigation.latitude, telemetry.navigation.longitude);
  showAlerts(alerts.alerts);
};

// Переключить сценарий:
loco.setScenario('emergency');
```

### Цветовая схема для индекса здоровья

```
A (80-100) → зелёный    #22C55E
B (60-79)  → синий      #3B82F6
C (40-59)  → жёлтый     #EAB308
D (20-39)  → оранжевый  #F97316
E (0-19)   → красный    #EF4444
```

### Какие поля отображать на каком виджете

```
ИНДЕКС ЗДОРОВЬЯ (главный виджет):
  health.index         — большое число 0-100
  health.grade         — буква A/B/C/D/E
  health.top_factors   — список причин снижения

ТЯГА И ДВИЖЕНИЕ:
  telemetry.traction.speed                    — спидометр
  telemetry.traction.tractive_effort          — тяговое усилие
  telemetry.traction.controller_position      — позиция контроллера (0-8)

ТОРМОЗА:
  telemetry.traction.brake_pipe_pressure      — давление маг. (норма 490-520)
  telemetry.traction.brake_cylinder_pressure  — давление цил.

ТЕМПЕРАТУРЫ (только ТЭ33А):
  telemetry.resources.coolant_temperature     — ОЖ (норма 70-95°C)
  telemetry.resources.oil_temperature         — масло (норма 60-110°C)
  telemetry.resources.exhaust_temperature     — выхлоп (норма 200-550°C)
  telemetry.nodes.motor_temperatures          — массив по осям

ТОПЛИВО (только ТЭ33А):
  telemetry.resources.fuel_level              — уровень % (бар/дуга)
  telemetry.resources.fuel_consumption        — расход л/ч

ЭЛЕКТРИКА (только KZ8A):
  telemetry.resources.catenary_voltage        — напряжение КС (норма 24-26 кВ)
  telemetry.resources.dc_bus_voltage          — шина DC (норма 1750-1850 В)
  telemetry.resources.traction_power          — тяговая мощность кВт

КАРТА:
  telemetry.navigation.latitude               — широта
  telemetry.navigation.longitude              — долгота
  telemetry.navigation.speed_limit            — ограничение скорости
  telemetry.navigation.signal_status          — green/yellow/red
  telemetry.navigation.route_section          — название перегона

АЛЕРТЫ (список):
  alerts.critical      — количество критических
  alerts.alerts[].severity    — critical/warning/info
  alerts.alerts[].label       — название параметра
  alerts.alerts[].message     — описание проблемы
  alerts.alerts[].recommendation — что делать
```

---

## 8. Критические вещи которые нельзя забыть до сдачи

### Обязательно для репозитория

- [ ] `.gitignore` — не коммитить `venv/`, `.env`, `__pycache__/`
- [ ] `README.md` — инструкция запуска (docker-compose up)
- [ ] `.env.example` — уже есть, убедиться что `.env` в gitignore

### Обязательно для презентации (10-12 слайдов)

1. Проблема — шум vs сигнал (из PDF кейса)
2. Решение — цифровой двойник
3. Архитектурная диаграмма (FastAPI → WS → React, PostgreSQL)
4. Формула индекса здоровья с весами
5. Скриншот дашборда
6. Демонстрация сценариев
7. Нагрузочный тест (highload)
8. Стек технологий

### Формула индекса здоровья (для слайда)

```
index = Σ(weight_g × score_g) − alert_penalty

Группы и веса:
  Тяга и движение:    30%
  Ресурсы / энергия:  25%
  Мониторинг узлов:   25%
  Тормозная система:  15%

Штрафы за алерты:
  INFO:     −2 балла
  WARNING:  −5 баллов
  CRITICAL: −15 баллов

Категории:
  A (80-100) — Норма
  B (60-79)  — Хорошо
  C (40-59)  — Внимание
  D (20-39)  — Плохо
  E (0-19)   — Критично
```

---

## 9. Быстрая проверка что всё работает

```bash
# 1. Тесты
source venv/bin/activate
python -m pytest tests/ -v
# Ожидается: 12 passed

# 2. Импорты
python -c "from app.main import app; print('OK')"

# 3. Запуск (без БД — только in-memory)
uvicorn app.main:app --reload --port 8000
# Открыть: http://localhost:8000/docs

# 4. Тест WebSocket (в браузере F12 → Console)
const ws = new WebSocket('ws://localhost:8000/ws/telemetry?loco_type=TE33A');
ws.onmessage = e => console.log(JSON.parse(e.data).health.grade);
```
