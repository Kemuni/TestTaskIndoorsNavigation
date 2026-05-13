from django.db import models


class Dialog(models.Model):
    """ Личный диалог между двумя пользователями """
    # user_1.id > user_2.id ВСЕГДА
    user_1 = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='dialogs_as_first')
    user_2 = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='dialogs_as_second')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user_1', 'user_2')

    def save(self, *args, **kwargs):
        if self.user_1 == self.user_2:
            raise ValueError("Users must be different")

        # Определяем порядок для упрощения поиска диалога
        if self.user_2.id > self.user_1.id:
            self.user_1, self.user_2 = self.user_1, self.user_2
        super().save(*args, **kwargs)

    def __str__(self):
        return f'Dialog {self.user_1} - {self.user_2}'


class Message(models.Model):
    """ Сообщение в диалоге """
    dialog = models.ForeignKey(Dialog, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey('users.User', on_delete=models.CASCADE)
    content = models.TextField(max_length=800)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(default=None, blank=True, null=True)

    class Meta:
        ordering = ('-created_at',)
        indexes = [
            models.Index(fields=['dialog', '-created_at']),
        ]

    def __str__(self):
        return f'Message {self.sender} at {self.created_at}'
