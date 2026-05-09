{\rtf1\ansi\ansicpg1252\cocoartf2868
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 # myPilotPost System Verification\
\
Run this before any development.\
\
---\
\
## Infrastructure\
\
Worker deploys successfully\
\
/api/health returns OK\
\
Wrangler configuration valid\
\
---\
\
## Database\
\
D1 connection works\
\
Identity tables exist\
\
Admin tables exist\
\
Delivery tables exist\
\
---\
\
## Admin APIs\
\
/api/admin/customers works\
\
/api/admin/billing/overview works\
\
/api/admin/analytics/delivery works\
\
Admin header protection works\
\
---\
\
## Authentication\
\
JWT issued correctly\
\
JWT rejected on admin routes\
\
Brand resolution works\
\
---\
\
## Deployment\
\
Local worker works\
\
Production worker works\
\
No runtime crashes\
\
---\
\
## Result\
\
If all checks pass:\
\
System safe to extend.\
\
Next build phase:\
\
Milestone 1 \'97 Content Engine}