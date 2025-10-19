# Zenith PDF v2.0 - Collaborative PDF Editor

A free, web-based, real-time collaborative PDF reader and editor built with modern web technologies.

## Features (MVP - Phase 1)

- **User Management**: Secure authentication with JWT
- **Document Handling**: PDF upload and cloud storage (MinIO/S3)
- **Sharing & Permissions**: Share documents with view-only or comment access
- **Real-time Collaboration**: WebSocket-based presence indicators and live updates
- **Annotations**: Highlight text, add comments and sticky notes
- **Comments**: Threaded discussions with @mentions and notifications
- **Export**: Download PDFs with flattened annotations

## Tech Stack

### Backend
- **Framework**: Node.js + Fastify
- **Database**: PostgreSQL 16
- **Cache/Pub-Sub**: Redis
- **Storage**: AWS S3 (MinIO for local dev)
- **PDF Processing**: pdf-lib
- **Real-time**: WebSockets with Redis Pub/Sub
- **CRDT**: Yjs for conflict-free collaborative editing
- **Language**: TypeScript

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **PDF Rendering**: PDF.js
- **PDF Manipulation**: pdf-lib
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Routing**: React Router

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Orchestration**: Kubernetes (production)
- **CI/CD**: GitHub Actions
- **Hosting**: AWS

## Project Structure

```
zenith-pdf/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── middleware/      # Auth and authorization middleware
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── websocket/       # WebSocket handlers
│   │   ├── types/           # TypeScript types
│   │   └── index.ts         # Main server file
│   ├── database/
│   │   └── init.sql         # Database schema
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API and WebSocket services
│   │   ├── store/           # Zustand stores
│   │   ├── types/           # TypeScript types
│   │   └── main.tsx         # Entry point
│   └── package.json
├── docker-compose.yml       # Local development services
└── package.json             # Root workspace config
```

## Getting Started

### Prerequisites

- **Node.js**: >= 20.0.0
- **npm**: >= 10.0.0
- **Docker**: Latest version
- **Docker Compose**: Latest version

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd zenith-pdf
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start Docker services**
   ```bash
   npm run docker:up
   ```
   This starts:
   - PostgreSQL (port 5432)
   - Redis (port 6379)
   - MinIO (port 9000, console: 9001)

4. **Setup MinIO**
   - Open http://localhost:9001 in your browser
   - Login with credentials: `minioadmin` / `minioadmin`
   - Create a bucket named `zenith-pdf-documents`
   - Set the bucket policy to public or configure access keys

5. **Initialize database**
   The database schema is automatically initialized when PostgreSQL starts.

6. **Start development servers**
   ```bash
   npm run dev
   ```
   This starts both backend and frontend in parallel:
   - Backend: http://localhost:3000
   - Frontend: http://localhost:5173

### Default Test User

A test user is created automatically:
- **Email**: test@zenith-pdf.com
- **Password**: testpassword123

## Development

### Backend Development

```bash
cd backend
npm run dev        # Start with hot reload
npm run build      # Build for production
npm run test       # Run tests
npm run lint       # Lint code
```

### Frontend Development

```bash
cd frontend
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Lint code
```

### Database Management

```bash
# Access PostgreSQL
docker exec -it zenith-postgres psql -U zenith_user -d zenith_pdf

# View logs
docker logs zenith-postgres

# Reset database (warning: deletes all data)
npm run docker:down
docker volume rm zenith-pdf_postgres_data
npm run docker:up
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/me` - Update profile
- `POST /api/auth/logout` - Logout

### Documents
- `POST /api/documents/upload` - Upload PDF
- `GET /api/documents` - List user's documents
- `GET /api/documents/:id` - Get document details
- `GET /api/documents/:id/download` - Get download URL
- `DELETE /api/documents/:id` - Delete document

### Annotations
- `POST /api/documents/:id/annotations` - Create annotation
- `GET /api/documents/:id/annotations` - List annotations
- `PATCH /api/documents/:id/annotations/:annotationId` - Update annotation
- `DELETE /api/documents/:id/annotations/:annotationId` - Delete annotation

### Comments
- `POST /api/documents/:id/comments` - Create comment
- `GET /api/documents/:id/comments` - List comments
- `PATCH /api/documents/:id/comments/:commentId` - Update comment
- `DELETE /api/documents/:id/comments/:commentId` - Delete comment

### WebSocket
- `WS /ws/:documentId` - Real-time collaboration socket

## Security Features

### IDOR Protection
All API endpoints and WebSocket messages validate user permissions before allowing access to resources.

### Server-Side PDF Processing
PDF manipulation occurs in isolated environments (AWS Lambda in production) to prevent malicious file exploits.

### Authentication
- JWT-based authentication with refresh tokens
- Bcrypt password hashing with salt rounds
- Token expiration and rotation

### Authorization
- Row-level security via database functions
- Permission-based access control (view, comment, edit, admin)
- Share links with optional password protection

## Environment Variables

### Backend (.env)

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://zenith_user:zenith_dev_password@localhost:5432/zenith_pdf
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-32chars-minimum
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=zenith-pdf-documents
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
CORS_ORIGIN=http://localhost:5173
```

## Production Deployment

### Docker Build

```bash
# Build backend
docker build -t zenith-pdf-backend ./backend

# Build frontend
docker build -t zenith-pdf-frontend ./frontend
```

### Environment Setup

1. Update `.env` files with production values
2. Set strong `JWT_SECRET` (minimum 32 characters)
3. Configure production PostgreSQL instance
4. Configure production Redis instance
5. Set up AWS S3 bucket
6. Configure CORS_ORIGIN to production domain

### AWS Lambda for PDF Processing

For production, offload PDF processing to AWS Lambda:
1. Create Lambda function with pdf-lib
2. Configure S3 event triggers
3. Update backend to invoke Lambda for exports

## Roadmap

### Phase 2: v1.1 - The "Markup Toolkit"
- Underline and strikethrough annotations
- Freehand drawing tools
- Basic shapes (rectangles, arrows, ellipses)
- Page reordering and deletion

### Phase 3: v2.0 - The "Full Editor"
- Direct text editing
- Image manipulation
- Form filling
- Digital signatures

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

[Add your license here]

## Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Email: support@zenith-pdf.com
