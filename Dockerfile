# Dockerfile
FROM node:19-alpine As development
WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma ./prisma/
RUN npm install glob rimraf
RUN npm ci
COPY --chown=node:node . .
RUN npm run build
RUN apk update && apk add bash

USER node

FROM node:19-alpine as production
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
WORKDIR /usr/src/app
COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma ./prisma/
RUN npm install glob rimraf
RUN npm ci --only=production
COPY --chown=node:node --from=development /usr/src/app/dist ./dist
RUN apk update && apk add bash
CMD ["node", "dist/src/main"]