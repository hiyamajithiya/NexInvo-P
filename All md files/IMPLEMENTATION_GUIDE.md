# NexInvo - Complete Implementation Guide

## 🚀 Step-by-Step Implementation

This guide provides the exact steps to build NexInvo from scratch.

---

## Phase 1: Setup (Day 1)

### 1.1 Install Prerequisites

```bash
# Python 3.10+
python --version

# Node.js 18+
node --version
npm --version

# PostgreSQL 14+
psql --version

# Redis (optional, for background tasks)
redis-server --version
```

### 1.2 Create Project Structure

```bash
# Create main directory
mkdir NexInvo
cd NexInvo

# Copy CA logo
cp "/path/to/CA India Logo-.jpg" assets/ca_logo.jpg

# Run setup script
python setup.py
```

---

## Phase 2: Backend Development (Days 2-5)

### 2.1 Initialize Django Project

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install Django
pip install Django djangorestframework

# Create project
django-admin startproject nexinvo .

# Create apps
python manage.py startapp invoices
python manage.py startapp clients
python manage.py startapp users
python manage.py startapp reports
```

### 2.2 Configure Database (settings.py)

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'nexinvo',
        'USER': 'postgres',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

### 2.3 Install All Dependencies

```bash
pip install -r requirements.txt
```

### 2.4 Create Models

**File: invoices/models.py**
```python
from django.db import models
import uuid

