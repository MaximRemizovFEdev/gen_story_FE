# gen_story_FE

Frontend сервиса «Детки-сказки» на Next.js App Router.

## Локальный запуск

Требуется Node.js 20.9 или новее.

```bash
npm ci
npm run dev
```

Браузер всегда обращается к API через `/api`. В development Next.js перенаправляет этот префикс на `DEV_API_TARGET` (по умолчанию `http://localhost:3000`). `NEXT_PUBLIC_API_URL` по умолчанию равен `/api` и фиксируется во время сборки. Тестовый вход появляется только в development при `NEXT_PUBLIC_DEV_AUTH_ENABLED=true`.

## Production и существующий backend Compose

Frontend запускается командой `node server.js` из Next standalone image на внутреннем порту 3000. В production Next.js не проксирует `/api`: этот трафик разделяет уже существующий внешний Nginx на VPS. Прямой доступ к `127.0.0.1:3001/api` не поддерживается; браузер обращается к `/api` на публичном домене.

В `compose.yaml` backend-репозитория измените только секцию `frontend`:

```yaml
  frontend:
    build:
      context: ${FRONTEND_DIR:-/opt/gen-story-frontend}
      args:
        NEXT_PUBLIC_API_URL: /api
    init: true
    restart: unless-stopped
    ports:
      - "127.0.0.1:${FRONTEND_PORT:-3001}:3000"
```

Сервис `app`, его `127.0.0.1:${APP_PORT:-3000}:3000`, bind mount данных и healthcheck не меняются. Новый Compose или дополнительный Nginx-контейнер не создаются.

В существующий `server` публичного домена на VPS добавьте или приведите к следующему виду две локации. Остальные SSL, сертификаты и настройки сервера сохраняются:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

У `proxy_pass` для `/api/` намеренно нет завершающего `/`: исходный URI `/api/...` должен дойти до backend без переписывания. Фактическая VPS-конфигурация отсутствует в этом репозитории, поэтому перед применением проверьте отсутствие более приоритетных конфликтующих `location`.

Перед переключением сохраните тег предыдущего frontend image, прежнюю frontend-секцию Compose и копию действующей конфигурации внешнего Nginx. Соберите новый image и проверьте его на временном loopback-порту. Затем переключите только frontend и проверьте конфигурацию Nginx:

```bash
docker compose build frontend
docker compose up -d --no-deps frontend
sudo nginx -t
sudo systemctl reload nginx
```

Не выполняйте reload, если `nginx -t` завершился ошибкой. После переключения проверьте frontend на `127.0.0.1:3001`, все публичные маршруты через домен и реальные `/api`, OAuth, cookie-сессию, оплату и PDF через домен.

Для отката восстановите сохранённую конфигурацию внешнего Nginx, предыдущий frontend image, прежние build args и mapping `:80`, затем выполните `docker compose up -d --no-deps frontend`, `sudo nginx -t` и только после успешной проверки `sudo systemctl reload nginx`. Backend и данные при переключении или откате не перезапускаются и не изменяются.
