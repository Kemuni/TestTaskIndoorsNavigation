FROM python:3.13-slim as builder

# Говорим Python не создавать временные файлы (.pyc) - чтобы не захламлять контейнер
ENV PYTHONDONTWRITEBYTECODE 1

# Говорим Python сразу показывать все сообщения в консоли (без задержек)
ENV PYTHONUNBUFFERED 1

WORKDIR /app

ENV PYTHONPATH=/app

COPY requirements.txt .

# Устанавливаем все нужные библиотеки из requirements.txt
# Флаг --no-cache-dir говорит не сохранять временные файлы установки
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

FROM builder as development
CMD ["python", "manage.py", "migrate"]
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

FROM builder as production
CMD ["python", "manage.py", "migrate"]
CMD ["gunicorn", "backend_service.wsgi:application", "--bind", "0.0.0.0:8000"]
