import os
import uuid
from datetime import date

from django.core.files.storage import default_storage
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _


class Breed(models.Model):
    """ Модель породы кошки """
    class HairType(models.TextChoices):
        SHORT = 'SHORT', _('Short')
        MEDIUM = 'MEDIUM', _('Medium')
        LONG = 'LONG', _('Long')
        HAIRLESS = 'HAIRLESS', _('Hairless')
        CURLY = 'CURLY', _('Curly')
        UNKNOWN = 'UNKNOWN', _('UNKNOWN')

    name = models.CharField(_('name'), max_length=255)
    description = models.TextField(_('description'))
    hair_type = models.CharField(_('hair_type'), max_length=10, choices=HairType)

    def __str__(self):
        return self.name


class Cat(models.Model):
    """ Модель кошки """
    class Gender(models.TextChoices):
        MALE = 'M', _('Male')
        FEMALE = 'F', _('Female')

    class Status(models.TextChoices):
        # Используется только для демонстрации (к примеру для карточек отца и матери котенка)
        FOR_DEMONSTRATION = 'FOR_DEMONSTRATION', _('Only for demonstration')
        # Ожидает нового владельца
        AWAITING_OWNER = 'AWAITING_OWNER', _('Awaiting of new owner')
        # Отдан в новые руки
        GIVEN_AWAY = 'GIVEN_AWAY', _('Given away')
        # Закрыто/скрыто (Объявление скрыто по каким-либо причинам)
        CLOSED = 'CLOSED', _('Closed')

    id = models.AutoField(primary_key=True)
    name = models.CharField(_('name'), max_length=100)
    price = models.DecimalField(
        _('price'),
        max_digits=15, decimal_places=2,
        blank=True, null=True,
        validators=[
            MinValueValidator(0, _('Price must be greater than 0')),
        ],
    )
    birthday = models.DateField(_('birthday'))
    owner = models.ForeignKey('users.User', on_delete=models.PROTECT, related_name='cats', verbose_name=_('owner'))
    gender = models.CharField(_('gender'), max_length=1, choices=Gender)
    color = models.CharField(_('color'), max_length=100)
    breed = models.ForeignKey('cats.Breed', on_delete=models.PROTECT, related_name='cats')
    current_weight = models.FloatField(
        _('weight'),
        validators=[
            MinValueValidator(0.0, _('Weight must be greater than 0')),
        ],
        help_text=_('Current weight in kilograms'),
    )
    birth_weight = models.FloatField(
        _('birth_weight'),
        blank=True, null=True,
        validators=[
            MinValueValidator(0.0, _('Birth weight must be greater than 0')),
        ],
        help_text=_('Birth weight in kilograms'),
    )
    is_sterilized = models.BooleanField(_('is_sterilized'), default=False)
    # Описание характера и привычек
    description = models.TextField(_('description'), blank=True, null=True)

    mother = models.ForeignKey(
        'cats.Cat', on_delete=models.PROTECT,
        related_name='children_as_father',
        blank=True, null=True,
        verbose_name=_('mother'),
    )
    father = models.ForeignKey(
        'cats.Cat', on_delete=models.PROTECT,
        related_name='children_as_mother',
        blank=True, null=True,
        verbose_name=_('father'),
    )

    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status,
        default=Status.AWAITING_OWNER
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def age_months(self) -> int:
        """ Считаем и возвращаем возраст кошки в месяцах """
        today = date.today()
        years_delta = today.year - self.birthday.year
        months_delta = today.month - self.birthday.month
        return years_delta * 12 + months_delta

    @property
    def age(self) -> int:
        """ Считаем и возвращаем возраст кошки в целых годах """
        return self.age_months // 12

    def __str__(self):
        return f'{self.name} (ID={self.id})'

    class Meta:
        indexes = [
            models.Index(fields=['breed', 'gender']),
            models.Index(fields=['status']),
            models.Index(fields=['birthday']),
        ]


def get_location_for_upload(_, filename):
    extension = filename.split('.')[-1]
    new_filename = f"{uuid.uuid4().hex}.{extension}"
    return os.path.join('cat_images/', new_filename)


class CatImage(models.Model):
    """ Модель изображений кошек """
    id = models.AutoField(primary_key=True)
    cat = models.ForeignKey('cats.Cat', on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to=get_location_for_upload)
    is_main = models.BooleanField(_('is_main'), default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.cat.name} - {self.id}'

    def save(self, *args, **kwargs):
        """ Сохраняем изображение. Если оно помечено как главное, то убираем эту отметку у прошлой главной фотки """
        if self.is_main and self.cat_id:
            CatImage.objects.filter(cat=self.cat, is_main=True).update(is_main=False)
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """ Удаляем изображение и убираем файл из S3 хранилища """
        if self.image:
            default_storage.delete(self.image.name)
        super().delete(*args, **kwargs)

    class Meta:
        indexes = [
            models.Index(fields=['cat']),
            models.Index(fields=['cat', 'is_main']),
        ]


class FavouriteCat(models.Model):
    """ Любимые объявления кошек """
    id = models.AutoField(primary_key=True)
    cat = models.ForeignKey('cats.Cat', on_delete=models.CASCADE, related_name='favourites')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='favourites_cats')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.cat.name} - {self.id}'

    class Meta:
        unique_together = ('cat', 'user')
