from typing import Any, List
from pydantic import BaseModel

class UserDashboardMetrics(BaseModel):
    activeLost: int
    activeFound: int
    pendingClaims: int
    potentialMatches: int
    unreadNotifications: int

class UserDashboardResponse(BaseModel):
    metrics: UserDashboardMetrics
    recentReports: List[Any] = []
    recentClaims: List[Any] = []

class AdminDashboardMetrics(BaseModel):
    totalLost: int
    totalFound: int
    totalReports: int
    activeReports: int
    claimedItems: int
    returnedItems: int
    pendingClaims: int
    verifiedClaims: int
    rejectedClaims: int
    recoveryRate: int

class AdminDashboardResponse(BaseModel):
    metrics: AdminDashboardMetrics
