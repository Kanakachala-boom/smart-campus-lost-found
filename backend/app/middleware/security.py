import time
import os
from collections import defaultdict
from typing import Dict, List
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
    Automatically bypassed during automated test suites (when TESTING=true).
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

    async def dispatch(self, request: Request, call_next):
        # Allow automated test suites and health checks to bypass rate limits
        if os.getenv("TESTING", "").lower() in ("true", "1", "yes"):
            return await call_next(request)

        path = request.url.path
        if path in self.rate_limited_paths:
            limit, window = self.rate_limited_paths[path]
            client_ip = request.client.host if request.client else "unknown"
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
