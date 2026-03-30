FROM node:18-alpine AS build

# Preparar directorio
WORKDIR /app

# Instalar dependencias puras Node
COPY package*.json ./
RUN npm install

# Compilar proyecto Vite para producción (crea /dist)
COPY . .
RUN npm run build

# Imagen fina y robusta NGINX (Servidor web estático + Proxy a backend)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Mover la configuración de NGINX que va de proxy al servidor Goole Cloud Run del API
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponemos 8080 (Cloud Run usa esto idealmente)
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
