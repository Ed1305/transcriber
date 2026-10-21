# Multi-stage Docker build for Transcriber
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Build production assets
COPY . .
RUN npm run build

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled frontend and server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts

EXPOSE 3000

CMD ["npm", "start"]
