from datetime import date

from django.contrib.auth import get_user_model
from rest_framework import serializers, pagination

from cats.models import Breed, Cat
from core.serializers import BaseResponseSerializer


class BreedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Breed
        fields = ('id', 'name', 'description')


class BreedResponseSerializer(BaseResponseSerializer):
    data = BreedSerializer()

class BreedListResponseSerializer(BaseResponseSerializer):
    data = BreedSerializer(many=True)


class CatOwnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ('id', 'email', 'first_name', 'last_name')


class ShortCatSerializer(serializers.ModelSerializer):
    breed = BreedSerializer(read_only=True)

    class Meta:
        model = Cat
        fields = ('id', 'name', 'breed', 'gender', 'color', 'age', 'age_months')


class CatReadSerializer(serializers.ModelSerializer):
    mother = ShortCatSerializer(read_only=True)
    father = ShortCatSerializer(read_only=True)
    breed = BreedSerializer(read_only=True)
    owner = CatOwnerSerializer(read_only=True)

    class Meta:
        model = Cat
        fields = (
            'id', 'name', 'birthday', 'owner', 'gender', 'color', 'breed', 'current_weight', 'birth_weight',
            'is_sterilized', 'description', 'mother', 'father', 'status', 'created_at', 'updated_at',
            'age', 'age_months', 'price',
        )
        depth = 1


class CatResponseSerializer(BaseResponseSerializer):
    data = CatReadSerializer()


class CatListResponseSerializer(BaseResponseSerializer):
    data = CatReadSerializer(many=True)

class CatListWithPaginationResponseSerializer(pagination.PageNumberPagination):
    results = CatReadSerializer(many=True)


class CatWriteSerializer(CatReadSerializer):
    mother_id = serializers.PrimaryKeyRelatedField(
        source='mother', write_only=True,
        queryset=Cat.objects.all(),
        allow_null=True, required=False,
    )
    father_id = serializers.PrimaryKeyRelatedField(
        source='father', write_only=True,
        queryset=Cat.objects.all(),
        allow_null=True, required=False,
    )
    breed_id = serializers.PrimaryKeyRelatedField(
        source='breed', write_only=True,
        queryset=Breed.objects.all(),
        allow_null=False, required=True,
    )
    owner = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Cat
        fields = (
            'id', 'name', 'birthday', 'owner', 'gender', 'color', 'breed', 'breed_id', 'current_weight', 'birth_weight',
            'is_sterilized', 'description', 'mother', 'mother_id', 'father', 'father_id', 'status',
            'created_at', 'updated_at', 'age', 'age_months', 'price',
        )
        read_only_fields = ('id',)

    @staticmethod
    def validate_birthday(value):
        if value > date.today():
            raise serializers.ValidationError("birthday cannot be in the future")

        return value
