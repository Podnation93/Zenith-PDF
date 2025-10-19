# Zenith PDF - Production Deployment Guide

**Version:** 2.0
**Last Updated:** 2025-10-19
**Environment:** AWS Cloud Platform

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Configuration](#database-configuration)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Infrastructure Setup](#infrastructure-setup)
7. [Security Checklist](#security-checklist)
8. [Monitoring & Logging](#monitoring--logging)
9. [Backup & Recovery](#backup--recovery)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools
- Node.js 20+ and npm 10+
- Docker and Docker Compose
- AWS CLI configured
- PostgreSQL 16 client
- Git

### AWS Services Required
- EC2 (or ECS for containers)
- RDS PostgreSQL
- ElastiCache Redis
- S3
- CloudFront (CDN)
- Route 53 (DNS)
- Certificate Manager (SSL)
- CloudWatch (monitoring)

### Domain & SSL
- Registered domain name
- SSL certificate (via AWS Certificate Manager)

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/zenith-pdf.git
cd zenith-pdf
```

### 2. Install Dependencies

```bash
# Root
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Environment Variables

#### Backend Environment (`.env.production`)

```env
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database (RDS PostgreSQL)
DATABASE_URL=postgresql://username:password@your-rds-endpoint.amazonaws.com:5432/zenith_pdf

# Redis (ElastiCache)
REDIS_HOST=your-elasticache-endpoint.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT
JWT_SECRET=your-very-secure-random-jwt-secret-min-32-chars
JWT_ACCESS_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d

# S3
S3_BUCKET=zenith-pdf-documents-prod
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_ENDPOINT=https://s3.us-east-1.amazonaws.com

# CORS
CORS_ORIGIN=https://app.zenithpdf.com,https://www.zenithpdf.com

# Security
BCRYPT_SALT_ROUNDS=12
MAX_FILE_SIZE=52428800
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

#### Frontend Environment (`.env.production`)

```env
VITE_API_BASE_URL=https://api.zenithpdf.com
VITE_WS_URL=wss://api.zenithpdf.com
VITE_SENTRY_DSN=your-frontend-sentry-dsn
```

---

## Database Configuration

### 1. Create RDS PostgreSQL Instance

```bash
aws rds create-db-instance \
  --db-instance-identifier zenith-pdf-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 16.1 \
  --master-username admin \
  --master-user-password <secure-password> \
  --allocated-storage 100 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-xxxxx \
  --db-subnet-group-name your-subnet-group \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "Mon:04:00-Mon:05:00" \
  --enable-cloudwatch-logs-exports '["postgresql"]' \
  --storage-encrypted \
  --multi-az
```

### 2. Run Database Migrations

```bash
# Connect to RDS
export DATABASE_URL="postgresql://admin:password@your-rds-endpoint:5432/zenith_pdf"

# Run init script
psql $DATABASE_URL < backend/database/init.sql

# Verify tables
psql $DATABASE_URL -c "\dt"
```

### 3. Create Database Indexes (if not in init.sql)

```sql
-- Performance indexes
CREATE INDEX CONCURRENTLY idx_documents_owner_id ON documents(owner_id);
CREATE INDEX CONCURRENTLY idx_annotations_document_page ON annotations(document_id, page_number);
CREATE INDEX CONCURRENTLY idx_comments_annotation ON comments(annotation_id);
CREATE INDEX CONCURRENTLY idx_permissions_document_user ON permissions(document_id, user_id);
```

---

## Backend Deployment

### Option 1: EC2 Instance

#### 1. Launch EC2 Instance

```bash
# Ubuntu 22.04 LTS, t3.medium or larger
# Ensure security group allows:
# - Port 3000 (from ALB only)
# - Port 22 (SSH from your IP)
```

#### 2. Setup EC2

```bash
# SSH into instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Create app directory
sudo mkdir -p /opt/zenith-pdf
sudo chown ubuntu:ubuntu /opt/zenith-pdf
```

#### 3. Deploy Backend

```bash
# Clone or copy files
cd /opt/zenith-pdf
git clone https://github.com/your-org/zenith-pdf.git .

# Install dependencies
cd backend
npm ci --production

# Build TypeScript
npm run build

# Create .env.production (use template above)
nano .env.production

# Start with PM2
pm2 start dist/index.js --name zenith-pdf-backend -i max
pm2 save
pm2 startup
```

#### 4. Configure Reverse Proxy (Nginx)

```bash
sudo apt install -y nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/zenith-pdf
```

```nginx
upstream backend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name api.zenithpdf.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.zenithpdf.com;

    ssl_certificate /etc/letsencrypt/live/api.zenithpdf.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.zenithpdf.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers (additional to Helmet)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # API endpoints
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket
    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # WebSocket timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # File upload size
    client_max_body_size 50M;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/zenith-pdf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Option 2: Docker Container (ECS)

#### 1. Create Dockerfile

```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

#### 2. Build and Push to ECR

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t zenith-pdf-backend ./backend

# Tag image
docker tag zenith-pdf-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/zenith-pdf-backend:latest

# Push to ECR
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/zenith-pdf-backend:latest
```

#### 3. Create ECS Task Definition

```json
{
  "family": "zenith-pdf-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/zenith-pdf-backend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "3000" }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:zenith-pdf/database-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:zenith-pdf/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/zenith-pdf-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "backend"
        }
      }
    }
  ]
}
```

---

## Frontend Deployment

### 1. Build Frontend

```bash
cd frontend

# Install dependencies
npm ci

# Build for production
npm run build

# Output in frontend/dist/
```

### 2. Deploy to S3 + CloudFront

#### Create S3 Bucket

```bash
aws s3 mb s3://zenith-pdf-app-prod

# Enable static website hosting
aws s3 website s3://zenith-pdf-app-prod \
  --index-document index.html \
  --error-document index.html

# Upload build files
aws s3 sync dist/ s3://zenith-pdf-app-prod/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable"

# Upload index.html separately (no cache)
aws s3 cp dist/index.html s3://zenith-pdf-app-prod/index.html \
  --cache-control "no-cache, no-store, must-revalidate"
```

#### Create CloudFront Distribution

```json
{
  "Origins": [
    {
      "Id": "S3-zenith-pdf-app",
      "DomainName": "zenith-pdf-app-prod.s3.us-east-1.amazonaws.com",
      "S3OriginConfig": {
        "OriginAccessIdentity": ""
      }
    }
  ],
  "DefaultRootObject": "index.html",
  "CustomErrorResponses": [
    {
      "ErrorCode": 404,
      "ResponseCode": 200,
      "ResponsePagePath": "/index.html"
    },
    {
      "ErrorCode": 403,
      "ResponseCode": 200,
      "ResponsePagePath": "/index.html"
    }
  ],
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-zenith-pdf-app",
    "ViewerProtocolPolicy": "redirect-to-https",
    "Compress": true,
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6"
  },
  "Aliases": ["app.zenithpdf.com"],
  "ViewerCertificate": {
    "ACMCertificateArn": "arn:aws:acm:us-east-1:account:certificate/cert-id",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  }
}
```

#### Update Route 53

```bash
# Create A record pointing to CloudFront
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.zenithpdf.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "d1234567890.cloudfront.net",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

---

## Infrastructure Setup

### 1. Create ElastiCache Redis

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id zenith-pdf-redis \
  --engine redis \
  --engine-version 7.0 \
  --cache-node-type cache.t3.medium \
  --num-cache-nodes 1 \
  --security-group-ids sg-xxxxx \
  --cache-subnet-group-name your-subnet-group
```

### 2. Create S3 Bucket for Documents

```bash
# Create bucket
aws s3 mb s3://zenith-pdf-documents-prod

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket zenith-pdf-documents-prod \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket zenith-pdf-documents-prod \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket zenith-pdf-documents-prod \
  --public-access-block-configuration \
    BlockPublicAcls=true,\
    IgnorePublicAcls=true,\
    BlockPublicPolicy=true,\
    RestrictPublicBuckets=true

# Lifecycle policy (optional - delete old versions after 30 days)
aws s3api put-bucket-lifecycle-configuration \
  --bucket zenith-pdf-documents-prod \
  --lifecycle-configuration '{
    "Rules": [{
      "Id": "DeleteOldVersions",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 30
      }
    }]
  }'
```

### 3. Create Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name zenith-pdf-alb \
  --subnets subnet-xxxxx subnet-yyyyy \
  --security-groups sg-xxxxx \
  --scheme internet-facing

# Create target group
aws elbv2 create-target-group \
  --name zenith-pdf-backend-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxxxx \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3

# Create listener (HTTPS)
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:region:account:loadbalancer/app/zenith-pdf-alb/xxxxx \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:region:account:certificate/xxxxx \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:region:account:targetgroup/zenith-pdf-backend-tg/xxxxx
```

---

## Security Checklist

### Pre-Deployment

- [ ] All secrets stored in AWS Secrets Manager
- [ ] Environment variables reviewed (no hardcoded secrets)
- [ ] JWT secret is strong (32+ random characters)
- [ ] Database password is strong
- [ ] S3 buckets have public access blocked
- [ ] Security groups configured (least privilege)
- [ ] SSL certificates installed and valid
- [ ] CORS origins configured correctly
- [ ] Rate limiting enabled
- [ ] Password validation configured (min score 3)

### Post-Deployment

- [ ] Run security scan (npm audit, Snyk)
- [ ] Test rate limiting
- [ ] Verify SSL/TLS configuration
- [ ] Check security headers (securityheaders.com)
- [ ] Test CORS policy
- [ ] Verify file upload limits
- [ ] Test authentication flows
- [ ] Review CloudWatch logs for errors

---

## Monitoring & Logging

### 1. CloudWatch Log Groups

```bash
# Create log groups
aws logs create-log-group --log-group-name /app/zenith-pdf/backend
aws logs create-log-group --log-group-name /app/zenith-pdf/nginx
aws logs create-log-group --log-group-name /app/zenith-pdf/errors

# Set retention
aws logs put-retention-policy \
  --log-group-name /app/zenith-pdf/backend \
  --retention-in-days 30
```

### 2. CloudWatch Alarms

```bash
# High error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name zenith-pdf-high-error-rate \
  --alarm-description "Alert when error rate exceeds 5%" \
  --metric-name Errors \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# High CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name zenith-pdf-high-cpu \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

### 3. Application Performance Monitoring

Configure Sentry in both backend and frontend:

```typescript
// backend/src/index.ts
import * as Sentry from '@sentry/node';

if (env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}
```

---

## Backup & Recovery

### 1. Database Backups

RDS automated backups are enabled (7-day retention). For additional backups:

```bash
# Manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier zenith-pdf-prod \
  --db-snapshot-identifier zenith-pdf-manual-$(date +%Y%m%d)

# List snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier zenith-pdf-prod
```

### 2. S3 Document Backups

Enable S3 versioning (already done) and optionally:

```bash
# Cross-region replication (disaster recovery)
aws s3api put-bucket-replication \
  --bucket zenith-pdf-documents-prod \
  --replication-configuration file://replication.json
```

### 3. Recovery Procedures

**Database Recovery:**
```bash
# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier zenith-pdf-prod-restored \
  --db-snapshot-identifier zenith-pdf-manual-20251019
```

**S3 Document Recovery:**
```bash
# Restore specific file version
aws s3api list-object-versions \
  --bucket zenith-pdf-documents-prod \
  --prefix documents/

aws s3api get-object \
  --bucket zenith-pdf-documents-prod \
  --key documents/file.pdf \
  --version-id <version-id> \
  restored-file.pdf
```

---

## Troubleshooting

### Common Issues

#### 1. Backend won't start

```bash
# Check logs
pm2 logs zenith-pdf-backend

# Common causes:
# - Database connection failed: Check DATABASE_URL
# - Redis connection failed: Check REDIS_HOST
# - Port already in use: Check with `lsof -i :3000`
```

#### 2. WebSocket connections failing

```bash
# Check Nginx WebSocket config
sudo nginx -t
sudo tail -f /var/log/nginx/error.log

# Verify WebSocket endpoint
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  https://api.zenithpdf.com/ws/test-doc-id
```

#### 3. File uploads failing

```bash
# Check S3 permissions
aws s3api get-bucket-policy --bucket zenith-pdf-documents-prod

# Test upload
aws s3 cp test.pdf s3://zenith-pdf-documents-prod/test/test.pdf

# Check backend logs for S3 errors
pm2 logs zenith-pdf-backend --lines 100 | grep S3
```

#### 4. High latency

```bash
# Check database performance
# RDS Console -> Performance Insights

# Check Redis
redis-cli -h <elasticache-endpoint> INFO stats

# Check application metrics
# CloudWatch -> Application Insights
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Backend health
curl https://api.zenithpdf.com/health

# Expected response:
# {"status":"healthy","timestamp":"...","uptime":123}
```

### 2. Functional Tests

```bash
# Run E2E tests against production (staging first!)
npm run test:e2e -- --baseUrl=https://app.zenithpdf.com
```

### 3. Performance Tests

```bash
# Load test with Artillery
artillery quick --count 100 --num 10 https://api.zenithpdf.com/api/auth/login
```

### 4. Security Scan

```bash
# OWASP ZAP scan
zap-cli quick-scan https://app.zenithpdf.com

# SSL test
testssl.sh https://api.zenithpdf.com
```

---

## Rollback Procedures

### Backend Rollback

```bash
# PM2
pm2 stop zenith-pdf-backend
git checkout <previous-commit>
npm run build
pm2 restart zenith-pdf-backend

# ECS
aws ecs update-service \
  --cluster zenith-pdf \
  --service backend \
  --task-definition zenith-pdf-backend:<previous-revision>
```

### Frontend Rollback

```bash
# Restore previous S3 version
aws s3 sync s3://zenith-pdf-app-prod-backup/ s3://zenith-pdf-app-prod/

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E123456789 \
  --paths "/*"
```

---

## Continuous Deployment (Optional)

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: cd backend && npm ci && npm run build
      - uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - run: |
          docker build -t zenith-pdf-backend ./backend
          docker tag zenith-pdf-backend:latest ${{ secrets.ECR_REGISTRY }}/zenith-pdf-backend:latest
          docker push ${{ secrets.ECR_REGISTRY }}/zenith-pdf-backend:latest

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: cd frontend && npm ci && npm run build
      - uses: aws-actions/configure-aws-credentials@v2
      - run: |
          aws s3 sync frontend/dist/ s3://zenith-pdf-app-prod/ --delete
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_ID }} --paths "/*"
```

---

## Maintenance

### Regular Tasks

**Daily:**
- Check error logs
- Monitor application metrics
- Verify backup completion

**Weekly:**
- Review CloudWatch alarms
- Check disk space and resource usage
- Update dependencies (security patches)

**Monthly:**
- Review and rotate secrets
- Analyze cost and optimize resources
- Performance testing
- Security audit

---

## Support & Resources

- **AWS Documentation:** https://docs.aws.amazon.com/
- **Node.js Best Practices:** https://github.com/goldbergyoni/nodebestpractices
- **Security Headers:** https://securityheaders.com/
- **SSL Test:** https://www.ssllabs.com/ssltest/

---

**Deployment Status:** ✅ Production Ready

This deployment guide provides a complete, step-by-step process for deploying Zenith PDF to AWS cloud infrastructure with best practices for security, monitoring, and reliability.

---

*Last Updated: 2025-10-19*
*Version: 2.0*
