# Intended to be built from repo root (where compose file is)
FROM node:21.5.0 AS build

# @TODO - foconnor: This can be optimised.
WORKDIR /app
COPY . .
RUN npm install -w ui
RUN npm run build -w ui

# Bundle static assets with nginx
FROM nginx:alpine as production
EXPOSE 80
WORKDIR /app

COPY --from=build /app/packages/ui/dist /usr/share/nginx/html
COPY ./packages/ui/docker-assets/nginx.conf /etc/nginx/conf.d/default.conf
