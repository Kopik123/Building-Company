FROM node:20-alpine AS base

WORKDIR /app

# Allow the node runtime user to create node_modules, but keep manifests root-owned (not writable by node)
RUN chown node:node /app
COPY --chown=root:root package*.json ./
USER node
RUN npm ci --omit=dev

USER root
COPY --chown=root:root . .
RUN chown -R root:root /app \
  && find /app -path /app/node_modules -prune -o -type d -exec chmod 755 {} \; \
  && find /app -path /app/node_modules -prune -o -type f -exec chmod 644 {} \; \
  && find /app/node_modules -type d -exec chmod 755 {} \; \
  && find /app/node_modules -type f -exec chmod 644 {} \; \
  && find /app/node_modules/.bin -type f -exec chmod 755 {} \; \
  && install -d -o node -g node -m 755 /app/uploads /app/logs \
  && install -o node -g node -m 644 /dev/null /app/.bootstrap.lock
USER node

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
