from django.db.models import Model

from backend_service.settings import AWS_S3_ENDPOINT_URL, PUBLIC_S3_ENDPOINT_URL


def get_s3_image_url(obj: Model, image_field_name: str) -> str | None:
    """
    Получает URL изображения из S3 хранилища.

    :param obj: Объект модели.
    :param image_field_name: Наименование поля с изображением в `obj`.
    :return: Ссылку на изображение или `None`.
    """
    try:
        image_field = getattr(obj, image_field_name)
        image_url = getattr(image_field, 'url', None)
    except (ValueError, AttributeError):
        image_url = None
    if image_url is None:
        return image_url
    # HACK - почему-то при любых настройках она добавляет https:// перед всей ссылкой
    return image_url.replace(AWS_S3_ENDPOINT_URL, PUBLIC_S3_ENDPOINT_URL).split('://', 1)[1]