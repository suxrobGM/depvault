using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using DepVault.Cli.Config;

namespace DepVault.Cli.Auth;

/// <summary>
///     DelegatingHandler that intercepts 401 responses and attempts to refresh
///     the access token using the stored refresh token before retrying.
/// </summary>
internal sealed class TokenRefreshHandler(ICredentialStore credentialStore, string serverBaseUrl)
    : DelegatingHandler
{
    private readonly SemaphoreSlim refreshLock = new(1, 1);
    private bool hasRefreshed;

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var response = await base.SendAsync(request, cancellationToken);

        if (response.StatusCode != HttpStatusCode.Unauthorized)
        {
            return response;
        }

        if (hasRefreshed)
        {
            return response;
        }

        var credentials = credentialStore.Load();
        if (credentials is null || string.IsNullOrEmpty(credentials.RefreshToken))
        {
            return response;
        }

        await refreshLock.WaitAsync(cancellationToken);
        try
        {
            if (hasRefreshed)
            {
                return response;
            }

            var newTokens = await TryRefreshAsync(credentials.RefreshToken, cancellationToken);
            if (newTokens is null)
            {
                return response;
            }

            credentialStore.Save(new StoredCredentials
            {
                AccessToken = newTokens.AccessToken,
                RefreshToken = newTokens.RefreshToken,
                UserId = credentials.UserId,
                Email = credentials.Email
            });
            hasRefreshed = true;

            response.Dispose();
            var retry = await CloneAndRetryAsync(request, newTokens.AccessToken, cancellationToken);
            return retry;
        }
        finally
        {
            refreshLock.Release();
        }
    }

    private async Task<RefreshResponse?> TryRefreshAsync(
        string refreshToken, CancellationToken cancellationToken)
    {
        try
        {
            using var refreshRequest = new HttpRequestMessage(HttpMethod.Post,
                $"{serverBaseUrl.TrimEnd('/')}/auth/refresh");
            refreshRequest.Headers.Add("Cookie", $"refresh_token={refreshToken}");

            using var refreshResponse = await base.SendAsync(refreshRequest, cancellationToken);
            if (!refreshResponse.IsSuccessStatusCode)
            {
                return null;
            }

            var json = await refreshResponse.Content.ReadAsStringAsync(cancellationToken);
            return JsonSerializer.Deserialize(json, RefreshJsonContext.Default.RefreshResponse);
        }
        catch
        {
            return null;
        }
    }

    private async Task<HttpResponseMessage> CloneAndRetryAsync(
        HttpRequestMessage original, string newAccessToken, CancellationToken cancellationToken)
    {
        var clone = new HttpRequestMessage(original.Method, original.RequestUri);

        foreach (var header in original.Headers)
        {
            if (string.Equals(header.Key, "Authorization", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            clone.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }

        clone.Headers.TryAddWithoutValidation("Authorization", $"Bearer {newAccessToken}");

        if (original.Content is not null)
        {
            var contentBytes = await original.Content.ReadAsByteArrayAsync(cancellationToken);
            clone.Content = new ByteArrayContent(contentBytes);

            foreach (var header in original.Content.Headers)
            {
                clone.Content.Headers.TryAddWithoutValidation(header.Key, header.Value);
            }
        }

        return await base.SendAsync(clone, cancellationToken);
    }
}

internal sealed class RefreshResponse
{
    [JsonPropertyName("accessToken")]
    public string AccessToken { get; set; } = "";

    [JsonPropertyName("refreshToken")]
    public string RefreshToken { get; set; } = "";
}

[JsonSerializable(typeof(RefreshResponse))]
internal partial class RefreshJsonContext : JsonSerializerContext;
