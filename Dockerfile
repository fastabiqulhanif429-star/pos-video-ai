# Image buat deploy ke Google Cloud Run (atau host Docker lain)
FROM node:22-slim

WORKDIR /app

# Install deps dulu (manfaatin cache layer)
COPY package*.json ./
RUN npm install

# Copy sisa source + build (vite build -> dist/, esbuild -> dist/server.cjs)
COPY . .
RUN npm run build

ENV NODE_ENV=production
# Platform (Render dll) nyuntik PORT saat runtime; server.ts baca process.env.PORT.
EXPOSE 3000

CMD ["node", "dist/server.cjs"]
