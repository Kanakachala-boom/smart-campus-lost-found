import time
import os
import ipaddress
from collections import defaultdict
from typing import Dict, List, Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Injects industry-standard HTTP security headers into every outgoing response.
    Protects against MIME-type sniffing, clickjacking, and XSS risks.
    """
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Sliding-window in-memory rate limiter for brute-force protection on sensitive auth endpoints.
    Tracks client IP request timestamps.
    Automatically bypassed during automated test suites (when TESTING=true and ENVIRONMENT != production).
    """
    def __init__(self, app, max_requests: int = 30, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = defaultdict(list)
        # Endpoints subject to rate limiting
        self.rate_limited_paths = {
            "/api/auth/login": (15, 60),          # 15 requests per minute
            "/api/auth/register": (10, 60),       # 10 requests per minute
            "/api/auth/forgot-password": (5, 60), # 5 requests per minute
        }

    RFC1918_NETWORKS = (
        ipaddress.ip_network("10.0.0.0/8"),
        ipaddress.ip_network("172.16.0.0/12"),
        ipaddress.ip_network("192.168.0.0/16"),
    )

    @classmethod
    def _is_private_or_loopback(cls, ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
        if ip.is_loopback:
            return True
        return any(ip in net for net in cls.RFC1918_NETWORKS)

    @classmethod
    def _is_trusted_hop(cls, socket_ip: str) -> bool:
        if socket_ip in ("127.0.0.1", "::1", "localhost", "testclient"):
            return True
        try:
            ip = ipaddress.ip_address(socket_ip)
            return cls._is_private_or_loopback(ip)
        except ValueError:
            return False

    def _get_client_ip(self, request: Request) -> str:
        """
        Safely extracts client IP for rate limiting.
        To prevent client-side header spoofing:
        1. Forwarding headers (CF-Connecting-IP, X-Real-IP, X-Forwarded-For) are only
           trusted if the immediate socket connection is from a recognized reverse proxy,
           loopback, or private network hop.
        2. In multi-hop X-Forwarded-For headers, proxies append entries to the right.
           The rightmost untrusted IP (or rightmost valid IP) is extracted to prevent
           attackers from forging fake IPs on the left side of the header.
        3. All candidate IPs are validated with ipaddress parser to prevent header injection.
        """
        socket_ip = request.client.host if request.client else "unknown"
        trust_proxy = os.getenv("TRUST_PROXY_HEADERS", "true").lower() in ("true", "1", "yes")

        # Allow explicit operator configuration of trusted proxy IPs/CIDRs
        trusted_proxies_cfg = os.getenv("TRUSTED_PROXIES", "").strip()
        if trusted_proxies_cfg:
            trusted_list = [p.strip() for p in trusted_proxies_cfg.split(",") if p.strip()]
            is_trusted = socket_ip in trusted_list
        else:
            is_trusted = self._is_trusted_hop(socket_ip)

        if trust_proxy and is_trusted:
            # 1. Cloudflare CF-Connecting-IP (set authoritatively by Cloudflare edge)
            cf_ip = request.headers.get("cf-connecting-ip")
            if cf_ip:
                clean_cf = cf_ip.strip()
                try:
                    ipaddress.ip_address(clean_cf)
                    return clean_cf
                except ValueError:
                    pass

            # 2. Nginx / Ingress X-Real-IP (set to $remote_addr by the immediate proxy)
            real_ip = request.headers.get("x-real-ip")
            if real_ip:
                clean_real = real_ip.strip()
                try:
                    ipaddress.ip_address(clean_real)
                    return clean_real
                except ValueError:
                    pass

            # 3. X-Forwarded-For: <client>, <proxy1>, <proxy2>
            # Reverse proxies append to the end. Iterate from right to left to locate
            # the client IP added by the reverse proxy, discarding spoofed leading IPs.
            forwarded = request.headers.get("x-forwarded-for")
            if forwarded:
                hops = [h.strip() for h in forwarded.split(",") if h.strip()]
                # First pass: rightmost valid public IP (external client)
                for hop in reversed(hops):
                    try:
                        ip = ipaddress.ip_address(hop)
                        if not self._is_private_or_loopback(ip):
                            return str(ip)
                    except ValueError:
                        continue
                # Second pass: rightmost valid hop (campus intranet or private test client)
                for hop in reversed(hops):
                    try:
                        ip = ipaddress.ip_address(hop)
                        return str(ip)
                    except ValueError:
                        continue

        return socket_ip

    async def dispatch(self, request: Request, call_next):
        # Allow automated test suites to bypass rate limits ONLY in non-production environments
        is_testing = os.getenv("TESTING", "").strip().lower() in ("true", "1", "yes")
        is_prod = os.getenv("ENVIRONMENT", "development").strip().lower() == "production"
        if is_testing and not is_prod:
            return await call_next(request)

        path = request.url.path
        if path in self.rate_limited_paths:
            limit, window = self.rate_limited_paths[path]
            client_ip = self._get_client_ip(request)
            key = f"{client_ip}:{path}"
            now = time.time()
            cutoff = now - window

            # Clean up old timestamps
            self.requests[key] = [t for t in self.requests[key] if t > cutoff]

            if len(self.requests[key]) >= limit:
                retry_after = int(window - (now - self.requests[key][0])) + 1
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Too many requests. Please slow down and try again later.",
                        "error_type": "RateLimitExceeded",
                        "retry_after_seconds": max(1, retry_after),
                    },
                    headers={"Retry-After": str(max(1, retry_after))},
                )

            self.requests[key].append(now)

        return await call_next(request)
