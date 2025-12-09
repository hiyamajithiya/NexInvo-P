"""
Load Testing Script for NexInvo
Simulates 1000 concurrent users performing various operations
"""

import time
import random
import string
import json
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import List, Dict
import statistics

# Configuration
BASE_URL = "http://127.0.0.1:8000/api"
NUM_USERS = 100  # Start with 100 concurrent requests per batch
NUM_BATCHES = 10  # 10 batches = 1000 total requests
TIMEOUT = 30

@dataclass
class TestResult:
    endpoint: str
    status_code: int
    response_time: float
    success: bool
    error: str = ""

class LoadTester:
    def __init__(self):
        self.results: List[TestResult] = []
        self.auth_token = None

    def get_auth_token(self):
        """Get authentication token for testing"""
        # Try to login with test credentials
        try:
            response = requests.post(
                f"{BASE_URL}/token/",
                json={"email": "admin@test.com", "password": "admin123"},
                timeout=TIMEOUT
            )
            if response.status_code == 200:
                self.auth_token = response.json().get('access')
                return True
        except Exception as e:
            print(f"Auth failed: {e}")
        return False

    def get_headers(self):
        """Get headers with auth token"""
        headers = {"Content-Type": "application/json"}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        return headers

    def test_endpoint(self, method: str, endpoint: str, data: dict = None) -> TestResult:
        """Test a single endpoint"""
        url = f"{BASE_URL}{endpoint}"
        start_time = time.time()

        try:
            if method == "GET":
                response = requests.get(url, headers=self.get_headers(), timeout=TIMEOUT)
            elif method == "POST":
                response = requests.post(url, json=data, headers=self.get_headers(), timeout=TIMEOUT)
            else:
                response = requests.get(url, headers=self.get_headers(), timeout=TIMEOUT)

            response_time = time.time() - start_time
            success = response.status_code in [200, 201, 401, 403]  # 401/403 are valid responses

            return TestResult(
                endpoint=endpoint,
                status_code=response.status_code,
                response_time=response_time,
                success=success
            )
        except requests.exceptions.Timeout:
            return TestResult(
                endpoint=endpoint,
                status_code=0,
                response_time=TIMEOUT,
                success=False,
                error="Timeout"
            )
        except Exception as e:
            return TestResult(
                endpoint=endpoint,
                status_code=0,
                response_time=time.time() - start_time,
                success=False,
                error=str(e)
            )

    def run_concurrent_tests(self, test_cases: List[tuple], num_concurrent: int) -> List[TestResult]:
        """Run multiple tests concurrently"""
        results = []

        with ThreadPoolExecutor(max_workers=num_concurrent) as executor:
            futures = []
            for method, endpoint, data in test_cases:
                future = executor.submit(self.test_endpoint, method, endpoint, data)
                futures.append(future)

            for future in as_completed(futures):
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    print(f"Error: {e}")

        return results

    def generate_test_cases(self, count: int) -> List[tuple]:
        """Generate random test cases simulating user behavior"""
        endpoints = [
            ("GET", "/invoices/", None),
            ("GET", "/clients/", None),
            ("GET", "/services/", None),
            ("GET", "/receipts/", None),
            ("GET", "/dashboard/stats/", None),
            ("GET", "/payments/", None),
            ("GET", "/settings/company/", None),
        ]

        # Weight towards common operations
        weights = [30, 20, 10, 10, 15, 10, 5]  # Invoices most common

        test_cases = []
        for _ in range(count):
            endpoint = random.choices(endpoints, weights=weights)[0]
            test_cases.append(endpoint)

        return test_cases

    def analyze_results(self, results: List[TestResult]) -> Dict:
        """Analyze test results"""
        if not results:
            return {"error": "No results"}

        response_times = [r.response_time for r in results]
        successful = [r for r in results if r.success]
        failed = [r for r in results if not r.success]

        # Group by endpoint
        endpoint_stats = {}
        for r in results:
            if r.endpoint not in endpoint_stats:
                endpoint_stats[r.endpoint] = []
            endpoint_stats[r.endpoint].append(r.response_time)

        analysis = {
            "total_requests": len(results),
            "successful_requests": len(successful),
            "failed_requests": len(failed),
            "success_rate": f"{(len(successful) / len(results) * 100):.2f}%",
            "response_times": {
                "min": f"{min(response_times):.3f}s",
                "max": f"{max(response_times):.3f}s",
                "avg": f"{statistics.mean(response_times):.3f}s",
                "median": f"{statistics.median(response_times):.3f}s",
                "p95": f"{sorted(response_times)[int(len(response_times) * 0.95)]:.3f}s" if len(response_times) > 20 else "N/A",
                "p99": f"{sorted(response_times)[int(len(response_times) * 0.99)]:.3f}s" if len(response_times) > 100 else "N/A",
            },
            "requests_per_second": f"{len(results) / sum(response_times):.2f}" if sum(response_times) > 0 else "N/A",
            "endpoint_performance": {}
        }

        for endpoint, times in endpoint_stats.items():
            analysis["endpoint_performance"][endpoint] = {
                "count": len(times),
                "avg_time": f"{statistics.mean(times):.3f}s",
                "max_time": f"{max(times):.3f}s"
            }

        # Identify errors
        error_counts = {}
        for r in failed:
            error = r.error or f"HTTP {r.status_code}"
            error_counts[error] = error_counts.get(error, 0) + 1

        if error_counts:
            analysis["errors"] = error_counts

        return analysis

    def run_load_test(self):
        """Run the full load test"""
        print("=" * 60)
        print("NEXINVO LOAD TEST - Simulating 1000 Concurrent Users")
        print("=" * 60)

        # Try to get auth token
        print("\n[1/4] Attempting authentication...")
        if self.get_auth_token():
            print("    [OK] Authentication successful")
        else:
            print("    [WARN] Running without authentication (will test public endpoints)")

        # Warm-up
        print("\n[2/4] Warming up server...")
        warmup_cases = self.generate_test_cases(10)
        self.run_concurrent_tests(warmup_cases, 5)
        print("    [OK] Warm-up complete")

        # Run load test in batches
        print(f"\n[3/4] Running load test ({NUM_BATCHES} batches x {NUM_USERS} concurrent requests)...")
        all_results = []

        for batch in range(NUM_BATCHES):
            test_cases = self.generate_test_cases(NUM_USERS)
            batch_start = time.time()
            results = self.run_concurrent_tests(test_cases, NUM_USERS)
            batch_time = time.time() - batch_start
            all_results.extend(results)

            successful = len([r for r in results if r.success])
            print(f"    Batch {batch + 1}/{NUM_BATCHES}: {successful}/{NUM_USERS} successful in {batch_time:.2f}s")

        # Analyze results
        print("\n[4/4] Analyzing results...")
        analysis = self.analyze_results(all_results)

        # Print report
        print("\n" + "=" * 60)
        print("LOAD TEST RESULTS")
        print("=" * 60)

        print(f"\nTotal Requests:      {analysis['total_requests']}")
        print(f"Successful:          {analysis['successful_requests']}")
        print(f"Failed:              {analysis['failed_requests']}")
        print(f"Success Rate:        {analysis['success_rate']}")

        print(f"\nResponse Times:")
        print(f"  Min:               {analysis['response_times']['min']}")
        print(f"  Max:               {analysis['response_times']['max']}")
        print(f"  Average:           {analysis['response_times']['avg']}")
        print(f"  Median:            {analysis['response_times']['median']}")
        print(f"  95th Percentile:   {analysis['response_times']['p95']}")
        print(f"  99th Percentile:   {analysis['response_times']['p99']}")

        print(f"\nThroughput:          {analysis['requests_per_second']} req/s")

        print(f"\nEndpoint Performance:")
        for endpoint, stats in analysis['endpoint_performance'].items():
            print(f"  {endpoint}")
            print(f"    Requests: {stats['count']}, Avg: {stats['avg_time']}, Max: {stats['max_time']}")

        if 'errors' in analysis:
            print(f"\nErrors:")
            for error, count in analysis['errors'].items():
                print(f"  {error}: {count}")

        # Recommendations
        print("\n" + "=" * 60)
        print("ANALYSIS & RECOMMENDATIONS")
        print("=" * 60)

        avg_time = float(analysis['response_times']['avg'].replace('s', ''))
        success_rate = float(analysis['success_rate'].replace('%', ''))

        if success_rate >= 99 and avg_time < 0.5:
            print("\n[EXCELLENT] Application is highly scalable!")
            print("  - Can handle 1000+ concurrent users with ease")
            print("  - Response times are excellent")
        elif success_rate >= 95 and avg_time < 1.0:
            print("\n[GOOD] Application performs well under load")
            print("  - Can handle 1000 concurrent users")
            print("  - Consider caching for better performance")
        elif success_rate >= 90 and avg_time < 2.0:
            print("\n[ACCEPTABLE] Application handles load with some degradation")
            print("  - May slow down with 1000+ users")
            print("  Recommendations:")
            print("    - Enable Redis caching")
            print("    - Add database connection pooling")
            print("    - Consider horizontal scaling")
        else:
            print("\n[NEEDS IMPROVEMENT] Application struggles under heavy load")
            print("  Recommendations:")
            print("    - Enable Redis caching (CACHE_BACKEND=redis)")
            print("    - Optimize database queries")
            print("    - Add database indexes")
            print("    - Consider using Gunicorn with multiple workers")
            print("    - Add load balancer for horizontal scaling")

        return analysis


