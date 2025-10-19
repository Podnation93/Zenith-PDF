# Zenith PDF v2.0

<div align="center">

![Zenith PDF Logo](https://via.placeholder.com/150?text=Zenith+PDF)

**A free, web-based, real-time collaborative PDF reader and editor**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[Features](#features) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Contributing](#contributing) • [Roadmap](#roadmap)

</div>

---

## Vision

Zenith PDF eliminates the chaos of document review. No more emailing PDFs back and forth, tracking version numbers, or consolidating feedback from multiple sources. **See changes in real-time**, collaborate seamlessly with your team, and maintain a single source of truth for all your documents.

## Features

### Phase 1: MVP - "Collaborative Review Tool" ✅

- **🔐 User Authentication** - Secure JWT-based authentication with user profiles
- **📄 Document Management** - Upload, store, and organize PDFs in the cloud (AWS S3/MinIO)
- **🔗 Smart Sharing** - Share documents with granular permissions (view, comment, edit)
- **👥 Real-Time Presence** - See who's viewing the document with live cursor tracking
- **✏️ Rich Annotations**
  - Highlight text with customizable colors
  - Add comments and sticky notes
  - Threaded discussions with @mention support
- **💬 Collaborative Comments** - Reply to comments, resolve threads, get notifications
- **📤 Export** - Download PDFs with annotations flattened into the document
- **📡 Offline Support** - View documents and annotations offline; auto-sync on reconnect
- **📊 Activity Feed** - Track who added or edited annotations and when

### Phase 2: v1.1 - "Markup Toolkit" (In Progress)

- **Advanced Annotations** - Underline, strikethrough, freehand drawing, shapes
- **Annotation Templates** - Save and reuse custom annotation styles
- **Page Management** - Drag-and-drop reordering, page deletion
- **Text Search** - Find specific content within documents

### Phase 3: v2.0 - "Full Editor" (Planned)

- **Content Editing** - Directly edit text and images in PDFs
- **Form Filling** - Interactive PDF form support
- **Digital Signatures** - Create and apply signatures
- **WCAG 2.1 AA Accessibility** - Screen reader support, keyboard navigation, high-contrast modes
- **Document Templates** - Create new PDFs from templates

---

## Technology Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **UI Library:** Chakra UI (accessible, themeable components)
- **PDF Rendering:** PDF.js (Mozilla)
- **PDF Manipulation:** pdf-lib
- **State Management:** Zustand
- **Real-time:** WebSockets with auto-reconnect

### Backend
- **Framework:** Node.js + Fastify
- **Database:** PostgreSQL 16
- **Cache/Pub-Sub:** Redis 7
- **Storage:** AWS S3 (MinIO for local development)
- **Synchronization:** CRDTs with Yjs
- **Real-time:** WebSockets + Redis Pub/Sub
- **Language:** TypeScript

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Orchestration:** Kubernetes (production)
- **CI/CD:** GitHub Actions
- **Monitoring:** Prometheus + Grafana + OpenTelemetry
- **Cloud:** AWS (Lambda, API Gateway, S3, RDS, ElastiCache)

---

## Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **Docker** + **Docker Compose** (latest versions)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/zenith-pdf/zenith-pdf.git
   cd zenith-pdf
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start Docker services** (PostgreSQL, Redis, MinIO)
   ```bash
   npm run docker:up
   ```

4. **Configure MinIO** (S3-compatible storage)
   - Open http://localhost:9001
   - Login: `minioadmin` / `minioadmin`
   - Create bucket: `zenith-pdf-documents`
   - Set bucket to public or configure access keys

5. **Start development servers**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - **Frontend:** http://localhost:5173
   - **Backend API:** http://localhost:3000
   - **MinIO Console:** http://localhost:9001

### Test User

A default test user is created automatically:
- **Email:** `test@zenith-pdf.com`
- **Password:** `testpassword123`

---

## Project Structure

```
zenith-pdf/
├── backend/              # Node.js + Fastify API server
│   ├── src/
│   │   ├── config/       # Environment & database configuration
│   │   ├── middleware/   # Auth, IDOR protection, rate limiting
│   │   ├── routes/       # RESTful API endpoints
│   │   ├── services/     # Business logic (documents, annotations, comments)
│   │   ├── websocket/    # Real-time collaboration handlers
│   │   ├── types/        # TypeScript type definitions
│   │   └── utils/        # Helper functions
│   ├── database/
│   │   └── init.sql      # PostgreSQL schema with security functions
│   └── package.json
├── frontend/             # React + TypeScript SPA
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Login, Register, Dashboard, DocumentViewer
│   │   ├── services/     # API client & WebSocket service
│   │   ├── store/        # Zustand state management
│   │   ├── types/        # TypeScript interfaces
│   │   └── utils/        # Client-side utilities
│   └── package.json
├── docker-compose.yml    # Local development services
├── .github/
│   └── workflows/        # CI/CD pipelines
└── docs/                 # Additional documentation
```

---

## Documentation

- **[Getting Started Guide](GETTING_STARTED.md)** - Detailed setup instructions
- **[API Documentation](docs/API.md)** - Complete REST API reference
- **[WebSocket Protocol](docs/WEBSOCKET.md)** - Real-time event specifications
- **[Architecture Overview](docs/ARCHITECTURE.md)** - System design and decisions
- **[Security](docs/SECURITY.md)** - Security features and best practices
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project

---

## Development

### Run Backend Only
```bash
npm run dev:backend
# Server runs on http://localhost:3000
```

### Run Frontend Only
```bash
npm run dev:frontend
# App runs on http://localhost:5173
```

### Build for Production
```bash
npm run build
# Builds both backend and frontend
```

### Run Tests
```bash
npm test
# Runs tests across all workspaces
```

### Lint Code
```bash
npm run lint
# Lints TypeScript/JavaScript files
```

### Database Management
```bash
# Access PostgreSQL CLI
docker exec -it zenith-postgres psql -U zenith_user -d zenith_pdf

# View container logs
docker logs zenith-postgres
docker logs zenith-redis
docker logs zenith-minio

# Reset database (⚠️ deletes all data)
npm run docker:down
docker volume rm zenith-pdf_postgres_data
npm run docker:up
```

---

## API Overview

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user profile
- `PATCH /api/auth/me` - Update user profile
- `POST /api/auth/logout` - Logout user

### Documents
- `POST /api/documents/upload` - Upload PDF file
- `GET /api/documents` - List user's documents
- `GET /api/documents/:id` - Get document metadata
- `GET /api/documents/:id/download` - Get signed download URL
- `DELETE /api/documents/:id` - Delete document (soft delete)

### Annotations
- `POST /api/documents/:id/annotations` - Create annotation
- `GET /api/documents/:id/annotations` - List all annotations
- `PATCH /api/documents/:id/annotations/:annotationId` - Update annotation
- `DELETE /api/documents/:id/annotations/:annotationId` - Delete annotation

### Comments
- `POST /api/documents/:id/comments` - Create comment/reply
- `GET /api/documents/:id/comments` - List all comments
- `PATCH /api/documents/:id/comments/:commentId` - Edit comment
- `DELETE /api/documents/:id/comments/:commentId` - Delete comment

### WebSocket
- `WS /ws/:documentId` - Real-time collaboration connection

Full API documentation: [docs/API.md](docs/API.md)

---

## Security

Zenith PDF implements defense-in-depth security practices:

### ✅ Core Security Features

- **🔒 IDOR Protection** - All endpoints validate user permissions before resource access
- **🛡️ Server-Side Validation** - WebSocket messages validated and authorized server-side
- **🔐 JWT Authentication** - Secure token-based auth with refresh tokens
- **🔑 Password Security** - Bcrypt hashing with configurable salt rounds
- **📋 Audit Logging** - Track all document and annotation changes
- **⚡ Rate Limiting** - Protect against abuse and DDoS attacks
- **🏝️ Isolated PDF Processing** - Sandboxed AWS Lambda for PDF manipulation (production)
- **🚫 SQL Injection Prevention** - Parameterized queries and ORM usage
- **🌐 CORS Configuration** - Strict origin validation
- **📝 Input Validation** - All API inputs validated with schemas

See [SECURITY.md](docs/SECURITY.md) for vulnerability reporting and security policies.

---

## Roadmap

### ✅ Phase 1: MVP (Current)
- [x] User authentication & authorization
- [x] Document upload & storage
- [x] Real-time WebSocket infrastructure
- [x] Basic annotations (highlight, comments)
- [x] Threaded comment system
- [x] Sharing & permissions
- [ ] PDF.js rendering integration (90% complete)
- [ ] Annotation UI components (in progress)
- [ ] Export with flattened annotations

### 🔄 Phase 2: v1.1 - Markup Toolkit (Q2 2025)
- [ ] Expanded annotation tools (shapes, freehand)
- [ ] Annotation templates
- [ ] Page reordering and deletion
- [ ] Full-text search

### 🔮 Phase 3: v2.0 - Full Editor (Q3-Q4 2025)
- [ ] Direct text editing
- [ ] Image manipulation
- [ ] Form filling
- [ ] Digital signatures
- [ ] WCAG 2.1 AA compliance
- [ ] Document templates

See [ROADMAP.md](docs/ROADMAP.md) for detailed feature planning and timelines.

---

## Contributing

We welcome contributions from the community! Zenith PDF is **free and open-source software** (FOSS) under the MIT License.

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

Please read our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

### Development Priorities

We're currently seeking help with:
- **PDF.js integration** for document rendering
- **Annotation UI components** (toolbar, selection tools)
- **Accessibility features** (ARIA labels, keyboard navigation)
- **Unit and integration tests**
- **Documentation improvements**

---

## Community

- **GitHub Discussions:** Ask questions and share ideas
- **Issue Tracker:** Report bugs and request features
- **Discord:** Join our community chat (coming soon)
- **Twitter:** [@ZenithPDF](https://twitter.com/zenithpdf) (coming soon)

---

## Performance & Scalability

- **Horizontally Scalable:** Redis Pub/Sub enables multi-instance deployments
- **Efficient Rendering:** PDF.js with canvas-based rendering and lazy loading
- **Optimized Database:** Indexed queries, connection pooling, materialized views
- **CDN Integration:** Static assets served via CloudFront (production)
- **Real-time Optimization:** WebSocket heartbeat with auto-reconnect logic
- **CRDT Synchronization:** Conflict-free collaborative editing with eventual consistency

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 Zenith PDF Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

## Acknowledgments

- **PDF.js** - Mozilla's PDF rendering engine
- **pdf-lib** - JavaScript library for PDF manipulation
- **Chakra UI** - Accessible React component library
- **Yjs** - CRDT framework for real-time collaboration
- **Fastify** - Fast and low-overhead web framework
- **All contributors** who help make Zenith PDF better

---

## Support

### Need Help?

- **Documentation:** Check the [docs/](docs/) folder
- **Issues:** Search [existing issues](https://github.com/zenith-pdf/zenith-pdf/issues)
- **Discussions:** Ask on [GitHub Discussions](https://github.com/zenith-pdf/zenith-pdf/discussions)

### Found a Bug?

Please [open an issue](https://github.com/zenith-pdf/zenith-pdf/issues/new) with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, browser, version)

### Have a Feature Request?

We'd love to hear your ideas! [Open a feature request](https://github.com/zenith-pdf/zenith-pdf/issues/new?labels=enhancement) with:
- Use case description
- How it benefits users
- Any implementation suggestions

---

<div align="center">

**Built with ❤️ by the Zenith PDF community**

[⭐ Star us on GitHub](https://github.com/zenith-pdf/zenith-pdf) | [🐦 Follow on Twitter](https://twitter.com/zenithpdf)

</div>
