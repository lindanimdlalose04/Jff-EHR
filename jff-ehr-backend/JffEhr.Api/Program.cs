using JffEhr.Api.Auth;
using JffEhr.Api.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Layer 3: JWT identity, the connection interceptor that carries it into
// Postgres, and RBAC. See Auth/ and Data/UserIdentityConnectionInterceptor.cs.
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IClaimsTransformation, ClinicalRoleClaimsTransformation>();
builder.Services.AddScoped<UserIdentityConnectionInterceptor>();
builder.Services.AddScoped<AuditSaveChangesInterceptor>();
builder.Services.AddSingleton<IAuthorizationHandler, RoleAuthorizationHandler>();

// NoResetOnClose is forced false regardless of what's in config: the identity
// seam relies on Npgsql resetting session state (including our app.current_user_id
// GUC) whenever a pooled physical connection is returned, so one request's
// identity can never leak onto a later, different request's connection.
// Fail fast at startup if the runtime connection string is absent, rather than
// booting an app that throws "Host can't be null" deep inside the auth pipeline
// on every request. The string lives in user-secrets (dev) or the host's
// configuration (production), never in appsettings.json.
var runtimeConnectionString = builder.Configuration.GetConnectionString("JffEhrDb");
if (string.IsNullOrWhiteSpace(runtimeConnectionString))
{
    throw new InvalidOperationException(
        "ConnectionStrings:JffEhrDb is missing or empty. In development, set it with " +
        "'dotnet user-secrets set \"ConnectionStrings:JffEhrDb\" \"<jff_api connection string>\"' " +
        "from the JffEhr.Api folder, then restart.");
}

var connectionStringBuilder = new NpgsqlConnectionStringBuilder(runtimeConnectionString)
{
    NoResetOnClose = false,
};

builder.Services.AddDbContext<JffEhrDbContext>((sp, options) =>
    options.UseNpgsql(connectionStringBuilder.ConnectionString)
        .UseSnakeCaseNamingConvention()
        .AddInterceptors(
            sp.GetRequiredService<UserIdentityConnectionInterceptor>(),
            sp.GetRequiredService<AuditSaveChangesInterceptor>()));

var supabaseUrl = builder.Configuration["Supabase:Url"];
var supabaseAudience = builder.Configuration["Supabase:Audience"] ?? "authenticated";

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Authority drives standard OIDC discovery (.well-known/openid-configuration
        // -> jwks_uri), so the token is validated against Supabase's published JWT
        // signing keys, not a hardcoded secret.
        options.Authority = $"{supabaseUrl}/auth/v1";
        options.Audience = supabaseAudience;

        // Without this, ASP.NET Core silently remaps `sub` to a legacy XML-namespace
        // claim type, breaking every claim lookup in this codebase that reads "sub".
        options.MapInboundClaims = false;
    });

builder.Services.AddAuthorization(options =>
{
    // Exactly two roles, matching users.role_permissions / the layer-2 RLS
    // audit_logs policy literal. Do not add a third without updating both.
    options.AddPolicy("Medical", policy => policy.Requirements.Add(new RoleRequirement("medical")));
    options.AddPolicy("Admin", policy => policy.Requirements.Add(new RoleRequirement("admin")));
    options.AddPolicy("MedicalOrAdmin", policy => policy.Requirements.Add(new RoleRequirement("medical", "admin")));
});

// Dev-only CORS for the Vite dev server (5173; 5174 is Vite's fallback port).
// Applied only inside IsDevelopment() below; production hosting serves the
// built frontend from the same origin and needs no CORS at all.
const string devCorsPolicy = "DevFrontend";
builder.Services.AddCors(options =>
    options.AddPolicy(devCorsPolicy, policy => policy
        .WithOrigins("http://localhost:5173", "http://localhost:5174")
        .AllowAnyHeader()
        .WithMethods("GET", "POST", "PUT", "DELETE")));

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseCors(devCorsPolicy);
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
