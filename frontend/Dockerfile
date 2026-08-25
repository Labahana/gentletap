FROM node:20-alpine AS build

WORKDIR /app

# Cap the V8 heap so constrained build hosts (1GB VPS) GC instead of getting
# OOM-killed by tsc/vite. Pair with >=2GB swap on small servers.
ENV NODE_OPTIONS=--max-old-space-size=1536

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
