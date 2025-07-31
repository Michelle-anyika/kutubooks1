#!/bin/bash

echo "=== Kutubooks Deployment Test ==="

# Test individual containers
echo "Testing Web01..."
curl -f http://web01:8080/health || echo "Web01 health check failed"
curl -f http://web01:8080/ || echo "Web01 homepage failed"

echo "Testing Web02..."
curl -f http://web02:8080/health || echo "Web02 health check failed"
curl -f http://web02:8080/ || echo "Web02 homepage failed"

# Test load balancer
echo "Testing Load Balancer..."
for i in {1..5}; do
  echo "Request $i:"
  curl -s http://lb01/health
done

# Test API endpoints
echo "Testing API endpoints..."
curl -X GET http://lb01/stories
curl -X GET http://lb01/users

echo "=== Test Complete ==="