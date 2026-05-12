from datetime import date

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import InMemoryUploadedFile
from rest_framework import serializers, pagination

from cats.models import Breed, Cat, CatImage, FavouriteCat
from core.serializers import BaseResponseSerializer
from core.utils.get_s3_image_url import get_s3_image_url


class BreedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Breed
        fields = ('id', 'name', 'description', 'hair_type')


class BreedResponseSerializer(BaseResponseSerializer):
    data = BreedSerializer()


class CatImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CatImage
        fields = ('id', 'image_url', 'is_main', 'uploaded_at')

    @staticmethod
    def get_image_url(obj) -> str:
        return get_s3_image_url(obj, 'image')

class CatImageResponseSerializer(BaseResponseSerializer):
    data = CatImageSerializer(many=True)


class CatImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField(required=True, allow_null=False, write_only=True)
    is_main_image = serializers.BooleanField(required=True, allow_null=False, write_only=True)

    @staticmethod
    def validate_image(value: InMemoryUploadedFile):
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Image size must be less than 5MB")

        allowed_formats = {'image/jpeg', 'image/png', 'image/webp'}
        if value.content_type not in allowed_formats:
            raise serializers.ValidationError("Image format must be JPEG, PNG or WebP")

        return value



class CatOwnerSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = get_user_model()
        fields = ('id', 'email', 'first_name', 'last_name', 'image_url')

    @staticmethod
    def get_image_url(obj) -> str | None:
        return get_s3_image_url(obj, 'image')


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
    images = CatImageSerializer(many=True, read_only=True)

    class Meta:
        model = Cat
        fields = (
            'id', 'name', 'birthday', 'owner', 'gender', 'color', 'breed', 'current_weight', 'birth_weight',
            'is_sterilized', 'description', 'mother', 'father', 'status', 'created_at', 'updated_at',
            'age', 'age_months', 'price', 'images',
        )
        depth = 1


class CatResponseSerializer(BaseResponseSerializer):
    data = CatReadSerializer()


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


class FavouriteCatRequestSerializer(serializers.Serializer):
    cat_id = serializers.PrimaryKeyRelatedField(
        source='cat', write_only=True,
        queryset=Cat.objects.all(),
        allow_null=False, required=True,
    )


class ReadFavouriteCatSerializer(serializers.ModelSerializer):
    cat = CatReadSerializer(read_only=True)

    class Meta:
        model = FavouriteCat
        fields = ('cat', 'uploaded_at')


class FavouriteCatResponseSerializer(BaseResponseSerializer):
    data = ReadFavouriteCatSerializer()
