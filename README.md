# TaskFlow – Node.js Backend
Live Link:https://taskmanager-ayn5.onrender.com

## Stack

| Django (original)         | Node.js (this)              |
|---------------------------|-----------------------------|
| Django REST Framework     | Express.js                  |
| djangorestframework-simplejwt | jsonwebtoken            |
| djongo / PyMongo          | Mongoose                    |
| django-cors-headers       | cors                        |
| bcrypt (Django built-in)  | bcryptjs                    |

## Project Structure

```
src/
├── server.js               # Entry point, Express app, MongoDB connect
├── middleware/
│   ├── auth.js             # JWT authenticate middleware
│   └── tokens.js           # Token generation helpers
├── models/
│   ├── User.js             # User model
│   ├── Project.js          # Project model (with virtuals)
│   ├── Task.js             # Task model (with virtuals)
│   └── index.js            # Comment + Notification models
└── routes/
    ├── auth.js             # /api/auth/*
    ├── users.js            # /api/users/
    ├── projects.js         # /api/projects/* (CRUD + add/remove member + stats)
    ├── tasks.js            # /api/tasks/* (CRUD + filters)
    ├── comments.js         # /api/comments/
    ├── notifications.js    # /api/notifications/
    └── dashboard.js        # /api/dashboard/stats/
```

## Setup

```bash
npm install

# Copy and edit .env
cp .env .env.local

npm run dev    # development (nodemon)
npm start      # production
```

## API Endpoints

### Auth
| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login (username or email) |
| POST | /api/auth/logout | Logout |
| GET  | /api/auth/me | Current user |
| POST | /api/auth/refresh | Refresh access token |

### Projects
| Method | URL | Description |
|--------|-----|-------------|
| GET    | /api/projects/ | List user's projects |
| POST   | /api/projects/ | Create project |
| GET    | /api/projects/:id | Get project detail (with tasks) |
| PUT    | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete project |
| POST   | /api/projects/:id/add_member | Add member |
| POST   | /api/projects/:id/remove_member | Remove member |
| GET    | /api/projects/:id/stats | Task stats for project |

### Tasks
| Method | URL | Description |
|--------|-----|-------------|
| GET    | /api/tasks/ | List tasks (filters: project, status, assigned_to_me) |
| POST   | /api/tasks/ | Create task |
| GET    | /api/tasks/:id | Get task detail |
| PUT    | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task |

### Other
| Method | URL | Description |
|--------|-----|-------------|
| GET    | /api/users/ | List all users |
| POST   | /api/comments/ | Create comment |
| GET    | /api/notifications/ | Get notifications (last 20) |
| POST   | /api/notifications/read | Mark all as read |
| GET    | /api/dashboard/stats | Dashboard stats |

## Environment Variables

```env
PORT=8000
MONGO_URI=mongodb://localhost:27017/taskflow_db
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRES=1d
JWT_REFRESH_EXPIRES=7d
NODE_ENV=development
```

## Notes on Conversion

- Django's `auto_now_add` / `auto_now` → Mongoose `timestamps: true` (`createdAt`, `updated_at` mapped to `created_at` / `updated_at` in responses)
- Django JWT token blacklisting is replaced with stateless logout (the client discards the token)
- `djongo` MongoDB ORM replaced with native Mongoose schemas
- Django serializers replaced with inline formatting helpers in each route
- `ManyToManyField` (members) stored as an array of ObjectIds in MongoDB
