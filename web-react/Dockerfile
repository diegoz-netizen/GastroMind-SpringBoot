# Web: compila con Vite y sirve el resultado con nginx
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Las URLs de los backends se fijan al compilar (las ve el navegador, no el contenedor)
ARG VITE_API_URL=http://localhost:8080
ARG VITE_DJANGO_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL VITE_DJANGO_URL=$VITE_DJANGO_URL
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
