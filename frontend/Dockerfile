FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_REPORT_API_URL=/api
ARG VITE_EXPORT_API_URL=
ARG VITE_AI_API_URL=

RUN npm run build

FROM alpine:3.20
COPY --from=build /app/dist /dist
CMD ["cp", "-r", "/dist/.", "/output/"]
