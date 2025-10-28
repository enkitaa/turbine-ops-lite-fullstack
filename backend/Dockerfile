FROM node:20-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY src ./src
COPY openapi.yaml ./openapi.yaml

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 4000

# Start server
CMD ["npm", "start"]

