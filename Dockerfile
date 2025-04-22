FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build TypeScript
RUN npm run build

# Expose ports if needed (for HTTP transport in future)
# EXPOSE 3000

# Start the server
CMD ["npm", "start"]