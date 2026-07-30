# ============================================
# СТЕЙДЖ 1: Сборка React-приложения (Vite)
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем весь код
COPY . .

# Собираем проект (Vite)
RUN npm run build

# ============================================
# СТЕЙДЖ 2: Сервер для отдачи статики (Nginx)
# ============================================
FROM nginx:alpine

# Копируем собранный билд из первого стейджа
# Внимание: Vite по умолчанию собирает в папку dist, НЕ build!
COPY --from=builder /app/dist /usr/share/nginx/html

# Открываем порт 80
EXPOSE 80

# Запускаем Nginx
CMD ["nginx", "-g", "daemon off;"]