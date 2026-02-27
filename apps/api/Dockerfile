FROM node:20-alpine AS build
WORKDIR /app

COPY package.json yarn.lock tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN yarn install --frozen-lockfile
RUN yarn workspace @challenge/db db:generate
RUN yarn workspace @challenge/api build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/db/prisma ./packages/db/prisma

EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]

