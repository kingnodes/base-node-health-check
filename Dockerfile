FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Expose the configured port
EXPOSE ${PORT:-8080}

# Start the application
CMD ["npm", "start"] 