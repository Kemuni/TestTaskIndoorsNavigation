from datetime import date

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import InMemoryUploadedFile
from rest_framework import serializers, pagination

from backend_service.settings import PUBLIC_S3_ENDPOINT_URL, AWS_S3_ENDPOINT_URL
from cats.models import Breed, Cat, CatImage
from core.serializers import BaseResponseSerializer


class BreedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Breed
        fields = ('id', 'name', 'description')


class BreedResponseSerializer(BaseResponseSerializer):
    data = BreedSerializer()

class BreedListResponseSerializer(BaseResponseSerializer):
    data = BreedSerializer(many=True)


class CatImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CatImage
        fields = ('id', 'image_url', 'is_main', 'uploaded_at')

    @staticmethod
    def get_image_url(obj) -> str:
        # HACK - почему-то при любых настройках она добавляет https:// перед всей ссылкой
        return obj.image.url.replace(AWS_S3_ENDPOINT_URL, PUBLIC_S3_ENDPOINT_URL).split('://', 1)[1] if obj.image else None

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
