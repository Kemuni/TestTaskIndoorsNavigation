from datetime import date

import django_filters

from cats.models import Cat


class CatFilterSet(django_filters.FilterSet):
    """ Фильтр для объявлений кошек """
    gender = django_filters.ChoiceFilter(
        choices=Cat.Gender.choices,
        field_name='gender',
    )
    status = django_filters.ChoiceFilter(
        choices=Cat.Status.choices,
        field_name='status',
    )
    is_sterilized = django_filters.BooleanFilter(
        field_name='is_sterilized',
        label='Стерилизована'
    )
    breed_id = django_filters.NumberFilter(
        field_name='breed__id',
    )
    owner_id = django_filters.NumberFilter(
        field_name='owner__id',
    )

    current_weight_min = django_filters.NumberFilter(
        field_name='current_weight',
        lookup_expr='gte'
    )
    current_weight_max = django_filters.NumberFilter(
        field_name='current_weight',
        lookup_expr='lte'
    )

    min_age_months = django_filters.NumberFilter(
        method='filter_by_min_age_months',
        label='Минимальный возраст (месяцы)'
    )
    max_age_months = django_filters.NumberFilter(
        method='filter_by_max_age_months',
        label='Максимальный возраст (месяцы)'
    )

    has_mother = django_filters.BooleanFilter(
        method='filter_by_has_mother',
        label='Есть ли мать'
    )
    has_father = django_filters.BooleanFilter(
        method='filter_by_has_father',
        label='Есть ли отец'
    )

    def filter_by_min_age_months(self, queryset, _, value):
        if value is not None:
            today = date.today()
            max_birth_date = date(
                year=today.year - value // 12,
                month=today.month - value % 12,
                day=today.day
            )
            queryset = queryset.filter(birthday__lte=max_birth_date)
        return queryset

    def filter_by_max_age_months(self, queryset, _, value):
        if value is not None:
            today = date.today()
            value += 1
            min_birth_date = date(
                year=today.year - value // 12,
                month=today.month - value % 12,
                day=today.day
            )
            queryset = queryset.filter(birthday__gte=min_birth_date)
        return queryset

    def filter_by_has_mother(self, queryset, _, value):
        if value is None:
            return queryset

        if value:
            return queryset.filter(mother__isnull=False)
        else:
            return queryset.filter(mother__isnull=True)


    def filter_by_has_father(self, queryset, _, value):
        if value is None:
            return queryset

        if value:
            return queryset.filter(father__isnull=False)
        else:
            return queryset.filter(father__isnull=True)

    class Meta:
        model = Cat
        fields = (
            'gender', 'status', 'is_sterilized', 'breed_id', 'owner_id', 'current_weight_min',
            'current_weight_max', 'min_age_months', 'max_age_months', 'has_mother', 'has_father',
        )
