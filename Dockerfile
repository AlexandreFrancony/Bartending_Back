# Bartending V2 - Backend API
# Node.js 20 on Alpine (ARM64 compatible for Raspberry Pi 4)

FROM node:20-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Set environment
ENV NODE_ENV=production

# Expose API port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start the server
CMD ["node", "src/index.js"]
