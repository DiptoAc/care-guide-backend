# Care Notes API

Express and MongoDB REST API for Care Notes.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI` and `JWT_SECRET`.
3. Run `npm ci`.
4. Run `npm start`.

The API is available at `http://localhost:5000/api`.

## Create the first Admin

Public registration always creates a regular user. Create the first Admin once, using credentials supplied only through your local shell:

```powershell
$env:ADMIN_NAME = "Care Notes Admin"
$env:ADMIN_EMAIL = "admin@example.com"
$env:ADMIN_PASSWORD = "use-a-unique-password-of-at-least-8-characters"
npm run seed:admin
Remove-Item Env:ADMIN_NAME, Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD
```

The seed command refuses to run if an Admin already exists. Never commit real passwords or database connection strings.

## Deploy to Render

1. Push this folder to its own GitHub repository and create a Render **Web Service** from that repository.
2. Select Node as the runtime; use `npm ci` for the build command and `npm start` for the start command. The included `render.yaml` can be used as a Blueprint instead.
3. Set `MONGODB_URI` to a MongoDB Atlas connection string and `CORS_ORIGIN` to the exact frontend origin. For multiple frontends, use a comma-separated list with no trailing slashes, for example `https://your-site.vercel.app,https://your-site.netlify.app`.
4. Render generates `JWT_SECRET` from the Blueprint configuration. For manual setup, provide a long, random secret.
5. After deployment, verify `https://<your-service>.onrender.com/api/health`.
6. To seed the first Admin on a fresh database, run `npm run seed:admin` locally with the production `MONGODB_URI` and temporary `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` environment variables. Remove them from the shell afterward.

## Main endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/users/me`
- `GET /api/users` - Admin only, paginated
- `GET /api/users/interests/group` - Admin only, paginated
- `GET /api/users/:id/posts` - Own user or Admin
- `GET /api/notes`
- `POST /api/notes`
- `GET|PATCH|DELETE /api/notes/:id`
- `GET /api/posts`
- `POST /api/posts`
