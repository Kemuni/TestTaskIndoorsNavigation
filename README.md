# Тестовое задание для Индорс Навигейшн

 Стек:
- Python 3.13+
- Django 6
- DRF 3.17
- Angular.js
- Docker Compose


### Запуск для разработки
Для запуска в режиме разработки и hot-reload можно использовать следующую команду:
```shell
docker compose watch
```


### Деплой
<small>[Источник](https://github.com/fastapi/full-stack-fastapi-template/blob/master/deployment.md)</small>
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
