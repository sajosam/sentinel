import asyncio
import json
from typing import Dict, List, AsyncGenerator
from datetime import datetime, timezone


class EventBus:
    def __init__(self):
        self._subscribers: Dict[str, List[asyncio.Queue]] = {}
        self._global_subscribers: List[asyncio.Queue] = []

    async def subscribe(self, investigation_id: str) -> AsyncGenerator[str, None]:
        queue = asyncio.Queue()
        if investigation_id not in self._subscribers:
            self._subscribers[investigation_id] = []
        self._subscribers[investigation_id].append(queue)

        try:
            while True:
                data = await queue.get()
                yield f"data: {json.dumps(data)}\n\n"
                if data.get("event_type") in ["finished", "failed", "cancelled"]:
                    break
        finally:
            if investigation_id in self._subscribers and queue in self._subscribers[investigation_id]:
                self._subscribers[investigation_id].remove(queue)
                if not self._subscribers[investigation_id]:
                    del self._subscribers[investigation_id]

    async def subscribe_global(self) -> AsyncGenerator[str, None]:
        queue = asyncio.Queue()
        self._global_subscribers.append(queue)
        try:
            while True:
                data = await queue.get()
                yield f"data: {json.dumps(data)}\n\n"
        finally:
            if queue in self._global_subscribers:
                self._global_subscribers.remove(queue)

    async def publish(self, investigation_id: str, event_type: str, data: dict):
        payload = {
            "investigation_id": investigation_id,
            "event_type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": data
        }
        # Publish to specific investigation subscribers
        if investigation_id in self._subscribers:
            for q in list(self._subscribers[investigation_id]):
                await q.put(payload)
        
        # Publish to global subscribers
        for q in list(self._global_subscribers):
            await q.put(payload)


event_bus = EventBus()
