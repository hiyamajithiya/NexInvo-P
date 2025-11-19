"""
Fix the broken ViewSet definitions
"""

with open('api/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken ViewSet class definitions
fixes = [
    ('class ClientViewSet(viewsets.Modeldef perform_create(self, serializer):', 'class ClientViewSet(viewsets.ModelViewSet):\n    serializer_class = ClientSerializer\n    permission_classes = [IsAuthenticated]\n\n    def get_queryset(self):\n        return Client.objects.filter(organization=self.request.organization)\n\n    def perform_create(self, serializer):'),
    ('class ServiceItemViewSet(viewsets.Modeldef perform_create(self, serializer):', 'class ServiceItemViewSet(viewsets.ModelViewSet):\n    serializer_class = ServiceItemSerializer\n    permission_classes = [IsAuthenticated]\n\n    def get_queryset(self):\n        return ServiceItem.objects.filter(organization=self.request.organization, is_active=True)\n\n    def perform_create(self, serializer):'),
    ('class PaymentTermViewSet(viewsets.Modeldef perform_create(self, serializer):', 'class PaymentTermViewSet(viewsets.ModelViewSet):\n    serializer_class = PaymentTermSerializer\n    permission_classes = [IsAuthenticated]\n\n    def get_queryset(self):\n        return PaymentTerm.objects.filter(organization=self.request.organization, is_active=True)\n\n    def perform_create(self, serializer):'),
]

for old, new in fixes:
    content = content.replace(old, new)

with open('api/views.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("[OK] ViewSets fixed!")
