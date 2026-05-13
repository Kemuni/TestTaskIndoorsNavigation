# Сайт заводчиков котов
#### Тестовое задание для Индорс Навигейшн

<p align="left">
   <img src="https://img.shields.io/badge/Python_3.13+-14354C?style=for-the-badge&logo=python&logoColor=white"/>
   <img src="https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white"/>
   <img src="https://img.shields.io/badge/Swagger-0a82E20?style=for-the-badge&logo=swagger&logoColor=white"/>
   <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white"/>
   <img src="https://img.shields.io/badge/Redis-a32422?style=for-the-badge&logo=redis&logoColor=white"/>
   <img src="https://img.shields.io/badge/Minio-cf163d?style=for-the-badge&logo=minio&logoColor=white"/>
   <img src="https://img.shields.io/badge/Docker-00B2FF?style=for-the-badge&logo=docker&logoColor=white"/>
   <img src="https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E"/>
   <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white"/>
   <img src="https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white"/>
   <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white"/>
   <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white"/>
   <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white"/>
</p>

## Описание задачи

Разработка REST API для работы с моделью "Кошки" с авторизацией заводчиков и чатом между пользователями.
Реализация клиентской части на Angular.js для взаимодействия с API. Упаковать все, используя Docker.


## Чек-лист

- [x] Авторизация пользователя (JWT).
- [x] Добавление, изменение и удаление базовой модели кошки. 
- [x] Добавление родителей кошек.
- [x] Реализация чата через WebSocker (django-channels).
- [x] Сохранение избранных объявлений кошек.
- [x] Различные статусы объявлений: "Для показа" (Информативный, к примеру для показа родителей кошек), "Ищет хозяина", "Отдан", "Закрыт".
- [x] Пресет (фикстура) готовых пород с описанием и разделением на длину шерсти.
- [x] Добавить Swagger с полным описанием всех эндпоинтов (drf-spectacular).
- [x] Использование S3 хранилища (MinIO) для изображений.
- [x] Реализовать "прочитывание" сообщений в чате.
- [x] Использование Docker и Docker Compose для деплоя.
- [x] Использование Docker Compose + Watch для разработки.
- [x] Настройка reverse-proxy Traefik с получением SSL сертификата.
- [ ] Возможность прикрепления документов о кошке.
- [ ] GitHub Actions с автозапуском тестов.
- [ ] Pre-commit линтер.
- [ ] MyPy + линтер для кода из backend-части.
- [ ] OAuth авторизация через сторонние сервисы.

## Запуск для разработки

Для запуска в режиме разработки и hot-reload можно использовать следующую команду:
```shell
docker compose watch
```


## Деплой

<small>[Источник инструкции](https://github.com/fastapi/full-stack-fastapi-template/blob/master/deployment.md)</small>
1. В отдельной папке на удаленном сервере скопировать `docker-compose.traefik.yml` через rsync
    ```shell
    rsync -a docker-compose.traefik.yml root@your-server.example.com:/root/code/traefik-public/
    ```
2. Создать docker network
    ```shell
    docker network create traefik-public
   ```
3. Создать необходимые переменные окружения для настройки Traefik:
    ```shell
    export USERNAME=admin
    ```
   ```shell
    export PASSWORD=changeit
    ```
   ```shell
    export HASHED_PASSWORD=$(openssl passwd -apr1 $PASSWORD)
    ```
   ```shell
    echo $HASHED_PASSWORD
    ```
   ```shell
    export DOMAIN=project.example.ru
    ```
   ```shell
    export EMAIL=admin@example.com
    ```
4. Запустить Traefik на удаленном сервере
    ```shell
    docker compose -f docker-compose.traefik.yml up -d
    ```
5. Скопировать `.env.example` в `.env` и изменить его на свои значения
6. Далее создать Docker Context
    ```shell
    docker context create my-context --docker "host=ssh://root@ip"
    ```
7. Подключить по SSH к серверу
    ```shell
    ssh root@ip
    ```
8. В новом терминале на локальном компьютере запустить docker compose
    ```shell
    docker --context my-context up -d --build
    ```
9. Готово! Теперь всё находится на сервере.
