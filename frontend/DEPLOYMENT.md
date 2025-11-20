# NexInvo Frontend Deployment Guide

## Environment Configuration

The application uses environment variables to configure the API endpoint. This prevents hardcoding URLs in the codebase.

### Development

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. The `.env` file contains local development settings:
   ```
   REACT_APP_API_URL=http://localhost:8001/api
   ```

3. Start the development server:
   ```bash
   npm start
   ```

### Production Build

For production deployment, use the `build:prod` script which sets the production API URL:

```bash
npm run build:prod
```

This will create an optimized production build in the `build/` directory with the API URL set to:
`https://www.nexinvo.chinmaytechnosoft.com/api`

### Custom Production URL

If you need to deploy to a different production URL, you can either:

1. **Modify the build:prod script** in `package.json`:
   ```json
   "build:prod": "REACT_APP_API_URL=https://your-domain.com/api react-scripts build"
   ```

2. **Or set the environment variable directly**:
   ```bash
   REACT_APP_API_URL=https://your-domain.com/api npm run build
   ```

### Deployment Steps

1. **Build for production**:
   ```bash
   npm run build:prod
   ```

2. **Deploy the `build/` folder** to your web server (Apache, Nginx, etc.)

3. **Configure your web server** to serve the static files and handle routing properly.

### Important Notes

- The `.env` file is gitignored and should NOT be committed to version control
- `.env.example` is committed and serves as a template
- Always use environment variables instead of hardcoded URLs
- For local development, the default `.env` file points to `http://localhost:8001/api`
- For production builds, use `npm run build:prod` or set `REACT_APP_API_URL` manually

### Environment Variables

| Variable | Description | Default (Dev) | Production |
|----------|-------------|---------------|------------|
| `REACT_APP_API_URL` | Backend API endpoint | `http://localhost:8001/api` | `https://www.nexinvo.chinmaytechnosoft.com/api` |
| `REACT_APP_NAME` | Application name | `NexInvo` | `NexInvo` |
| `REACT_APP_VERSION` | Application version | `1.0.0` | `1.0.0` |
