{\rtf1\ansi\ansicpg1252\cocoartf2868
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 # myPilotPost \'97 Architecture\
\
## Infrastructure\
\
Backend runtime:\
Cloudflare Workers\
\
Database:\
Cloudflare D1 (SQLite)\
\
Storage:\
Cloudflare R2 (media references)\
\
Feature flags & locks:\
Cloudflare KV\
\
Frontend:\
Cloudflare Pages\
\
Machine Learning:\
Offline Python pipeline (future)\
\
---\
\
# System Layers\
\
1. API Layer\
Cloudflare Workers handles HTTP routing.\
\
2. Engine Layer\
Business logic organized into engines.\
\
3. Persistence Layer\
D1 database stores structured state.\
\
4. Integration Layer\
External APIs (social platforms, Canva, Zapier).\
\
5. Intelligence Layer (future)\
Machine learning recommendations.\
\
---\
\
# Backend Structure\
\
packages/api/\
\
src/\
index.js\
server.js\
\
core/\
content/\
seo/\
campaigns/\
delivery/\
\
admin/\
auth/\
lib/\
constants/\
\
migrations/\
\
wrangler.toml\
\
---\
\
# Engine Responsibilities\
\
## Content Engine\
\
Handles:\
\
- social posts\
- blog articles\
- drafts\
- version history\
- media attachment\
\
---\
\
## Delivery Engine\
\
Handles:\
\
- scheduling\
- delivery jobs\
- retries\
- delivery logs\
\
---\
\
## SEO Engine (V2)\
\
Handles:\
\
- keyword intelligence\
- rank tracking\
- SEO audits\
\
---\
\
## Campaign Engine (V2)\
\
Handles:\
\
- campaign objectives\
- ROI tracking\
- incentive programs\
\
---\
\
# Data Isolation\
\
Every table must include:\
\
brand_id\
\
Every API must filter by:\
\
WHERE brand_id = JWT.brand_id\
\
No cross-brand access allowed.\
\
---\
\
# Media Strategy\
\
Media files are not stored in myPilotPost.\
\
Instead the system stores references to:\
\
- Canva\
- Google Drive\
- Dropbox\
- Uploaded assets\
\
---\
\
# Scheduling Architecture\
\
Scheduling creates delivery jobs.\
\
delivery_jobs table contains:\
\
content_id\
platform\
scheduled_at\
status\
\
Execution occurs via worker cron.\
\
---\
\
# ML Architecture (Future)\
\
ML is external.\
\
ML reads platform data.\
\
ML writes recommendations.\
\
ML never mutates core data.\
\
---\
\
# Deployment\
\
Local development:\
\
wrangler dev\
\
Production deployment:\
\
wrangler deploy}