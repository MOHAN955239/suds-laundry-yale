FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm install --workspaces --include-workspace-root
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/package.json ./server/
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/node_modules ./node_modules
RUN mkdir -p /app/data
EXPOSE 4000
CMD ["node", "server/dist/index.js"]
