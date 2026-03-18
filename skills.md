{\rtf1\ansi\ansicpg1252\cocoartf2868
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 # myPilotPost \'97 Skills Required\
\
Antigravity must operate with the following capabilities.\
\
---\
\
# Cloudflare Workers\
\
Build HTTP APIs using fetch handler.\
\
Use:\
\
wrangler dev\
wrangler deploy\
\
---\
\
# Cloudflare D1\
\
Execute SQL migrations.\
\
All schema changes must be in migrations/.\
\
Never modify schema outside migrations.\
\
---\
\
# JWT Authentication\
\
Verify tokens for every request.\
\
JWT payload includes:\
\
user_id\
brand_id\
email\
role\
\
---\
\
# Brand Isolation\
\
All customer queries must include:\
\
WHERE brand_id = JWT.brand_id\
\
---\
\
# REST API Design\
\
Endpoints must:\
\
Return JSON\
Use HTTP status codes\
Validate inputs\
\
---\
\
# Scheduling\
\
Use delivery_jobs table.\
\
Conflict rule:\
\
No scheduled jobs within 15 minutes for same platform.\
\
---\
\
# Error Handling\
\
Never crash worker.\
\
Return structured errors.\
\
Example:\
\
\{\
  "error": "Invalid request"\
\}\
\
---\
\
# Testing\
\
Every feature must be tested:\
\
1. Local worker\
2. Local D1\
3. Deployed worker\
4. Production D1\
\
---\
\
# Logging\
\
All errors must be logged to console.\
\
All critical actions must create analytics events.}