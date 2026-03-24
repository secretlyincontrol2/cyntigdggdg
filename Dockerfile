# Use Node.js 18 as the base image
FROM node:18-slim

# Install Python 3 and system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy Node.js package files and install dependencies
# We use --production if we don't need tests, but we need devDependencies for build (tsc)
COPY package*.json ./
RUN npm install

# Copy Python requirements and install dependencies
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

# Copy the rest of the application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript code with memory optimization
# Setting max-old-space-size to help tsc run on limited RAM
ENV NODE_OPTIONS="--max-old-space-size=192"
RUN npm run build

# Set Environment Variables
# Hugging Face Spaces use port 7860 by default
ENV PORT=7860
EXPOSE 7860

# Start the application
# Use a simple shell command to background the Python server and run the Node server
CMD python3 ai_server.py > python.log 2>&1 & npm start
