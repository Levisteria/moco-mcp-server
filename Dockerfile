FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY tsconfig.json ./
COPY src/ ./src/
COPY openapi/ ./openapi/
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Only copy production dependencies and build output
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/build ./build
COPY --from=builder /app/openapi ./openapi

# Run the MCP server
ENTRYPOINT ["node", "build/index.js"]
