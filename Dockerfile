FROM node:20-alpine

WORKDIR /app

# Install dependencies first to optimize build cache
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the source code
COPY . .

EXPOSE 3000

# Start Next.js in hot-reloading development mode
CMD ["npm", "run", "dev"]
