# Secrets

## Where configuration lives

| File | Purpose | Served over the web? |
|---|---|---|
| `src/main/resources/application.properties` | Main settings. Contains **no secrets**, only `${ENV_VAR}` placeholders. | **No.** It sits on the classpath root, not in `static/`. |
| `src/main/resources/application-docker.properties` | Overrides when `SPRING_PROFILES_ACTIVE=docker`. Placeholders only. | No |
| `src/test/resources/application-test.properties` | Throw-away values for unit tests. Not packaged into the production jar. | No |
| `.env` (on the server, **not in git**) | The real values. See `.env.example` for every variable. | No |

Only `src/main/resources/static/` is downloadable by visitors. `StaticResourcesSafetyTest` fails the build if a
`.properties`, `.sql`, `.md`, key or similar file is placed there.

## Rotate these now (the old file was public)

Treat every value that was ever in the public `application.properties` as compromised. Rotating means creating a
new value, putting it in the server environment, restarting, and **revoking the old one**.

| Secret | Where to rotate | Notes |
|---|---|---|
| `DB_PASSWORD` | MySQL: `ALTER USER 'user'@'%' IDENTIFIED BY '...'` | Also change the root password used by `ops/backup-db.sh`. |
| `JWT_SECRET` | Generate with `openssl rand -base64 64` | Changing it signs everyone out, which is what you want here. |
| `SYSTEM_ADMIN_INITIAL_PASSWORD` | Log in as System Admin and change the password | The variable only matters on first creation; change the live account too. |
| `BREVO_API_KEY` | Brevo dashboard > SMTP & API > API keys | Create new, delete old. |
| `HUGGINGFACE_API_KEY` | huggingface.co > Settings > Access Tokens | Revoke old token. |
| `GOOGLE_MAPS_API_KEY` | Google Cloud Console > Credentials | Regenerate and restrict by API and by referrer/IP. |
| `RECAPTCHA_SECRET_KEY` | Google reCAPTCHA admin | Create a new key pair; update the site key in the environment too. |
| `REDIS_PASSWORD` | Redis `requirepass` | If Redis was exposed with a password in that file. |
| `AT_API_KEY` | Africa's Talking > Settings > API Key | Only if it was ever in the old file. |

Then check the provider dashboards (Brevo, Google, Hugging Face, Africa's Talking) for usage you do not recognise
between the day the file went public and the day you rotated.

## Remove the old values from git history

Rotating makes the old values useless. History can still show them, which looks bad in a review, so clean it:

1. `pip install git-filter-repo`
2. `git filter-repo --path src/main/resources/static/application.properties --invert-paths`
   (use the exact path the file had in your repository)
3. Force-push, and ask everyone with a clone to re-clone.

If the repository is public, assume the values were already copied and rely on rotation, not on the clean-up.

## Keeping it clean

* CI runs a secret scan (`secret-scan` job in `.github/workflows/ci.yml`) over the working tree on every push.
* The Google Maps **public** key is sent to browsers by design. Restrict it to your domain in Google Cloud.
* Never put real values in `application.properties`, in `static/`, in `docker-compose.yml`, or in a screenshot.