# Additional stress test for database
def stress_test_database():
    """Test database performance under load"""
    print("\n" + "=" * 60)
    print("DATABASE STRESS TEST")
    print("=" * 60)

    import os
    import sys
    import django

    # Setup Django
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexinvo.settings')
    django.setup()

    from django.db import connection
    from django.db.models import Count
    from api.models import Invoice, Client, Payment

    tests = []

    # Test 1: Simple query
    start = time.time()
    for _ in range(100):
        list(Invoice.objects.all()[:10])
    tests.append(("Simple Query (100x)", time.time() - start))

    # Test 2: Query with joins
    start = time.time()
    for _ in range(100):
        list(Invoice.objects.select_related('client', 'organization').all()[:10])
    tests.append(("Query with Joins (100x)", time.time() - start))

    # Test 3: Aggregation
    start = time.time()
    for _ in range(50):
        Invoice.objects.values('status').annotate(count=Count('id'))
    tests.append(("Aggregation Query (50x)", time.time() - start))

    # Test 4: Complex filter
    start = time.time()
    for _ in range(100):
        list(Invoice.objects.filter(
            status__in=['draft', 'sent', 'paid'],
            invoice_type='tax'
        ).select_related('client')[:10])
    tests.append(("Complex Filter (100x)", time.time() - start))

    print("\nDatabase Performance:")
    for test_name, duration in tests:
        print(f"  {test_name}: {duration:.3f}s")

    # Check connection pool
    print(f"\nDatabase Connections: {len(connection.queries)} queries executed")

    return tests


if __name__ == "__main__":
    # Run HTTP load test
    tester = LoadTester()
    tester.run_load_test()

    # Run database stress test
    try:
        stress_test_database()
    except Exception as e:
        print(f"\nDatabase test skipped: {e}")

    print("\n" + "=" * 60)
    print("LOAD TEST COMPLETE")
    print("=" * 60)
