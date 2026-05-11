#!/bin/bash

# Выполняем миграции
python manage.py migrate

# Запускаем основную команду
exec "$@"