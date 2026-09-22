FROM node:22-alpine AS builder

WORKDIR /app

ENV HUSKY=0

RUN apk add --no-cache python3 make g++

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN yarn build \
  && yarn install --frozen-lockfile --production --ignore-scripts \
  && yarn cache clean

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package.json ./

USER node

EXPOSE 8080

CMD ["node", "dist/main.js"]
