FROM node:20-alpine

WORKDIR /app

# Install deps first so layer caching survives source edits.
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 5000

# tini handles PID 1 + signal forwarding so SIGTERM reaches the Node
# process and our graceful shutdown actually runs.
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "index.js"]
