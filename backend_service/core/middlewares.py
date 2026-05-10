from urllib.parse import parse_qs

import jwt
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

from backend_service import settings

User = get_user_model()

class JWTAuthMiddleware(BaseMiddleware):
    """
    Middleware для аутентификации пользователя по JWT токену через query `?token=...` или Bearer токен в заголовках.
    """

    @staticmethod
    @database_sync_to_async
    def get_user_object(user_id: int) -> User | AnonymousUser:
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return AnonymousUser()

    @staticmethod
    def get_user_id_from_token(token: str) -> int | None:
        try:
            decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            return decoded.get('user_id', None)
        except (jwt.InvalidSignatureError, jwt.ExpiredSignatureError, jwt.DecodeError):
            return None

    async def __call__(self, scope, receive, send):
        token: str | None = None

        headers = dict(scope.get('headers', []))
        auth_header = headers.get(b'authorization', b'').decode('utf8')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]

        if token is None:
            token_list = parse_qs(scope.get('query_string', b'').decode("utf8")).get('token', [])
            if len(token_list) != 0:
                token = token_list[0]
                if token.startswith('Bearer '):
                    token = token[7:]

        if token:
            user_id = self.get_user_id_from_token(token)
            scope['user'] = await self.get_user_object(user_id)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)
