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
# Hugging Face Spaces jalanin di port 7860; server.ts baca process.env.PORT.
ENV PORT=7860
EXPOSE 7860

CMD ["node", "dist/server.cjs"]
