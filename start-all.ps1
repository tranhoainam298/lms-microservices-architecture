Start-Process -NoNewWindow -FilePath "node" -ArgumentList "src/server.js" -WorkingDirectory "user-service"
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "src/server.js" -WorkingDirectory "course-service"
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "index.js" -WorkingDirectory "payment-service"
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "index.js" -WorkingDirectory "ai-service"
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "src/server.js" -WorkingDirectory "api-gateway"
Start-Process -NoNewWindow -FilePath "dotnet" -ArgumentList "run" -WorkingDirectory "exam-service"

Write-Host "All backend services started."
