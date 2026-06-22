import asyncio
import websockets

async def test():
    try:
        async with websockets.connect('ws://localhost:8000/api/v1/live-feed') as ws:
            print('Connected!')
    except Exception as e:
        print('Error:', e)

asyncio.run(test())
