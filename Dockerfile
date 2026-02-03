# Bartending V2 - Backend API
# Node.js 20 on Alpine (ARM64 compatible for Raspberry Pi 4)

FROM node:20-alpine

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

# Health check (using curl which is available in node:alpine)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:3001/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start the server
CMD ["node", "src/index.js"]
