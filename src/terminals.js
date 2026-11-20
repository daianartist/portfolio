// ─────────────────────────────────────────────────────────────
//  Демо-сессии терминала для бэкенд-проектов (окно проекта).
//  label — подпись кнопки, cmd — команда, out — что «ответит» сервер.
//  Команды и форматы — по README проектов; значения — примерные.
// ─────────────────────────────────────────────────────────────

export const terminals = {
  board: {
    cwd: '~/1337b04rd',
    session: [
      {
        label: 'Help',
        cmd: './1337b04rd --help',
        out: `hacker board

Usage:
  1337b04rd [--port <N>]
  1337b04rd --help

Options:
  --help       Show this screen.
  --port N     Port number.`,
      },
      {
        label: 'First visit → avatar',
        cmd: 'curl -i http://localhost:8080/',
        out: `HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Set-Cookie: session_id=9f3c1a7e-52d4-4b0e-a1f6-0c8e2d7b4a19; Path=/; Max-Age=604800; HttpOnly

<!-- catalog.html -->
<header>You are: Morty Smith  [avatar: rickandmortyapi.com/api/character/avatar/2.jpeg]</header>
<section class="catalog">3 active threads</section>`,
      },
      {
        label: 'Create thread',
        cmd: 'curl -i -b cookies.txt -X POST http://localhost:8080/create \\\n  -F "subject=wubba lubba" -F "content=dub dub" -F "image=@portal.png"',
        out: `HTTP/1.1 303 See Other
Location: /post/42

level=INFO msg="image uploaded" bucket=posts key=42/portal.png size=184213
level=INFO msg="post created" post_id=42 author="Morty Smith"`,
      },
      {
        label: 'Reject fake image',
        cmd: 'curl -i -b cookies.txt -X POST http://localhost:8080/post/42 \\\n  -F "content=lol" -F "image=@notes.png"',
        out: `HTTP/1.1 400 Bad Request
Content-Type: text/html; charset=utf-8

<!-- error.html -->
400 — invalid image: magic bytes do not match JPEG, PNG, GIF or WebP`,
      },
      {
        label: 'Auto-archive',
        cmd: 'docker logs 1337b04rd | grep archive',
        out: `level=INFO msg="cleanup tick" interval=1m
level=INFO msg="post archived" post_id=37 reason="no replies for 10m"
level=INFO msg="post archived" post_id=39 reason="15m since last comment"`,
      },
      {
        label: 'Tests',
        cmd: 'go test -cover ./internal/...',
        out: `ok   1337b04rd/internal/config             0.104s  coverage: 100.0% of statements
ok   1337b04rd/internal/adapters/rickmorty 0.231s  coverage: 73.9% of statements
ok   1337b04rd/internal/service            0.412s  coverage: 58.7% of statements`,
      },
    ],
  },

  rideHail: {
    cwd: '~/ride-hail',
    session: [
      {
        label: 'Driver goes online',
        cmd: 'curl -s -X POST "http://localhost:3001/drivers/$DRIVER_ID/online" \\\n  -H "Authorization: Bearer $DRIVER_TOKEN" \\\n  -d \'{"latitude":43.238949,"longitude":76.889709}\' | jq',
        out: `{
  "status": "AVAILABLE",
  "session_id": "6b0f2c44-8e1d-4a52-9c3b-1f7d5e2a9b10",
  "message": "You are now online and ready to accept rides"
}`,
      },
      {
        label: 'Passenger requests ride',
        cmd: 'curl -s -X POST http://localhost:3000/rides \\\n  -H "Authorization: Bearer $PASSENGER_TOKEN" \\\n  -d \'{"pickup_address":"Almaty Central Park","destination_address":"Kok-Tobe Hill","ride_type":"ECONOMY", …}\' | jq',
        out: `{
  "ride_id": "550e8400-e29b-41d4-a716-446655440000",
  "ride_number": "RIDE_20260607_001",
  "status": "REQUESTED",
  "estimated_fare": 1450,
  "estimated_duration_minutes": 15,
  "estimated_distance_km": 5.2
}`,
      },
      {
        label: 'Driver WS: offer → accept',
        cmd: 'wscat -c ws://localhost:3001/ws/drivers/$DRIVER_ID',
        out: `Connected (press CTRL+C to quit)
> {"type":"auth","token":"Bearer eyJhbGciOiJIUzI1NiIs…"}
< {"type":"ride_offer","offer_id":"offer_7f2a","ride_id":"550e8400-…",
   "pickup_location":{"latitude":43.238949,"longitude":76.889709,"address":"Almaty Central Park"},
   "distance_to_pickup_km":0.8,"expires_at":"2026-06-07T12:00:30Z"}
> {"type":"ride_response","offer_id":"offer_7f2a","ride_id":"550e8400-…","accepted":true}
< {"type":"ride_details","ride_id":"550e8400-…","passenger_name":"Demo Passenger",
   "pickup_location":{"address":"Almaty Central Park"}}`,
      },
      {
        label: 'Passenger WS: live status',
        cmd: 'wscat -c ws://localhost:3000/ws/passengers/$PASSENGER_ID',
        out: `< {"type":"ride_status_update","ride_id":"550e8400-…","status":"MATCHED",
   "driver_info":{"name":"Demo Driver","vehicle":{"make":"Toyota","model":"Camry","color":"White","plate":"KZ 123 ABC"},"rating":5.0}}
< {"type":"driver_location_update","ride_id":"550e8400-…",
   "driver_location":{"lat":43.236,"lng":76.887},"distance_to_pickup_km":0.4,"estimated_arrival":"2 min"}
< {"type":"ride_status_update","ride_id":"550e8400-…","status":"ARRIVED"}`,
      },
      {
        label: 'Complete ride',
        cmd: 'curl -s -X POST "http://localhost:3001/drivers/$DRIVER_ID/complete" \\\n  -H "Authorization: Bearer $DRIVER_TOKEN" \\\n  -d "{\\"ride_id\\":\\"$RIDE_ID\\",\\"actual_distance_km\\":5.5,\\"actual_duration_minutes\\":16}" | jq',
        out: `{
  "ride_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "COMPLETED",
  "final_fare": 1520,
  "driver_earnings": 1216,
  "message": "Ride completed successfully"
}`,
      },
      {
        label: 'Admin overview',
        cmd: 'curl -s -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3004/admin/overview | jq',
        out: `{
  "metrics": {
    "active_rides": 3,
    "available_drivers": 12,
    "busy_drivers": 3,
    "total_rides_today": 148,
    "total_revenue_today": 214300,
    "average_wait_time_minutes": 4.2
  },
  "driver_distribution": { "ECONOMY": 10, "PREMIUM": 4, "XL": 1 }
}`,
      },
    ],
  },

  marketflow: {
    cwd: '~/marketflow',
    session: [
      {
        label: 'Latest price',
        cmd: 'curl -s http://localhost:8080/prices/latest/BTCUSDT | jq',
        out: `{
  "symbol": "BTCUSDT",
  "exchange": "exchange2",
  "price": 67412.35,
  "timestamp": "2026-06-07T12:04:17Z"
}`,
      },
      {
        label: 'Per exchange',
        cmd: 'curl -s http://localhost:8080/prices/latest/exchange1/ETHUSDT | jq',
        out: `{
  "symbol": "ETHUSDT",
  "exchange": "exchange1",
  "price": 3521.08,
  "timestamp": "2026-06-07T12:04:17Z"
}`,
      },
      {
        label: 'Highest in 5m',
        cmd: 'curl -s "http://localhost:8080/prices/highest/BTCUSDT?period=5m" | jq',
        out: `{
  "symbol": "BTCUSDT",
  "period": "5m",
  "max_price": 67498.10,
  "exchange": "exchange3"
}`,
      },
      {
        label: 'Average in 1m',
        cmd: 'curl -s "http://localhost:8080/prices/average/SOLUSDT?period=1m" | jq',
        out: `{
  "symbol": "SOLUSDT",
  "period": "1m",
  "average_price": 164.27,
  "samples": 612
}`,
      },
      {
        label: 'Switch to test mode',
        cmd: 'curl -s -X POST http://localhost:8080/mode/test',
        out: `{"mode":"test","message":"switched to test mode: synthetic data generator started"}

level=INFO msg="live sources stopped" exchanges=3
level=INFO msg="test generator started" symbols="BTCUSDT,DOGEUSDT,TONUSDT,SOLUSDT,ETHUSDT" workers=5`,
      },
      {
        label: 'Health',
        cmd: 'curl -s http://localhost:8080/health | jq',
        out: `{
  "status": "ok",
  "mode": "test",
  "postgres": "up",
  "redis": "up",
  "workers_per_source": 5
}`,
      },
    ],
  },

  pizza: {
    cwd: '~/wheres-my-pizza',
    session: [
      {
        label: 'Start services',
        cmd: './restaurant-system --mode=kitchen-worker --worker-name=chef_anna --prefetch=1',
        out: `{"timestamp":"2026-06-07T13:00:35Z","level":"INFO","service":"kitchen-worker","action":"worker_registered","message":"Worker chef_anna registered","request_id":"startup-001"}
{"timestamp":"2026-06-07T13:00:35Z","level":"INFO","service":"kitchen-worker","action":"consumer_started","message":"Listening on kitchen_queue (prefetch=1)"}`,
      },
      {
        label: 'Place an order',
        cmd: 'curl -s -X POST http://localhost:3000/orders \\\n  -d \'{"customer_name":"Jane Doe","order_type":"takeout",\n       "items":[{"name":"Margherita Pizza","quantity":1,"price":15.99},\n                {"name":"Caesar Salad","quantity":1,"price":8.99}]}\'',
        out: `{
  "order_number": "ORD_20260607_001",
  "status": "received",
  "total_amount": 24.98
}`,
      },
      {
        label: 'Notifications',
        cmd: './restaurant-system --mode=notification-subscriber',
        out: `Notification for order ORD_20260607_001: Status changed from 'received' to 'cooking' by chef_anna.
Notification for order ORD_20260607_001: Status changed from 'cooking' to 'ready' by chef_anna.`,
      },
      {
        label: 'Track order',
        cmd: 'curl -s http://localhost:3002/orders/ORD_20260607_001/status | jq',
        out: `{
  "order_number": "ORD_20260607_001",
  "current_status": "ready",
  "updated_at": "2026-06-07T13:01:12Z",
  "processed_by": "chef_anna"
}`,
      },
      {
        label: 'Workers status',
        cmd: 'curl -s http://localhost:3002/workers/status | jq',
        out: `[
  { "worker_name": "chef_anna",  "status": "online", "orders_processed": 7 },
  { "worker_name": "chef_mario", "status": "online", "orders_processed": 3 }
]`,
      },
      {
        label: 'Bad request',
        cmd: 'curl -s -X POST http://localhost:3000/orders -d \'{"customer_name":"","items":[]}\'',
        out: `HTTP 400
{"error":"validation failed: customer_name is required; items must contain 1-20 entries"}`,
      },
    ],
  },

  coffee: {
    cwd: '~/hot-coffee',
    session: [
      {
        label: 'Menu',
        cmd: 'curl -s http://localhost:8080/menu | jq \'.[] | {product_id, price}\'',
        out: `{ "product_id": "latte",      "price": 3.5 }
{ "product_id": "espresso",   "price": 2.5 }
{ "product_id": "croissant",  "price": 2.75 }
{ "product_id": "cappuccino", "price": 4 }`,
      },
      {
        label: 'Create order',
        cmd: 'curl -s -X POST http://localhost:8080/orders \\\n  -d \'{"customer_name":"John Doe","items":[{"product_id":"latte","quantity":2},\n                                         {"product_id":"croissant","quantity":1}]}\'',
        out: `HTTP 201 Created
{
  "order_id": "order123",
  "customer_name": "John Doe",
  "status": "open",
  "created_at": "2026-06-07T09:12:44Z"
}`,
      },
      {
        label: 'Close order → stock',
        cmd: 'curl -s -X POST http://localhost:8080/orders/order123/close && curl -s localhost:8080/inventory/milk',
        out: `{"order_id":"order123","status":"closed"}
{"ingredient_id":"milk","name":"Milk","quantity":4600,"unit":"ml"}   # was 5000 — 2 lattes deducted`,
      },
      {
        label: 'Out of stock',
        cmd: 'curl -s -X POST http://localhost:8080/orders \\\n  -d \'{"customer_name":"Ann","items":[{"product_id":"latte","quantity":40}]}\'',
        out: `HTTP 400 Bad Request
{"error":"Insufficient inventory for ingredient 'milk'. Required: 8000ml, Available: 4600ml."}`,
      },
      {
        label: 'Total sales',
        cmd: 'curl -s http://localhost:8080/reports/total-sales',
        out: `{"total_sales":1245.5}`,
      },
      {
        label: 'Popular items',
        cmd: 'curl -s http://localhost:8080/reports/popular-items | jq',
        out: `[
  { "product_id": "latte",      "quantity_sold": 214 },
  { "product_id": "cappuccino", "quantity_sold": 158 },
  { "product_id": "croissant",  "quantity_sold": 97 }
]`,
      },
    ],
  },

  rsshub: {
    cwd: '~/rsshub',
    session: [
      {
        label: 'Start fetching',
        cmd: './rsshub fetch',
        out: 'The background process for fetching feeds has started (interval = 3 minutes, workers = 3)',
      },
      {
        label: 'Add feed',
        cmd: './rsshub add --name "hacker-news" --url "https://news.ycombinator.com/rss"',
        out: 'Feed "hacker-news" added',
      },
      {
        label: 'List feeds',
        cmd: './rsshub list --num 2',
        out: `# Available RSS Feeds

1. Name: tech-crunch
   URL: https://techcrunch.com/feed/
   Added: 2025-06-10 15:34

2. Name: hacker-news
   URL: https://news.ycombinator.com/rss
   Added: 2025-06-10 15:37`,
      },
      {
        label: 'Articles',
        cmd: './rsshub articles --feed-name "tech-crunch" --num 2',
        out: `Feed: tech-crunch

1. [2025-06-18] Apple announces new M4 chips for MacBook Pro
   https://techcrunch.com/apple-announces-m4/

2. [2025-06-17] OpenAI launches GPT-5 with multimodal capabilities
   https://techcrunch.com/openai-launches-gpt-5/`,
      },
      {
        label: 'Set interval',
        cmd: './rsshub set-interval 2m',
        out: 'Interval of fetching feeds changed from 3 minutes to 2 minutes',
      },
      {
        label: 'Set workers',
        cmd: './rsshub set-workers 5',
        out: 'Number of workers changed from 3 to 5',
      },
      {
        label: 'Already running',
        cmd: './rsshub fetch',
        out: 'Background process is already running',
      },
    ],
  },

  redis: {
    cwd: '~/own-redis',
    session: [
      { label: 'Start server', cmd: './own-redis --port 8080', out: 'level=INFO msg="UDP server listening" addr=:8080' },
      { label: 'PING', cmd: 'echo "PING" | nc -u 127.0.0.1 8080', out: 'PONG' },
      { label: 'SET', cmd: 'echo "SET name John Doe" | nc -u 127.0.0.1 8080', out: 'OK' },
      { label: 'GET', cmd: 'echo "GET name" | nc -u 127.0.0.1 8080', out: 'John Doe' },
      {
        label: 'SET with PX',
        cmd: 'echo "SET temp data PX 5000" | nc -u 127.0.0.1 8080\nsleep 6 && echo "GET temp" | nc -u 127.0.0.1 8080',
        out: `OK
(nil)          # expired after 5s, removed by background cleanup`,
      },
      { label: 'Unknown key', cmd: 'echo "get unknown" | nc -u 127.0.0.1 8080', out: '(nil)' },
    ],
  },

  triples: {
    cwd: '~/triple-s',
    session: [
      {
        label: 'Run server',
        cmd: './triple-s -port 8080 -dir ./data',
        out: 'Simple Storage Service listening on :8080 (data dir: ./data)',
      },
      {
        label: 'Create bucket',
        cmd: 'curl -i -X PUT http://localhost:8080/photos',
        out: `HTTP/1.1 200 OK
Content-Type: application/xml

<CreateBucketResult><Name>photos</Name><Status>created</Status></CreateBucketResult>`,
      },
      {
        label: 'List buckets',
        cmd: 'curl -s http://localhost:8080/',
        out: `<ListAllMyBucketsResult>
  <Buckets>
    <Bucket><Name>photos</Name><CreationDate>2026-06-07T10:21:03Z</CreationDate></Bucket>
  </Buckets>
</ListAllMyBucketsResult>`,
      },
      {
        label: 'Upload object',
        cmd: 'curl -i -X PUT -H "Content-Type: image/png" \\\n  --data "fake-image-data" http://localhost:8080/photos/sunset.png',
        out: `HTTP/1.1 200 OK

$ cat data/photos/objects.csv
ObjectKey,Size,ContentType,LastModified
sunset.png,15,image/png,2026-06-07T10:22:41Z`,
      },
      {
        label: 'Get object',
        cmd: 'curl -i http://localhost:8080/photos/sunset.png',
        out: `HTTP/1.1 200 OK
Content-Type: image/png
Content-Length: 15

fake-image-data`,
      },
      {
        label: 'Delete non-empty bucket',
        cmd: 'curl -i -X DELETE http://localhost:8080/photos',
        out: `HTTP/1.1 409 Conflict
Content-Type: application/xml

<Error><Code>BucketNotEmpty</Code><Message>The bucket you tried to delete is not empty</Message></Error>`,
      },
    ],
  },

  creditcard: {
    cwd: '~/creditcard',
    session: [
      { label: 'Validate', cmd: './creditcard validate "4400430180300003"', out: 'OK' },
      { label: 'Invalid number', cmd: './creditcard validate "4400430180300002"; echo "exit $?"', out: 'INCORRECT\nexit 1' },
      {
        label: 'Generate',
        cmd: './creditcard generate "440043018030****" | head -3',
        out: '4400430180300003\n4400430180300011\n4400430180300029',
      },
      { label: 'Random pick', cmd: './creditcard generate --pick "440043018030****"', out: '4400430180304385' },
      {
        label: 'Information',
        cmd: './creditcard information --brands=data/brands.txt --issuers=data/issuers.txt "4400430180300003"',
        out: '4400430180300003\nCorrect: yes\nCard Brand: VISA\nCard Issuer: Kaspi Gold',
      },
      {
        label: 'Issue',
        cmd: './creditcard issue --brands=data/brands.txt --issuers=data/issuers.txt --brand=VISA --issuer="Kaspi Gold"',
        out: '4400430180300003',
      },
      {
        label: 'Via stdin',
        cmd: 'echo "4400430180300003 4400430180300011" | ./creditcard validate --stdin',
        out: 'OK\nOK',
      },
    ],
  },

  markov: {
    cwd: '~/markov-chain',
    session: [
      {
        label: 'Generate',
        cmd: 'echo "Bad programmers worry about code. Good programmers worry about data structures and their relationships." | ./markovchain',
        out: 'Bad programmers worry about data structures and their relationships. Good programmers worry about code.',
      },
      {
        label: 'Max 10 words',
        cmd: 'cat the_great_gatsby.txt | ./markovchain -w 10',
        out: 'Chapter 1 In my younger and more vulnerable years my',
      },
      {
        label: 'Custom prefix',
        cmd: 'cat the_great_gatsby.txt | ./markovchain -w 10 -p "to play"',
        out: 'to play for you in that huge incoherent failure of',
      },
      {
        label: 'Prefix not found',
        cmd: 'cat the_great_gatsby.txt | ./markovchain -p "something missing"',
        out: 'Error: prefix not found in text',
      },
      { label: 'Bad prefix length', cmd: 'cat the_great_gatsby.txt | ./markovchain -l 10', out: 'Error: prefix length must be ≤ 5' },
      { label: 'No input', cmd: './markovchain', out: 'Error: no input text' },
    ],
  },

  csv: {
    cwd: '~/a-library-for-others',
    session: [
      {
        label: 'Parse file',
        cmd: 'cat people.csv && go run . people.csv',
        out: `Alice,20,London
"Smith, Bob",34,"New ""York"""

Line 1: "Alice,20,London"
Fields: 3
  Field 1: Alice
  Field 2: 20
  Field 3: London
Line 2: "\\"Smith, Bob\\",34,\\"New \\"\\"York\\"\\"\\""
Fields: 3
  Field 1: Smith, Bob
  Field 2: 34
  Field 3: New "York"`,
      },
      {
        label: 'Empty fields',
        cmd: 'printf \'a,,c\\n,,\' | go run .',
        out: `Line 1: "a,,c"
Fields: 3
  Field 1: a
  Field 2:
  Field 3: c
Line 2: ",,"
Fields: 3`,
      },
      {
        label: 'Broken quotes',
        cmd: 'printf \'ok,1\\n"broken,2\\nnever,3\' | go run .',
        out: `Line 1: "ok,1"
Fields: 2
  Field 1: ok
  Field 2: 1
Error: extra or missing " in quoted-field      # ErrQuote — reading stops`,
      },
      { label: 'Tests', cmd: 'go test ./internal/...', out: 'ok   csvparser/internal   0.006s' },
    ],
  },

  bitmap: {
    cwd: '~/bitmap',
    session: [
      {
        label: 'Header',
        cmd: './bitmap header sample.bmp',
        out: `BMP Header:
- FileType: BM
- FileSizeInBytes: 518456
- HeaderSize: 54

DIB Header:
- DibHeaderSize: 40
- WidthInPixels: 480
- HeightInPixels: 360
- PixelSizeInBits: 24
- ImageSizeInBytes: 518402`,
      },
      {
        label: 'Mirror',
        cmd: './bitmap apply --mirror=horizontal sample.bmp mirrored.bmp',
        out: 'Saved mirrored.bmp (480x360)',
      },
      {
        label: 'Chain operations',
        cmd: './bitmap apply --mirror=horizontal --rotate=right \\\n  --filter=negative --filter=grayscale sample.bmp out.bmp',
        out: `mirror: horizontal
rotate: right (90°)
filter: negative
filter: grayscale
Saved out.bmp (360x480)`,
      },
      {
        label: 'Crop',
        cmd: './bitmap apply --crop=20-20-100-100 sample.bmp crop.bmp',
        out: 'Saved crop.bmp (100x100)',
      },
      {
        label: 'Crop out of bounds',
        cmd: './bitmap apply --crop=400-300-200-200 sample.bmp crop.bmp',
        out: 'Error: crop area 400-300-200-200 exceeds image bounds 480x360',
      },
      {
        label: 'Wrong format',
        cmd: './bitmap header photo.png',
        out: 'Error: photo.png is not an uncompressed 24-bit BMP file',
      },
    ],
  },
}
