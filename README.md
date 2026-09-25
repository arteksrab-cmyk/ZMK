# ЗМК СМС-РЕСУРС

Сайт завода металлоконструкций и API для отправки заявок на электронную почту.

## Структура

- `artifacts/zmk-sms-resurs/` — сайт, SEO-файлы, логотипы и favicon.
- `artifacts/api-server/` — API сайта, включая `POST /api/leads`.
- `lib/` — общие API-клиенты, схемы и зависимости workspace.

## Сборка

Нужны Node.js 22.12+ и pnpm 10.

```sh
pnpm install --frozen-lockfile
PORT=19551 BASE_PATH=/ pnpm --filter @workspace/zmk-sms-resurs run build
pnpm --filter @workspace/api-server run build
```

Сайт собирается в `artifacts/zmk-sms-resurs/dist/public`. Для работы формы веб-сервер должен передавать запросы `/api/*` API-серверу.

## Отправка заявок

API-серверу нужны переменные окружения:

- `PORT` — порт API-сервера;
- `GMAIL_APP_PASSWORD` — пароль приложения Gmail, задаётся только в защищённом окружении сервера;
- `GMAIL_USERNAME` — необязательное имя Gmail-ящика отправителя; по умолчанию используется почта сайта.

Не добавляйте пароли и другие секреты в Git.

## Индексация

`robots.txt`, `sitemap.xml`, canonical URL, Open Graph и структурированные данные настроены для домена `змк-стройка.рф`. После подключения домена добавьте сайт в Яндекс Вебмастер, подтвердите права и отправьте ему sitemap.