import threading
import time


class TokenBlacklist:
    """In-memory blacklist for revoked access-token JTIs.

    Entries are auto-evicted once the token's natural expiry passes,
    keeping memory bounded to active-lifetime tokens only.
    """

    def __init__(self) -> None:
        self._store: dict[str, float] = {}  # jti -> unix expiry timestamp
        self._lock = threading.Lock()

    def revoke(self, jti: str, expires_at: float) -> None:
        with self._lock:
            self._store[jti] = expires_at
            self._evict()

    def is_revoked(self, jti: str) -> bool:
        with self._lock:
            exp = self._store.get(jti)
            if exp is None:
                return False
            if time.time() > exp:
                del self._store[jti]
                return False
            return True

    def _evict(self) -> None:
        now = time.time()
        expired = [k for k, v in self._store.items() if now > v]
        for k in expired:
            del self._store[k]


_blacklist = TokenBlacklist()


def get_token_blacklist() -> TokenBlacklist:
    return _blacklist
