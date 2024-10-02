# Intended to be built from repo root (where compose file is)
FROM node:21.5.0 AS build
RUN apt update -qq && apt install -y build-essential && apt clean

# @TODO - foconnor: This can be optimised.
WORKDIR /app
COPY . .
RUN npm install -w server
RUN npm run build -w server
CMD [ "npm", "start", "-w", "server" ]
