# Tipsy - Backend API

REST API backend for the Tipsy cocktail ordering application. Built with Express.js and PostgreSQL.

## Features

- **RESTful API** - Clean REST endpoints for cocktails, orders, ingredients, and users
- **JWT Authentication** - Secure token-based authentication with bcrypt password hashing
- **Role-based Access** - Admin, bartender, and guest role support
- **Rate Limiting** - Protection against abuse with configurable rate limits
- **Security Hardened** - Helmet.js for security headers, CORS configuration
- **Health Checks** - Docker-compatible health endpoint for orchestration
- **Graceful Shutdown** - Proper cleanup on SIGTERM

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js 4.x
- **Database**: PostgreSQL (via pg driver)
- **Authentication**: JWT (jsonwebtoken) + bcrypt
- **Security**: Helmet, CORS, express-rate-limit

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login and receive JWT token |

### Cocktails
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cocktails` | List all cocktails |
| GET | `/cocktails/:id` | Get cocktail details |
| POST | `/cocktails` | Create cocktail (admin) |
| PATCH | `/cocktails/:id` | Update cocktail (admin) |
| DELETE | `/cocktails/:id` | Delete cocktail (admin) |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orders` | List orders (filtered by role) |
| POST | `/orders` | Create a new order |
| PATCH | `/orders/:id` | Update order status |
| DELETE | `/orders/:id` | Cancel order |

### Ingredients
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ingredients` | List all ingredients |
| POST | `/ingredients` | Create ingredient (admin) |
| PATCH | `/ingredients/:id` | Update ingredient (admin) |
| DELETE | `/ingredients/:id` | Delete ingredient (admin) |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List users (admin) |
| GET | `/users/me` | Get current user profile |
| PATCH | `/users/:id` | Update user (admin) |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/stats` | Dashboard statistics |
| POST | `/admin/promote/:id` | Promote user to admin |

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
│   │   ├── ingredients.js   # Ingredient CRUD
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
   git clone https://github.com/yourusername/Bartending_Back.git
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

- **guest** - Can view cocktails and place orders
- **bartender** - Can manage orders
- **admin** - Full access to all endpoints

## Rate Limiting

- General API: 100 requests per 15 minutes
- Authentication: 5 requests per 15 minutes (login/register)

## Related Repositories

- [Bartending_Front](https://github.com/yourusername/Bartending_Front) - React frontend
- [Bartending_DB](https://github.com/yourusername/Bartending_DB) - Database migrations
- [Bartending_Deploy](https://github.com/yourusername/Bartending_Deploy) - Docker deployment

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.
