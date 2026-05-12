from rest_framework.exceptions import ValidationError


def validate_id(number, field_name) -> int:
    """
    Validate `number` and raise a ValidationError if it is not a number or <= 0.
    :param number: Identifier.
    :param field_name: Field name of identifier.
    :returns: `number` in integer format.
    """
    if number is None:
        raise ValidationError(f'`{field_name}` (equal {number}) in the URL must be an integer')
    try:
        identifier = int(number)
    except ValueError:
        raise ValidationError(f'`{field_name}` (equal {number}) in the URL must be integer and greater than zero')
    if identifier <= 0:
        raise ValidationError(f'`{field_name}` (equal {number}) in the URL must be greater than zero')
    return identifier