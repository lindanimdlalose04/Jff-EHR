# JFF EHR: one image that builds the React front end, bundles it into the
# ASP.NET Core API's wwwroot, and serves both from a single origin on port 8080.
# Build context is the repository root (the folder that holds jff-ehr-frontend
# and jff-ehr-backend).

# ---- Stage 1: build the React front end ----
FROM node:20-slim AS frontend
WORKDIR /fe
COPY jff-ehr-frontend/jff-ehr/package*.json ./
RUN npm ci
COPY jff-ehr-frontend/jff-ehr/ ./
# Public, build-time configuration. VITE_API_BASE_URL is relative because the
# API is served from the same origin. The Supabase anon key is a public key and
# is safe to bake into the client bundle.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_API_BASE_URL=/api \
    VITE_SUPABASE_URL=${VITE_SUPABASE_URL} \
    VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
RUN npm run build

# ---- Stage 2: build and publish the .NET API, bundling the SPA ----
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend
WORKDIR /src
COPY jff-ehr-backend/JffEhr.Api/JffEhr.Api.csproj ./JffEhr.Api/
RUN dotnet restore ./JffEhr.Api/JffEhr.Api.csproj
COPY jff-ehr-backend/JffEhr.Api/ ./JffEhr.Api/
# Bundle the built SPA so the API serves it as static files (same origin).
COPY --from=frontend /fe/dist ./JffEhr.Api/wwwroot/
RUN dotnet publish ./JffEhr.Api/JffEhr.Api.csproj -c Release -o /app /p:UseAppHost=false

# ---- Stage 3: runtime ----
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=backend /app ./
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
ENTRYPOINT ["dotnet", "JffEhr.Api.dll"]
