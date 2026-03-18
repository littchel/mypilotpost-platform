{\rtf1\ansi\ansicpg1252\cocoartf2868
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 # myPilotPost \'97 API Specification\
\
Base URL\
\
/api\
\
All endpoints require JWT except OAuth start.\
\
---\
\
# Authentication\
\
POST /api/auth/login\
POST /api/auth/logout\
\
---\
\
# Brand\
\
POST /api/customer/brands\
GET /api/customer/brands\
PATCH /api/customer/brands/:id\
\
---\
\
# Social Content\
\
POST /api/customer/content/social\
\
PATCH /api/customer/content/social/:id\
\
GET /api/customer/content/social/:id\
\
---\
\
# Blog Content\
\
POST /api/customer/content/blog\
\
PATCH /api/customer/content/blog/:id\
\
POST /api/customer/content/blog/:id/publish\
\
---\
\
# Media\
\
POST /api/customer/media/upload\
\
GET /api/customer/media\
\
POST /api/customer/media/attach\
\
POST /api/customer/media/detach\
\
---\
\
# Scheduling\
\
POST /api/customer/schedule\
\
GET /api/customer/schedule\
\
PUT /api/customer/schedule/:id\
\
DELETE /api/customer/schedule/:id\
\
---\
\
# Delivery\
\
GET /api/customer/delivery/jobs\
\
---\
\
# Analytics\
\
GET /api/customer/analytics/summary\
\
GET /api/customer/analytics/content/:id\
\
---\
\
# OAuth\
\
GET /api/customer/oauth/:provider/start\
\
GET /api/customer/oauth/:provider/callback\
\
Providers:\
\
facebook\
instagram\
linkedin\
youtube\
tiktok\
pinterest\
threads\
wordpress\
zapier\
\
---\
\
# Admin\
\
GET /api/admin/customers\
\
GET /api/admin/customers/:id\
\
GET /api/admin/analytics/delivery\
\
GET /api/admin/billing/overview}