FROM node:20-alpine AS base

WORKDIR /app

# Allow the node runtime user to create node_modules, but keep manifests root-owned (not writable by node)
RUN chown node:node /app
COPY --chown=root:root package*.json ./
USER node
RUN npm ci --omit=dev

USER root
# Backend source
COPY --chown=root:root app.js server.js services.js asset-manifest.js ecosystem.config.js ./
COPY --chown=root:root api/ ./api/
COPY --chown=root:root config/ ./config/
COPY --chown=root:root db/ ./db/
COPY --chown=root:root middleware/ ./middleware/
COPY --chown=root:root migrations/ ./migrations/
COPY --chown=root:root models/ ./models/
COPY --chown=root:root routes/ ./routes/
COPY --chown=root:root utils/ ./utils/
# Frontend static files served by express.static
COPY --chown=root:root *.html ./
COPY --chown=root:root *.js ./
COPY --chown=root:root *.png ./
COPY --chown=root:root robots.txt sitemap.xml ./
COPY --chown=root:root assets/ ./assets/
COPY --chown=root:root Gallery/ ./Gallery/
COPY --chown=root:root image/ ./image/
COPY --chown=root:root styles/ ./styles/
COPY --chown=root:root .well-known/ ./.well-known/
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
