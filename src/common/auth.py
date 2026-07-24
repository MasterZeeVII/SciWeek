"""Session-cookie auth against the schema `users` table.

This is not django.contrib.auth — the users table is part of the fixed
schema, so login state is just `user_id` in the Django session.
"""

from .models import SystemUser


def get_current_user(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    cached = getattr(request, "_sciweek_user", None)
    if cached and cached.id == user_id:
        return cached
    try:
        user = SystemUser.objects.get(id=user_id, is_active=True)
    except SystemUser.DoesNotExist:
        request.session.flush()
        return None
    request._sciweek_user = user
    return user


def require_user(request):
    user = get_current_user(request)
    if not user:
        raise PermissionError("Login required.")
    return user


def require_role(request, *roles):
    """ADMIN is the wildcard role — it passes every gate without being
    listed. Other roles only pass the gates that name them."""
    user = require_user(request)
    if user.role == SystemUser.Role.ADMIN:
        return user
    if user.role not in roles:
        raise PermissionError("Permission denied.")
    return user
