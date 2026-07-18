# Dockerfile
FROM node:22-alpine As development
WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma ./prisma/
RUN npm ci
COPY --chown=node:node . .
RUN apk update && apk add bash \
    && find . -name '*.sh' -exec sed -i 's/\r$//' {} +
RUN npx prisma generate
RUN npm run build

USER node

FROM node:22-alpine as production
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
WORKDIR /usr/src/app
COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma ./prisma/
RUN npm ci --omit=dev
RUN npx prisma generate
COPY --chown=node:node --from=development /usr/src/app/dist ./dist
RUN apk update && apk add bash
CMD ["node", "dist/src/main"]