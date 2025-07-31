FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S kutubooks -u 1001

# Change ownership of app directory
RUN chown -R kutubooks:nodejs /app
USER kutubooks

EXPOSE 8080

# Environment variables with defaults
ENV PORT=8080
ENV JWT_SECRET=kutubooks_default_secret
ENV JWT_EXPIRES_IN=24h
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "index.js"]