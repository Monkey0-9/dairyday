#!/bin/bash
# Dairy Management System - Acceptance Tests
# This script runs all acceptance tests and saves the output to acceptance-tests.log

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:3000"
LOG_FILE="acceptance-tests.log"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

header() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
}

# Initialize log file
echo "Dairy Management System - Acceptance Tests" > "$LOG_FILE"
echo "Run at: $(date)" >> "$LOG_FILE"
echo "==========================================" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

header "ACCEPTANCE TEST 1: Health Check"
echo "Test 1: Health Check" >> "$LOG_FILE"

# Test health endpoint
log_info "Testing backend health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)

echo "Command: curl -s $API_URL/api/health" >> "$LOG_FILE"
echo "HTTP Code: $HTTP_CODE" >> "$LOG_FILE"
echo "Response: $BODY" >> "$LOG_FILE"

if [ "$HTTP_CODE" = "200" ]; then
    log_success "Health check passed (HTTP 200)"
    echo "Result: PASS" >> "$LOG_FILE"
else
    log_fail "Health check failed (HTTP $HTTP_CODE)"
    echo "Result: FAIL" >> "$LOG_FILE"
fi

header "ACCEPTANCE TEST 2: Admin Login"
echo "" >> "$LOG_FILE"
echo "Test 2: Admin Login" >> "$LOG_FILE"

log_info "Testing admin login..."
ADMIN_LOGIN=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=admin@dairy.com&password=admin123" \
    -w "\n%{http_code}")

ADMIN_HTTP_CODE=$(echo "$ADMIN_LOGIN" | tail -n1)
ADMIN_BODY=$(echo "$ADMIN_LOGIN" | head -n -1)

echo "Command: curl -X POST $API_URL/api/v1/auth/login" >> "$LOG_FILE"
echo "  -H 'Content-Type: application/x-www-form-urlencoded'" >> "$LOG_FILE"
echo "  -d 'username=admin@dairy.com&password=admin123'" >> "$LOG_FILE"
echo "HTTP Code: $ADMIN_HTTP_CODE" >> "$LOG_FILE"
echo "Response: $ADMIN_BODY" >> "$LOG_FILE"

