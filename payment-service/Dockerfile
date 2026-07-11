FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY index.js ./

ENV NODE_ENV=production
EXPOSE 5004
CMD ["node", "index.js"]

