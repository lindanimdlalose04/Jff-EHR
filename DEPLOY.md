# Deploying JFF EHR on the Ubuntu box with a free Cloudflare tunnel

This runs the whole EHR (front end + API) in Docker on your always-on Ubuntu
machine and publishes it on a free public HTTPS link, so Sr Gail Buys can log in
and use it on her own without your laptop being on. Nothing is installed on the
box except Docker containers; `docker compose down` removes it all.

The public URL is a Cloudflare "quick tunnel" (`*.trycloudflare.com`): completely
free, no domain, no Cloudflare login. The URL stays put while the tunnel container
keeps running, and changes only if that container restarts.

---

## What you need on the box
- Docker (you have it).
- git.  If missing: `sudo apt update && sudo apt install -y git`
- The repository, with the latest code pushed from your laptop (see step 1).

## Step 0 (optional but recommended): turn on SSH so you can paste commands
On the Ubuntu box, once:
```
sudo apt update && sudo apt install -y openssh-server
ip addr        # note the box's LAN IP, e.g. 192.168.1.50
```
Then from your laptop terminal: `ssh your-user@192.168.1.50` and run the rest
there by pasting.

## Step 1 (on your laptop): push the latest code
Make sure everything, including the new `Dockerfile`, `docker-compose.yml`,
`.env.example` and the API change, is committed and pushed to GitHub. The box
pulls the code from there.

## Step 2 (on the box): get the code
```
git clone <your-repo-url> jff-ehr
cd jff-ehr
```
If the repo is private you will be asked to authenticate (use a GitHub personal
access token as the password, or an SSH deploy key). Alternatively, since the box
is your NAS, copy the project folder onto it over the network share instead of
cloning.

Note: the `Dockerfile` and `docker-compose.yml` live at the repository root (the
folder that contains `jff-ehr-frontend` and `jff-ehr-backend`). Run the commands
below from that folder.

## Step 3 (on the box): create the .env file
```
cp .env.example .env
nano .env
```
Fill in the three values. Where to get each, from your laptop:

- **VITE_SUPABASE_URL** and **VITE_SUPABASE_ANON_KEY**: from your frontend env
  file `jff-ehr-frontend/jff-ehr/.env.local` (or `.env`), or from the Supabase
  dashboard under Project Settings, API (Project URL and the `anon public` key).
  The anon key is a public client key; it is meant to ship in the browser.
- **JFF_DB_CONNECTION**: the restricted `jff_api` connection string. On your
  laptop, in `jff-ehr-backend/JffEhr.Api`, run `dotnet user-secrets list` and copy
  the value of `ConnectionStrings:JffEhrDb` (the one whose username starts with
  `jff_api`). Do not use the `postgres` migrations connection here.

Save and exit (in nano: Ctrl+O, Enter, Ctrl+X).

## Step 4 (on the box): build and start
```
docker compose up -d --build
```
The first build takes a few minutes (it compiles the front end and the API). When
it finishes, both containers are running in the background.

## Step 5 (on the box): read the public URL
```
docker compose logs cloudflared | grep trycloudflare
```
You will see a line with a URL like `https://random-words.trycloudflare.com`.
That is the link. Open it in a browser to confirm the login page loads.

## Step 6: hand it to Gail
Send Gail the URL and the four account logins you use (the medical and admin
accounts). She logs in and works through your evaluation form on her own. Because
the app talks to your live Supabase database, whatever she does is saved as real
records, which is what you want for the evaluation.

---

## Managing it
- See status: `docker compose ps`
- Live logs: `docker compose logs -f`
- Stop everything: `docker compose down`
- Update after new code: `git pull` then `docker compose up -d --build`
- Restart just the tunnel (this changes the public URL): `docker compose restart cloudflared`

## Cautions to note in your write-up
- The `trycloudflare` URL is not permanent: if the tunnel container restarts, the
  URL changes and you resend the new one. For a short evaluation window this is
  fine; keep the containers running for the duration.
- The app uses your live Supabase data. Consider rotating the demo account
  passwords after the evaluation.
- File uploads (a consent PDF, or a camper/crew photo from the computer) only work
  if the `consent-documents` Supabase Storage bucket exists. Everything else,
  including pasting a document URL, works without it. If Gail's tasks include an
  upload, create that bucket first (public, with an authenticated insert policy).
