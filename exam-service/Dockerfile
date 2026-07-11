FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ExamService.csproj ./
RUN dotnet restore ExamService.csproj
COPY Program.cs ./
COPY appsettings.json appsettings.Development.json ./
COPY Controllers ./Controllers
COPY Data ./Data
COPY DTOs ./DTOs
COPY Models ./Models
RUN dotnet publish ExamService.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish ./
EXPOSE 5003
ENTRYPOINT ["dotnet", "ExamService.dll"]

