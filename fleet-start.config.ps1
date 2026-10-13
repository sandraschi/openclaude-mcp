# Per-repo fleet start config for openclaude-mcp
# Edit ports/backend target here - start.ps1 is fleet-standard.
@{
    Name         = 'openclaude-mcp'
    BackendPort  = 10932
    FrontendPort = 10933
    HealthPath   = '/api/health'
    WebRoot      = 'webapp'
    Backend = @{
        Kind       = 'module-serve'
        Module     = 'openclaude_mcp'
        SyncExtras = @('dev')
        SyncOnStart  = $true
    }
    Frontend = @{
        Kind           = 'vite-npm'
        PackageManager = 'npm'
        PortEnvVar     = 'VITE_PORT'
        ApiTargetEnv   = 'VITE_API_TARGET'
    }
}
