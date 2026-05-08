from datetime import date

from django.core.validators import MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _


class Breed(models.Model):
    """ Модель породы кошки """
    name = models.CharField(_('name'), max_length=255)
    description = models.TextField(_('description'))

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