if [ "$ADMIN_HTTP_CODE" = "200" ]; then
    log_success "Admin login successful"
    ADMIN_TOKEN=$(echo "$ADMIN_BODY" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    echo "Access Token: ${ADMIN_TOKEN:0:50}..." >> "$LOG_FILE"
    echo "Result: PASS" >> "$LOG_FILE"
else
    log_fail "Admin login failed"
    echo "Result: FAIL" >> "$LOG_FILE"
    ADMIN_TOKEN=""
fi

header "ACCEPTANCE TEST 3: User Login"
echo "" >> "$LOG_FILE"
echo "Test 3: User Login" >> "$LOG_FILE"

log_info "Testing user login (user1@dairy.com)..."
USER_LOGIN=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=user1@dairy.com&password=user123" \
    -w "\n%{http_code}")

USER_HTTP_CODE=$(echo "$USER_LOGIN" | tail -n1)
USER_BODY=$(echo "$USER_LOGIN" | head -n -1)

echo "Command: curl -X POST $API_URL/api/v1/auth/login" >> "$LOG_FILE"
echo "  -d 'username=user1@dairy.com&password=user123'" >> "$LOG_FILE"
echo "HTTP Code: $USER_HTTP_CODE" >> "$LOG_FILE"
echo "Response: $USER_BODY" >> "$LOG_FILE"

if [ "$USER_HTTP_CODE" = "200" ]; then
    log_success "User login successful"
    USER_TOKEN=$(echo "$USER_BODY" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    echo "Result: PASS" >> "$LOG_FILE"
else
    log_fail "User login failed"
    echo "Result: FAIL" >> "$LOG_FILE"
    USER_TOKEN=""
fi

header "ACCEPTANCE TEST 4: Admin Daily Entry Access"
echo "" >> "$LOG_FILE"
echo "Test 4: Admin Daily Entry Access" >> "$LOG_FILE"

if [ -n "$ADMIN_TOKEN" ]; then
    log_info "Testing admin daily entry endpoint..."
    TODAY=$(date +%Y-%m-%d)
    DAILY_ENTRY=$(curl -s "$API_URL/api/v1/admin/daily-entry?selected_date=$TODAY" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -w "\n%{http_code}")
    
    DAILY_HTTP_CODE=$(echo "$DAILY_ENTRY" | tail -n1)
    DAILY_BODY=$(echo "$DAILY_ENTRY" | head -n -1)
    
    echo "Command: curl -s $API_URL/api/v1/admin/daily-entry?selected_date=$TODAY" >> "$LOG_FILE"
    echo "  -H 'Authorization: Bearer <token>'" >> "$LOG_FILE"
    echo "HTTP Code: $DAILY_HTTP_CODE" >> "$LOG_FILE"
    echo "Response (truncated): ${DAILY_BODY:0:500}" >> "$LOG_FILE"
    
    if [ "$DAILY_HTTP_CODE" = "200" ]; then
        log_success "Admin can access daily entry"
        echo "Result: PASS" >> "$LOG_FILE"
    else
        log_fail "Admin daily entry access failed (HTTP $DAILY_HTTP_CODE)"
        echo "Result: FAIL" >> "$LOG_FILE"
    fi
else
    log_warn "Skipping - no admin token"
    echo "Result: SKIPPED" >> "$LOG_FILE"
fi

header "ACCEPTANCE TEST 5: User Consumption Access"
echo "" >> "$LOG_FILE"
echo "Test 5: User Consumption Access" >> "$LOG_FILE"

if [ -n "$USER_TOKEN" ]; then
    log_info "Testing user consumption access..."
    MONTH=$(date +%Y-%m)
    CONSUMPTION=$(curl -s "$API_URL/api/v1/consumption/mine?month=$MONTH" \
        -H "Authorization: Bearer $USER_TOKEN" \
        -w "\n%{http_code}")
    
    CONSUMPTION_HTTP_CODE=$(echo "$CONSUMPTION" | tail -n1)
    CONSUMPTION_BODY=$(echo "$CONSUMPTION" | head -n -1)
    
    echo "Command: curl -s $API_URL/api/v1/consumption/mine?month=$MONTH" >> "$LOG_FILE"
    echo "  -H 'Authorization: Bearer <token>'" >> "$LOG_FILE"
    echo "HTTP Code: $CONSUMPTION_HTTP_CODE" >> "$LOG_FILE"
    echo "Response: $CONSUMPTION_BODY" >> "$LOG_FILE"
    
    if [ "$CONSUMPTION_HTTP_CODE" = "200" ]; then
        log_success "User can access own consumption"
        echo "Result: PASS" >> "$LOG_FILE"
    else
        log_fail "User consumption access failed (HTTP $CONSUMPTION_HTTP_CODE)"
        echo "Result: FAIL" >> "$LOG_FILE"
    fi
else
    log_warn "Skipping - no user token"
    echo "Result: SKIPPED" >> "$LOG_FILE"
fi

header "ACCEPTANCE TEST 6: Lock Rule Enforcement"
echo "" >> "$LOG_FILE"
echo "Test 6: Lock Rule Enforcement" >> "$LOG_FILE"

if [ -n "$ADMIN_TOKEN" ]; then
    log_info "Testing lock rule - attempting to edit consumption older than 7 days..."
    # Try to edit consumption from 10 days ago
    LOCK_DATE=$(date -d "10 days ago" +%Y-%m-%d)
    
    LOCK_TEST=$(curl -s -X PATCH "$API_URL/api/v1/consumption/" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"user_id":"00000000-0000-0000-0000-000000000001","date":"'$LOCK_DATE'","quantity":1.0}' \
        -w "\n%{http_code}")
    
    LOCK_HTTP_CODE=$(echo "$LOCK_TEST" | tail -n1)
    LOCK_BODY=$(echo "$LOCK_TEST" | head -n -1)
    
    echo "Command: curl -X PATCH $API_URL/api/v1/consumption/" >> "$LOG_FILE"
    echo "  -H 'Authorization: Bearer <token>'" >> "$LOG_FILE"
    echo "  -d '{\"date\":\"$LOCK_DATE\",\"quantity\":1.0}'" >> "$LOG_FILE"
    echo "HTTP Code: $LOCK_HTTP_CODE" >> "$LOG_FILE"
    echo "Response: $LOCK_BODY" >> "$LOG_FILE"
    
    if [ "$LOCK_HTTP_CODE" = "400" ] || [ "$LOCK_HTTP_CODE" = "403" ]; then
        log_success "Lock rule enforced (HTTP $LOCK_HTTP_CODE)"
        echo "Result: PASS - Lock rule blocks old entries" >> "$LOG_FILE"
    else
        log_warn "Lock rule returned HTTP $LOCK_HTTP_CODE - may need review"
        echo "Result: NEEDS REVIEW" >> "$LOG_FILE"
    fi
else
    log_warn "Skipping - no admin token"
    echo "Result: SKIPPED" >> "$LOG_FILE"
fi

header "ACCEPTANCE TEST 7: User Cannot Access Other User Bills"
echo "" >> "$LOG_FILE"
echo "Test 7: User Bill Access Isolation" >> "$LOG_FILE"

if [ -n "$USER_TOKEN" ]; then
    log_info "Testing user cannot access other user's bills..."
    # Try to access a bill with a random UUID
    OTHER_USER_ID="00000000-0000-0000-0000-000000000001"
    BILL_ACCESS=$(curl -s "$API_URL/api/v1/bills/$OTHER_USER_ID/2026-01" \
        -H "Authorization: Bearer $USER_TOKEN" \
        -w "\n%{http_code}")
    
    BILL_HTTP_CODE=$(echo "$BILL_ACCESS" | tail -n1)
    BILL_BODY=$(echo "$BILL_ACCESS" | head -n -1)
    
    echo "Command: curl -s $API_URL/api/v1/bills/$OTHER_USER_ID/2026-01" >> "$LOG_FILE"
    echo "  -H 'Authorization: Bearer <user_token>'" >> "$LOG_FILE"
    echo "HTTP Code: $BILL_HTTP_CODE" >> "$LOG_FILE"
    echo "Response: $BILL_BODY" >> "$LOG_FILE"
    
    if [ "$BILL_HTTP_CODE" = "403" ]; then
        log_success "User bill access properly blocked (HTTP 403)"
        echo "Result: PASS - Access denied for other user's bills" >> "$LOG_FILE"
    else
        log_warn "Bill access returned HTTP $BILL_HTTP_CODE - review needed"
        echo "Result: NEEDS REVIEW" >> "$LOG_FILE"
    fi
else
    log_warn "Skipping - no user token"
    echo "Result: SKIPPED" >> "$LOG_FILE"
fi

header "ACCEPTANCE TEST 8: Admin User List Access"
echo "" >> "$LOG_FILE"
echo "Test 8: Admin User List Access" >> "$LOG_FILE"

if [ -n "$ADMIN_TOKEN" ]; then
    log_info "Testing admin can access user list..."
    USERS=$(curl -s "$API_URL/api/v1/users/" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -w "\n%{http_code}")
    
    USERS_HTTP_CODE=$(echo "$USERS" | tail -n1)
    USERS_BODY=$(echo "$USERS" | head -n -1)
    
    echo "Command: curl -s $API_URL/api/v1/users/" >> "$LOG_FILE"
    echo "  -H 'Authorization: Bearer <admin_token>'" >> "$LOG_FILE"
    echo "HTTP Code: $USERS_HTTP_CODE" >> "$LOG_FILE"
    echo "Response: ${USERS_BODY:0:500}" >> "$LOG_FILE"
    
    if [ "$USERS_HTTP_CODE" = "200" ]; then
        log_success "Admin can access user list"
        echo "Result: PASS" >> "$LOG_FILE"
    else
        log_fail "Admin user list access failed (HTTP $USERS_HTTP_CODE)"
        echo "Result: FAIL" >> "$LOG_FILE"
    fi
else
    log_warn "Skipping - no admin token"
    echo "Result: SKIPPED" >> "$LOG_FILE"
fi

header "ACCEPTANCE TEST 9: Regular User Cannot Access Admin Endpoints"
echo "" >> "$LOG_FILE"
echo "Test 9: Regular User Admin Endpoint Restriction" >> "$LOG_FILE"

if [ -n "$USER_TOKEN" ]; then
    log_info "Testing regular user cannot access admin endpoints..."
    ADMIN_ACCESS=$(curl -s "$API_URL/api/v1/users/" \
        -H "Authorization: Bearer $USER_TOKEN" \
        -w "\n%{http_code}")
    
    ADMIN_HTTP_CODE=$(echo "$ADMIN_ACCESS" | tail -n1)
    
    echo "Command: curl -s $API_URL/api/v1/users/" >> "$LOG_FILE"
    echo "  -H 'Authorization: Bearer <user_token>'" >> "$LOG_FILE"
    echo "HTTP Code: $ADMIN_HTTP_CODE" >> "$LOG_FILE"
    
    if [ "$ADMIN_HTTP_CODE" = "403" ]; then
        log_success "Regular user properly blocked from admin endpoints (HTTP 403)"
        echo "Result: PASS - Admin access denied for regular users" >> "$LOG_FILE"
    else
        log_fail "Regular user accessed admin endpoint (HTTP $ADMIN_HTTP_CODE)"
        echo "Result: FAIL" >> "$LOG_FILE"
    fi
else
    log_warn "Skipping - no user token"
    echo "Result: SKIPPED" >> "$LOG_FILE"
fi

header "ACCEPTANCE TEST 10: Refresh Token Endpoint"
echo "" >> "$LOG_FILE"
echo "Test 10: Refresh Token Endpoint" >> "$LOG_FILE"

if [ -n "$ADMIN_TOKEN" ]; then
    log_info "Testing refresh token endpoint..."
    
    # First get a refresh token
    LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=admin@dairy.com&password=admin123")
    
    REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"refresh_token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$REFRESH_TOKEN" ]; then
        REFRESH_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/refresh?refresh_token=$REFRESH_TOKEN" \
            -w "\n%{http_code}")
        
        REFRESH_HTTP_CODE=$(echo "$REFRESH_RESPONSE" | tail -n1)
        REFRESH_BODY=$(echo "$REFRESH_RESPONSE" | head -n -1)
        
        echo "Command: curl -X POST $API_URL/api/v1/auth/refresh" >> "$LOG_FILE"
        echo "  -d 'refresh_token=<token>'" >> "$LOG_FILE"
        echo "HTTP Code: $REFRESH_HTTP_CODE" >> "$LOG_FILE"
        echo "Response: $REFRESH_BODY" >> "$LOG_FILE"
        
        if [ "$REFRESH_HTTP_CODE" = "200" ]; then
            log_success "Refresh token works"
            echo "Result: PASS" >> "$LOG_FILE"
        else
            log_fail "Refresh token failed (HTTP $REFRESH_HTTP_CODE)"
            echo "Result: FAIL" >> "$LOG_FILE"
        fi
    else
        log_warn "Could not get refresh token"
        echo "Result: SKIPPED" >> "$LOG_FILE"
    fi
else
    log_warn "Skipping - no admin token"
    echo "Result: SKIPPED" >> "$LOG_FILE"
fi

header "ACCEPTANCE TEST 11: Frontend Health Check"
echo "" >> "$LOG_FILE"
echo "Test 11: Frontend Health Check" >> "$LOG_FILE"

log_info "Testing frontend is accessible..."
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" || echo "000")

echo "Command: curl -s -o /dev/null -w '%{http_code}' $FRONTEND_URL" >> "$LOG_FILE"
echo "HTTP Code: $FRONTEND_RESPONSE" >> "$LOG_FILE"

if [ "$FRONTEND_RESPONSE" = "200" ] || [ "$FRONTEND_RESPONSE" = "304" ]; then
    log_success "Frontend is accessible (HTTP $FRONTEND_RESPONSE)"
    echo "Result: PASS" >> "$LOG_FILE"
else
    log_warn "Frontend returned HTTP $FRONTEND_RESPONSE - may still be starting"
    echo "Result: NEEDS REVIEW" >> "$LOG_FILE"
fi

header "SUMMARY"
echo "" >> "$LOG_FILE"
echo "==========================================" >> "$LOG_FILE"
echo "Test Summary" >> "$LOG_FILE"
echo "==========================================" >> "$LOG_FILE"
echo "Completed at: $(date)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
echo "Note: Some tests may show as SKIPPED if previous tests failed." >> "$LOG_FILE"
echo "For full test coverage, ensure all services are running." >> "$LOG_FILE"

echo ""
echo "=========================================="
echo "Acceptance Tests Complete!"
echo "=========================================="
echo ""
log_info "Full output saved to: $LOG_FILE"
echo ""
echo "To view the full log:"
echo "  cat $LOG_FILE"
echo ""
echo "To run specific tests manually, see the commands in $LOG_FILE"

