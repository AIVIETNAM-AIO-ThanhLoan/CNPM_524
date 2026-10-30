FROM node:24-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates mariadb-client \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app \
    && chown node:node /app

WORKDIR /app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci
COPY --chown=node:node . .

ENV NODE_ENV=development NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
