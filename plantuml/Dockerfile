# Stage 1: Fetch the latest official @plantuml/core assets
FROM node:22-alpine AS asset-fetcher
WORKDIR /build
RUN npm pack @plantuml/core@latest && \
    tar -xzf plantuml-core-*.tgz

# Stage 2: Lightweight static Nginx server
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY public/ /usr/share/nginx/html/
COPY --from=asset-fetcher /build/package/ /usr/share/nginx/html/vendor/plantuml/

EXPOSE 80
