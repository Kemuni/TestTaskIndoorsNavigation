from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    username = models.CharField(
        _("username"),
        max_length=150,
        unique=False,
        blank=True,
        null=True,
        default=None,
        help_text=_('Необязательное поле. Только для отображения.'),
    )
    first_name = models.CharField(
        _("first name"),
        max_length=150,
        blank=False,
        null=False,
    )
    last_name = models.CharField(
        _("last name"),
        max_length=150,
        blank=False,
        null=False,
    )
    email = models.EmailField(
        _("email address"),
        blank=False,
        null=False,
        unique=True,
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    def __str__(self):
        return self.email
