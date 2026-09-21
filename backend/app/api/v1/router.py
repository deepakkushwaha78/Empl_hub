from fastapi import APIRouter

from app.api.v1 import admin, attendance, auth, departments, employees, health

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(departments.router)
api_router.include_router(employees.router)
api_router.include_router(attendance.router)
api_router.include_router(admin.router)
