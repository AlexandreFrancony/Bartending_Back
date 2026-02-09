# Tipsy - Backend API

REST API backend for the Tipsy cocktail ordering application. Built with Express.js and PostgreSQL.

[![Live](https://img.shields.io/badge/api-tipsy.francony.fr/api-brightgreen)](https://tipsy.francony.fr/api/health)

## Features

- **RESTful API** - Clean REST endpoints for cocktails, orders, and users
- **JWT Authentication** - Secure token-based authentication with bcrypt password hashing
- **Role-based Access** - Admin and user role support
- **Password Reset** - Email-based password reset with OVH SMTP
- **Rate Limiting** - Protection against abuse on auth endpoints
- **Security Hardened** - Helmet.js for security headers, CORS configuration
- **Health Checks** - Docker-compatible health endpoint for orchestration
- **Graceful Shutdown** - Proper cleanup on SIGTERM

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js 4.x
- **Database**: PostgreSQL (via pg driver)
- **Authentication**: JWT (jsonwebtoken) + bcrypt
- **Email**: Nodemailer with OVH SMTP
- **Security**: Helmet, CORS, express-rate-limit

## API Endpoints

### Authentication (`/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login and receive JWT token |
| GET | `/auth/me` | Get current user profile |
| POST | `/auth/change-password` | Change password |
| POST | `/auth/forgot-password` | Request password reset email |
| POST | `/auth/reset-password` | Reset password with token |

### Cocktails (`/cocktails`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cocktails` | List all cocktails |
| GET | `/cocktails/:id` | Get cocktail details |
| PATCH | `/cocktails/:id` | Update availability (admin) |

### Orders (`/orders`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orders` | List all orders (admin, filterable) |
| GET | `/orders/my` | Current user's orders |
| POST | `/orders` | Create a new order |
| PATCH | `/orders/:id` | Update order status (admin) |
| DELETE | `/orders/:id` | Cancel order |

### Admin (`/admin`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/stats` | Dashboard statistics |
| GET | `/admin/orders/summary` | Orders grouped by status |
| GET | `/admin/cocktails/popular` | Top ordered cocktails |
| POST | `/admin/cocktails/toggle-availability` | Bulk update availability |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check for Docker |

## Project Structure

```
Bartending_Back/
├── src/
│   ├── db/
│   │   └── pool.js          # PostgreSQL connection pool
│   ├── middleware/
│   │   ├── auth.js          # JWT authentication middleware
│   │   └── rateLimiter.js   # Rate limiting configuration
│   ├── routes/
│   │   ├── admin.js         # Admin endpoints
│   │   ├── auth.js          # Authentication endpoints
│   │   ├── cocktails.js     # Cocktail CRUD
│   │   ├── orders.js        # Order management
│   │   └── users.js         # User management
│   └── index.js             # Application entry point
├── .env.example             # Environment template
├── Dockerfile               # Container configuration
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ (or use Docker)
- npm or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/AlexandreFrancony/Bartending_Back.git
   cd Bartending_Back
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and JWT secret
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3001`.

### With Docker

```bash
docker build -t tipsy-api .
docker run -p 3001:3001 --env-file .env tipsy-api
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `NODE_ENV` | Environment mode | `development` |
| `JWT_SECRET` | Secret key for JWT tokens | Required |
| `JWT_EXPIRES_IN` | Token expiration time | `7d` |
| `FRONTEND_URL` | Allowed CORS origin | `*` |
| `SMTP_HOST` | SMTP server | `ssl0.ovh.net` |
| `SMTP_PORT` | SMTP port | `465` |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASS` | SMTP password | - |

### Generating a JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### User Roles

- **user** - Can view cocktails and place orders
- **admin** - Full access to all endpoints (user "Bloster")

## Rate Limiting

- General API: 100 requests per 15 minutes
- Authentication: 5 requests per 15 minutes (login/register)

## Related Repositories

- [Bartending_Front](https://github.com/AlexandreFrancony/Bartending_Front) - React frontend
- [Bartending_DB](https://github.com/AlexandreFrancony/Bartending_DB) - Database schema
- [Bartending_Deploy](https://github.com/AlexandreFrancony/Bartending_Deploy) - Docker deployment
- [Infra](https://github.com/AlexandreFrancony/Infra) - Central reverse proxy

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.
