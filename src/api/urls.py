from django.urls import path

from . import endpoints


urlpatterns = [
    path("login/", endpoints.api_login, name="api_login"),
    path("logout/", endpoints.api_logout, name="api_logout"),
    path("state/", endpoints.api_state, name="api_state"),
    path(
        "public/tournaments/",
        endpoints.api_public_tournaments,
        name="api_public_tournaments",
    ),
    path(
        "public/tournaments/<int:tournament_id>/",
        endpoints.api_public_tournament_detail,
        name="api_public_tournament_detail",
    ),
    path(
        "public/dashboard-stats/",
        endpoints.api_public_dashboard_stats,
        name="api_public_dashboard_stats",
    ),
    path("tournaments/", endpoints.api_create_tournament, name="api_create_tournament"),
    path(
        "tournaments/<int:tournament_id>/activate/",
        endpoints.api_activate_tournament,
        name="api_activate_tournament",
    ),
    path("schools/", endpoints.api_schools, name="api_schools"),
    path("divisions/<int:division_id>/teams/", endpoints.api_add_team, name="api_add_team"),
    path(
        "divisions/<int:division_id>/generate-bracket/",
        endpoints.api_generate_bracket,
        name="api_generate_bracket",
    ),
    path(
        "divisions/<int:division_id>/reset-bracket/",
        endpoints.api_reset_bracket,
        name="api_reset_bracket",
    ),
    path("teams/<int:team_id>/", endpoints.api_team_detail, name="api_team_detail"),
    path("games/<int:game_id>/result/", endpoints.api_game_result, name="api_game_result"),
    path("scan/", endpoints.api_scan_score, name="api_scan_score"),
    path("users/", endpoints.api_users, name="api_users"),
    path("users/<int:user_id>/", endpoints.api_user_detail, name="api_user_detail"),
]
