# Bartending V2 - Backend API

## Project Overview

Express.js REST API for the Bartending V2 application. Connects to a PostgreSQL database and serves the React frontend.

## Architecture

Bartending V2 is split into 3 separate repositories:
- **Bartending_DB**: PostgreSQL database with Docker configuration
- **Bartending_Back** (this repo): Express.js REST API
- **Bartending_Front**: React frontend application

## Tech Stack

- **Runtime**: Node.js 20 (Alpine for Docker)
- **Framework**: Express.js
- **Database**: PostgreSQL (via `pg` driver)
- **Validation**: Express middleware

## File Structure

```
Bartending_Back/
├── CLAUDE.md              # This file
├── package.json           # Dependencies and scripts
├── Dockerfile             # Container configuration
├── docker-compose.yml     # Development with DB
├── .env.example           # Environment template
├── src/
│   ├── index.js           # Entry point, Express app
│   ├── db/
│   │   └── pool.js        # PostgreSQL connection pool
│   └── routes/
│       ├── cocktails.js   # /cocktails endpoints
│       ├── customers.js   # /customers endpoints
│       ├── orders.js      # /orders endpoints
│       └── admin.js       # /admin endpoints
└── .gitignore
```

## API Endpoints

### Cocktails
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cocktails` | List all cocktails |
| GET | `/cocktails/:id` | Get single cocktail |
| PATCH | `/cocktails/:id` | Update cocktail (availability) |

### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/customers` | List all customers |
| GET | `/customers/:id` | Get customer with order history |
| POST | `/customers` | Create new customer |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orders` | List all orders (with filters) |
| POST | `/orders` | Create new order |
| PATCH | `/orders/:id` | Update order status |
| DELETE | `/orders/:id` | Delete order |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/stats` | Dashboard statistics |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | API server port | 3001 |
| DATABASE_URL | PostgreSQL connection string | - |
| NODE_ENV | Environment mode | development |

## Development Commands

```bash
# Install dependencies
npm install

# Run in development (with hot reload)
npm run dev

# Run in production
npm start

# With Docker
docker-compose up -d
```

## Database Connection

The API connects to PostgreSQL using a connection pool. The `DATABASE_URL` format:
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

## Notes

- All responses are JSON
- CORS is enabled for frontend access
- Request logging is enabled in development
- The API expects the database to be seeded with cocktails
