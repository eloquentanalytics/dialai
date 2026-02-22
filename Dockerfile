FROM node:20-slim

WORKDIR /app

# Install root deps + build the dialai library
COPY package.json package-lock.json ./
COPY tsconfig.json tsconfig.build.json ./
COPY src/ src/
RUN npm ci && npm run build

# Install examples deps (file:.. resolves to built root)
COPY examples/package.json examples/package-lock.json examples/
WORKDIR /app/examples
RUN npm ci

# Copy examples source + build Vite frontend
COPY examples/ .
RUN npm run build

EXPOSE 3001
CMD ["npx", "tsx", "server/index.ts"]
