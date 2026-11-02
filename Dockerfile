FROM node:lts-alpine

ENV NODE_ENV=production

WORKDIR /app/server

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY server/ ./
COPY public/ /app/public/
COPY data/ /app/data/

USER node

EXPOSE 3000

CMD ["node", "index.js"]
