import requests
import sys
import time
from datetime import datetime

class AuraAPITester:
    def __init__(self, base_url="https://music-trend-rnn.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, timeout=30):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            start_time = time.time()
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, headers=headers, timeout=timeout)

            elapsed = time.time() - start_time
            print(f"   Response time: {elapsed:.2f}s")

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error details: {error_detail}")
                except:
                    print(f"   Response text: {response.text}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timed out after {timeout}s")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        if success:
            print(f"   Health response: {response}")
            if isinstance(response, dict):
                status_ok = response.get('status') == 'ok'
                youtube_key = response.get('youtube_key', False)
                print(f"   Status OK: {status_ok}")
                print(f"   YouTube Key configured: {youtube_key}")
                return status_ok and youtube_key
        return False

    def test_analyze_trend(self):
        """Test analyze-trend endpoint (takes 10-30 seconds)"""
        print("\n⚠️  Note: analyze-trend endpoint takes 10-30 seconds due to YouTube API calls")
        success, response = self.run_test(
            "Analyze Trend",
            "GET",
            "analyze-trend",
            200,
            timeout=45  # Extended timeout for this endpoint
        )
        if success and isinstance(response, dict):
            print(f"   Response keys: {list(response.keys())}")
            
            # Check required fields
            required_fields = ['current', 'genres', 'viralPredictions', 'hiddenState', 
                             'topShorts', 'dataWindows', 'genreForecast']
            missing_fields = []
            for field in required_fields:
                if field not in response:
                    missing_fields.append(field)
            
            if missing_fields:
                print(f"   ❌ Missing required fields: {missing_fields}")
                return False
            
            # Validate current track
            current = response.get('current', {})
            if current.get('title') and current.get('channel'):
                print(f"   ✅ Current track: {current.get('title')} by {current.get('channel')}")
            else:
                print(f"   ❌ Invalid current track data: {current}")
                return False
            
            # Validate viral predictions
            predictions = response.get('viralPredictions', [])
            print(f"   ✅ Viral predictions count: {len(predictions)}")
            
            # Validate hidden state
            hidden_state = response.get('hiddenState', [])
            if len(hidden_state) == 4:
                print(f"   ✅ Hidden state: {hidden_state}")
            else:
                print(f"   ❌ Invalid hidden state: {hidden_state}")
                return False
            
            # Validate data windows
            windows = response.get('dataWindows', {})
            print(f"   ✅ Data windows: {windows}")
            
            return True
        return False

    def test_scan_history(self):
        """Test scan-history endpoint"""
        success, response = self.run_test(
            "Scan History",
            "GET",
            "scan-history",
            200
        )
        if success and isinstance(response, dict):
            scans = response.get('scans', [])
            print(f"   ✅ Scan history count: {len(scans)}")
            if scans:
                latest_scan = scans[0]
                print(f"   Latest scan: {latest_scan.get('scannedAt', 'No timestamp')}")
            return True
        return False

def main():
    print("🎵 AURA Music Trend Intelligence API Testing")
    print("=" * 50)
    
    # Setup
    tester = AuraAPITester()
    
    # Test health endpoint first
    print("\n📊 Testing Backend Health...")
    health_ok = tester.test_health()
    if not health_ok:
        print("❌ Health check failed - stopping tests")
        return 1
    
    # Test scan history (should work even without data)
    print("\n📚 Testing Scan History...")
    history_ok = tester.test_scan_history()
    
    # Test analyze-trend (the main functionality)
    print("\n🔍 Testing Trend Analysis...")
    analyze_ok = tester.test_analyze_trend()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.tests_passed == tester.tests_run:
        print("✅ All backend tests passed!")
        return 0
    else:
        print("❌ Some backend tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())