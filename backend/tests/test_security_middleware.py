import os
import pytest
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.testclient import TestClient
from starlette.applications import Starlette
from starlette.routing import Route
from app.middleware.security import RateLimitMiddleware, SecurityHeadersMiddleware
from app.config import INSECURE_JWT_SECRETS

def test_is_trusted_hop():
    # Loopback and local
    assert RateLimitMiddleware._is_trusted_hop("127.0.0.1") is True
    assert RateLimitMiddleware._is_trusted_hop("::1") is True
    assert RateLimitMiddleware._is_trusted_hop("localhost") is True
    assert RateLimitMiddleware._is_trusted_hop("testclient") is True
    # RFC 1918 Private networks
    assert RateLimitMiddleware._is_trusted_hop("10.0.0.1") is True
    assert RateLimitMiddleware._is_trusted_hop("172.16.0.5") is True
    assert RateLimitMiddleware._is_trusted_hop("172.31.255.254") is True
    assert RateLimitMiddleware._is_trusted_hop("192.168.1.100") is True
    # Public IPs must NOT be trusted hops (even if starting with 172.)
    assert RateLimitMiddleware._is_trusted_hop("172.217.16.206") is False  # Public Google IP
    assert RateLimitMiddleware._is_trusted_hop("8.8.8.8") is False
    assert RateLimitMiddleware._is_trusted_hop("203.0.113.19") is False
    assert RateLimitMiddleware._is_trusted_hop("invalid-ip") is False

def test_get_client_ip_direct_connection():
    middleware = RateLimitMiddleware(None)
    # Direct untrusted public client connection
    scope = {
        "type": "http",
        "client": ("203.0.113.50", 12345),
        "headers": [
            (b"x-forwarded-for", b"1.1.1.1"),
            (b"x-real-ip", b"2.2.2.2"),
        ]
    }
    req = Request(scope)
    # Forwarding headers should be ignored because socket is not a trusted proxy
    assert middleware._get_client_ip(req) == "203.0.113.50"

def test_get_client_ip_reverse_proxy_x_forwarded_for_anti_spoofing():
    middleware = RateLimitMiddleware(None)
    # Proxy at 10.0.0.2 forwards request. Client sent spoofed "1.1.1.1, 2.2.2.2", proxy appended "198.51.100.25"
    scope = {
        "type": "http",
        "client": ("10.0.0.2", 12345),
        "headers": [
            (b"x-forwarded-for", b"1.1.1.1, 2.2.2.2, 198.51.100.25"),
        ]
    }
    req = Request(scope)
    # Must pick the real client IP (198.51.100.25), not the spoofed leading hops
    assert middleware._get_client_ip(req) == "198.51.100.25"

def test_get_client_ip_cloudflare_and_nginx():
    middleware = RateLimitMiddleware(None)
    scope_cf = {
        "type": "http",
        "client": ("127.0.0.1", 12345),
        "headers": [
            (b"cf-connecting-ip", b"198.51.100.44"),
            (b"x-forwarded-for", b"1.1.1.1"),
        ]
    }
    req_cf = Request(scope_cf)
    assert middleware._get_client_ip(req_cf) == "198.51.100.44"

    scope_real = {
        "type": "http",
        "client": ("127.0.0.1", 12345),
        "headers": [
            (b"x-real-ip", b"198.51.100.88"),
        ]
    }
    req_real = Request(scope_real)
    assert middleware._get_client_ip(req_real) == "198.51.100.88"

def test_production_mode_enforces_rate_limiting_despite_testing_flag(monkeypatch):
    monkeypatch.setenv("TESTING", "true")
    monkeypatch.setenv("ENVIRONMENT", "production")

    async def endpoint(request):
        return JSONResponse({"status": "ok"})

    app = Starlette(routes=[Route("/api/auth/login", endpoint, methods=["POST"])])
    app.add_middleware(RateLimitMiddleware)

    client = TestClient(app)
    # In production mode, rate limiter must actively enforce limits even if TESTING=true
    # /api/auth/login has a limit of 15 requests
    for _ in range(15):
        resp = client.post("/api/auth/login")
        assert resp.status_code == 200

    resp = client.post("/api/auth/login")
    assert resp.status_code == 429
    assert "Too many requests" in resp.json()["detail"]

def test_jwt_secret_insecure_blacklist():
    assert "nie_smart_campus_lost_and_found_jwt_secret_dev_key_2026" in INSECURE_JWT_SECRETS
    assert "please_set_a_secure_production_secret_32chars" in INSECURE_JWT_SECRETS
    assert "replace_with_a_secure_random_secret_key_minimum_32_characters" in INSECURE_JWT_SECRETS
