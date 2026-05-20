FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/nginx/99-runtime-env.sh /docker-entrypoint.d/99-runtime-env.sh
COPY --from=build /app/dist /usr/share/nginx/html
RUN chmod +x /docker-entrypoint.d/99-runtime-env.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
