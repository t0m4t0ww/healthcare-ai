# backend/app/services/redis_cache.py
"""
Redis caching service for API response caching
Improves performance by caching frequently accessed data
"""
import json
import os
from typing import Any, Optional, Union
from functools import wraps

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None

# Redis connection (lazy initialization)
_redis_client: Optional[Any] = None

def get_redis_client():
    """Get or create Redis client"""
    global _redis_client
    
    if not REDIS_AVAILABLE:
        return None
    
    if _redis_client is None:
        try:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
            _redis_client = redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2
            )
            # Test connection
            _redis_client.ping()
            print("✅ Redis connected successfully")
        except Exception as e:
            print(f"⚠️  Redis not available: {e}. Using memory cache fallback.")
            _redis_client = None
    
    return _redis_client

class CacheService:
    """Cache service with Redis backend and memory fallback"""
    
    def __init__(self):
        self.redis = get_redis_client()
        self.memory_cache = {}  # Fallback memory cache
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        # Try Redis first
        if self.redis:
            try:
                value = self.redis.get(key)
                if value:
                    return json.loads(value)
            except Exception as e:
                print(f"⚠️  Redis get error: {e}")
        
        # Fallback to memory cache
        if key in self.memory_cache:
            cached_data, expiry = self.memory_cache[key]
            # Check if expired (simple memory cache doesn't auto-expire)
            if expiry is None or expiry > 0:
                return cached_data
            else:
                del self.memory_cache[key]
        
        return None
    
    def set(self, key: str, value: Any, ttl: int = 3600):
        """
        Set value in cache with TTL (time to live in seconds)
        
        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time to live in seconds (default: 1 hour)
        """
        try:
            json_value = json.dumps(value, default=str)
        except Exception:
            # If value can't be serialized, skip caching
            return False
        
        # Try Redis first
        if self.redis:
            try:
                self.redis.setex(key, ttl, json_value)
                return True
            except Exception as e:
                print(f"⚠️  Redis set error: {e}")
        
        # Fallback to memory cache (simplified, no auto-expiry)
        # In production, should use a proper memory cache library
        self.memory_cache[key] = (value, ttl)
        
        # Clean up old entries (simple cleanup, not production-ready)
        if len(self.memory_cache) > 1000:
            # Remove oldest 10% of entries
            keys_to_remove = list(self.memory_cache.keys())[:100]
            for k in keys_to_remove:
                del self.memory_cache[k]
        
        return True
    
    def delete(self, key: str):
        """Delete key from cache"""
        # Try Redis first
        if self.redis:
            try:
                self.redis.delete(key)
            except Exception:
                pass
        
        # Remove from memory cache
        if key in self.memory_cache:
            del self.memory_cache[key]
    
    def delete_pattern(self, pattern: str):
        """
        Delete all keys matching pattern (e.g., "user:*")
        Warning: Use with caution in production
        """
        deleted_count = 0
        
        # Try Redis first
        if self.redis:
            try:
                keys = self.redis.keys(pattern)
                if keys:
                    deleted_count = self.redis.delete(*keys)
            except Exception:
                pass
        
        # Remove from memory cache (simple string matching)
        keys_to_delete = [k for k in self.memory_cache.keys() if pattern.replace("*", "") in k]
        for key in keys_to_delete:
            del self.memory_cache[key]
            deleted_count += 1
        
        return deleted_count
    
    def clear(self):
        """Clear all cache"""
        if self.redis:
            try:
                self.redis.flushdb()
            except Exception:
                pass
        
        self.memory_cache.clear()

# Global cache instance
cache = CacheService()

def cache_result(key_prefix: str, ttl: int = 3600, key_func=None):
    """
    Decorator to cache function results
    
    Args:
        key_prefix: Prefix for cache key
        ttl: Time to live in seconds
        key_func: Function to generate cache key from function arguments
    
    Example:
        @cache_result("user", ttl=1800, key_func=lambda user_id: f"user:{user_id}")
        def get_user(user_id):
            # ... fetch user from DB
            return user
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                # Default: use function name + arguments
                key_str = "_".join([str(arg) for arg in args] + [f"{k}:{v}" for k, v in kwargs.items()])
                cache_key = f"{key_prefix}:{func.__name__}:{hash(key_str)}"
            
            # Try to get from cache
            cached = cache.get(cache_key)
            if cached is not None:
                return cached
            
            # Call function and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            
            return result
        
        return wrapper
    return decorator

