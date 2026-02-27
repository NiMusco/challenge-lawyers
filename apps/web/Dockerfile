FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json yarn.lock tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN yarn install --frozen-lockfile
RUN yarn workspace @challenge/web build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/apps/web/dist ./dist
COPY --from=build /app/apps/web/package.json ./package.json

RUN yarn add --silent serve@14.2.4

EXPOSE 8080
CMD ["node", "node_modules/serve/build/main.js", "-s", "dist", "-l", "8080"]

