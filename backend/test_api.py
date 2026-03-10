import urllib.request
import urllib.error

try:
    req = urllib.request.Request("http://127.0.0.1:8000/api/v1/consumption/requests")
    response = urllib.request.urlopen(req)
    print("STATUS", response.getcode())
except urllib.error.HTTPError as e:
    print("HTTPError", e.code)
except Exception as e:
    print("Exception", str(e))
