using Microsoft.Kiota.Abstractions.Authentication;
using Microsoft.Kiota.Http.HttpClientLibrary;
using DepVault.Cli.Config;
using KiotaClient = DepVault.Cli.ApiClient;

namespace DepVault.Cli.Auth;

public interface IApiClientFactory
{
    KiotaClient.ApiClient Create();
}

public sealed class ApiClientFactory(IConfigService configService, IAuthenticationProvider authProvider) : IApiClientFactory
{
    private KiotaClient.ApiClient? _client;

    public KiotaClient.ApiClient Create()
    {
        if (_client is not null)
        {
            return _client;
        }

        var config = configService.Load();
        var adapter = new HttpClientRequestAdapter(authProvider)
        {
            BaseUrl = config.Server
        };
        _client = new KiotaClient.ApiClient(adapter);
        return _client;
    }
}
