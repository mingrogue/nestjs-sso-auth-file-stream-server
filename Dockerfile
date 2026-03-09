# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build both apps
RUN npm run build:sso-auth && npm run build:streaming

# Production stage for sso-auth
FROM node:18-alpine AS sso-auth

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist/apps/sso-auth ./dist/apps/sso-auth

EXPOSE 3001

CMD ["node", "dist/apps/sso-auth/main"]

# Production stage for streaming
FROM node:18-alpine AS streaming

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist/apps/streaming ./dist/apps/streaming

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 3002

CMD ["node", "dist/apps/streaming/main"]