class Client(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    client_code = models.CharField(max_length=20, unique=True)
    client_name = models.CharField(max_length=200)
    billing_address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    state_code = models.CharField(max_length=2)
    gstin = models.CharField(max_length=15, null=True, blank=True)
    pan = models.CharField(max_length=10, null=True, blank=True)
    contact_person = models.CharField(max_length=200, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    mobile = models.CharField(max_length=15, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'clients'
        ordering = ['-created_at']

    def __str__(self):
        return self.client_name

class Invoice(models.Model):
    INVOICE_TYPE_CHOICES = [
        ('proforma', 'Proforma'),
        ('tax', 'Tax Invoice'),
    ]

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('paid', 'Paid'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    invoice_number = models.CharField(max_length=50, unique=True)
    invoice_series = models.CharField(max_length=50)
    financial_year = models.CharField(max_length=10)
    invoice_date = models.DateField()
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='invoices')
    invoice_type = models.CharField(max_length=10, choices=INVOICE_TYPE_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    place_of_supply_state_code = models.CharField(max_length=2)
    payment_terms = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    round_off = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    created_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'invoices'
        ordering = ['-invoice_date', '-created_at']

    def __str__(self):
        return self.invoice_number

class InvoiceItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    sl_no = models.IntegerField()
    description = models.TextField()
    hsn_sac = models.CharField(max_length=20)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    rate = models.DecimalField(max_digits=12, decimal_places=2)
    discount_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    taxable_amount = models.DecimalField(max_digits=12, decimal_places=2)
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2)
    cgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    igst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = 'invoice_items'
        ordering = ['sl_no']

    def __str__(self):
        return f"{self.invoice.invoice_number} - Item {self.sl_no}"
```

### 2.5 Create Serializers

**File: invoices/serializers.py**
```python
from rest_framework import serializers
from .models import Client, Invoice, InvoiceItem

class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = '__all__'

class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = '__all__'

class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True)
    client_name = serializers.CharField(source='client.client_name', read_only=True)

    class Meta:
        model = Invoice
        fields = '__all__'

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        invoice = Invoice.objects.create(**validated_data)

        for item_data in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item_data)

        return invoice
```

### 2.6 Create Views

**File: invoices/views.py**
```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Client, Invoice
from .serializers import ClientSerializer, InvoiceSerializer

class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer

    @action(detail=True, methods=['get'])
    def invoices(self, request, pk=None):
        client = self.get_object()
        invoices = client.invoices.all()
        serializer = InvoiceSerializer(invoices, many=True)
        return Response(serializer.data)

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        invoice = self.get_object()
        # PDF generation logic here
        return Response({'pdf_url': '/path/to/pdf'})

    @action(detail=True, methods=['post'])
    def email(self, request, pk=None):
        invoice = self.get_object()
        # Email sending logic here
        return Response({'message': 'Email sent successfully'})
```

### 2.7 Setup URLs

**File: nexinvo/urls.py**
```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from invoices.views import ClientViewSet, InvoiceViewSet

router = DefaultRouter()
router.register(r'clients', ClientViewSet)
router.register(r'invoices', InvoiceViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('admin/', admin.site.urls),
]
```

### 2.8 Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

---

## Phase 3: Frontend Development (Days 6-10)

### 3.1 Create React App

```bash
cd frontend

# Create app with TypeScript
npx create-react-app . --template typescript

# Install dependencies
npm install axios react-router-dom @tanstack/react-query react-icons
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 3.2 Configure Tailwind

**File: tailwind.config.js**
```javascript
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**File: src/index.css**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 3.3 Setup API Service

**File: src/services/api.ts**
```typescript
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### 3.4 Create TypeScript Types

**File: src/types/invoice.ts**
```typescript
export interface Client {
  id: string;
  client_code: string;
  client_name: string;
  billing_address: string;
  city: string;
  state: string;
  gstin?: string;
  email?: string;
  mobile?: string;
}

export interface InvoiceItem {
  sl_no: number;
  description: string;
  hsn_sac: string;
  quantity: number;
  rate: number;
  gst_rate: number;
  taxable_amount: number;
  total_amount: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  client: Client;
  client_name: string;
  invoice_type: 'proforma' | 'tax';
  status: 'draft' | 'sent' | 'paid';
  items: InvoiceItem[];
  total_amount: number;
}
```

### 3.5 Create Components

**File: src/components/InvoiceList.tsx**
```typescript
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Invoice } from '../types/invoice';

const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    api.get('/invoices/').then(res => setInvoices(res.data));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Invoices</h1>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Invoice No</th>
            <th className="p-2">Client</th>
            <th className="p-2">Date</th>
            <th className="p-2">Amount</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map(inv => (
            <tr key={inv.id}>
              <td className="p-2">{inv.invoice_number}</td>
              <td className="p-2">{inv.client_name}</td>
              <td className="p-2">{inv.invoice_date}</td>
              <td className="p-2">₹{inv.total_amount}</td>
              <td className="p-2">{inv.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InvoiceList;
```

### 3.6 Setup Routing

**File: src/App.tsx**
```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import InvoiceList from './components/InvoiceList';
import ClientList from './components/ClientList';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/invoices" element={<InvoiceList />} />
        <Route path="/clients" element={<ClientList />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

## Phase 4: Integration & Testing (Days 11-12)

### 4.1 Connect Frontend to Backend

```bash
# Backend runs on:
http://localhost:8000

# Frontend runs on:
http://localhost:3000

# Set in frontend/.env:
REACT_APP_API_URL=http://localhost:8000/api
```

### 4.2 Enable CORS in Django

**File: backend/nexinvo/settings.py**
```python
INSTALLED_APPS = [
    ...
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    ...
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]
```

### 4.3 Test API

```bash
# Test backend
curl http://localhost:8000/api/clients/

# Test frontend
# Open http://localhost:3000 in browser
```

---

## Phase 5: Deployment (Days 13-14)

### 5.1 Production Settings

**Backend:**
- Set `DEBUG = False`
- Configure `ALLOWED_HOSTS`
- Setup PostgreSQL connection
- Configure static files
- Setup Gunicorn

**Frontend:**
```bash
npm run build
# Serve build/ folder with Nginx
```

### 5.2 Deploy to Server

See DEPLOYMENT.md for detailed steps.

---

## 📝 Next Steps

1. Complete all model implementations
2. Add PDF generation service
3. Implement email functionality
4. Create remaining frontend components
5. Add authentication
6. Write tests
7. Deploy to production

---

## 📞 Support

For detailed implementation of specific features, refer to individual documentation files in the `docs/` folder.

**Ready to start? Begin with Phase 1!**
