from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """Default pagination for list endpoints."""
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class LargePagination(PageNumberPagination):
    """For endpoints that return larger datasets (e.g., reports, exports)."""
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class SmallPagination(PageNumberPagination):
    """For endpoints with small result sets (e.g., dropdown options)."""
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50
