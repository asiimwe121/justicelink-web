# JusticeLink Uganda

A legal-aid platform connecting Ugandan citizens with lawyers, Local Council (LC) officials, legal organizations, and District Administrators.

## Live

- https://justicelinkug.org
- https://justicelinkug.com

## Architecture

| Layer | Technology |
|---|---|
| Backend | Spring Boot 3.5.13 (Java 17) |
| Database | MySQL 8.4 (Docker) |
| Frontend | Vanilla HTML / CSS / JavaScript |
| Reverse Proxy | Nginx (HTTPS via Let's Encrypt) |
| CDN / SSL | Cloudflare (Full Strict) |
| Email (transactional) | Brevo |
| Email (mailbox) | Zoho Mail (support@justicelinkug.org) |
| SMS | Africa's Talking |
| Maps | Google Maps Platform |
| AI / RAG | Hugging Face (Llama 3.3 + MiniLM embeddings) |
| Hosting | AWS EC2 (eu-north-1, Stockholm) |
| Containerization | Docker + Docker Compose |

## Project Structure
lcdjp-project/
├── frontend/
│ └── lcdjp/
│ ├── src/main/java/lcdjp/ # Spring Boot source
│ ├── src/main/resources/
│ │ ├── application.properties # Main config
│ │ ├── application-docker.properties
│ │ ├── db/migration/ # Flyway migrations
│ │ └── static/ # HTML, CSS, JS
│ ├── Dockerfile
│ ├── docker-compose.yml
│ ├── pom.xml
│ └── .env.example
├── legal-knowledge/ # Legal PDF library (Uganda laws)
└── README.md
