using Microsoft.Kiota.Abstractions.Authentication;
using Microsoft.Kiota.Abstractions.Serialization;
using Microsoft.Kiota.Http.HttpClientLibrary;
using Microsoft.Kiota.Serialization.Form;
using Microsoft.Kiota.Serialization.Json;
using Microsoft.Kiota.Serialization.Multipart;
using Microsoft.Kiota.Serialization.Text;
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
        var httpClient = new HttpClient(new JsonContentTypeHandler())
        {
            BaseAddress = new Uri(config.Server)
        };

        var adapter = new HttpClientRequestAdapter(authProvider, httpClient: httpClient)
        {
            BaseUrl = config.Server
        };

        _client = new KiotaClient.ApiClient(adapter);
        RegisterSerializers();
        return _client;
    }

    /// <summary>
    /// Registers Kiota serializers explicitly for Native AOT compatibility.
    /// The auto-generated ApiClient constructor uses Activator.CreateInstance which
    /// gets trimmed by the AOT compiler, leaving the registries empty.
    /// </summary>
    private static void RegisterSerializers()
    {
        SerializationWriterFactoryRegistry.DefaultInstance.ContentTypeAssociatedFactories.Clear();
        SerializationWriterFactoryRegistry.DefaultInstance.ContentTypeAssociatedFactories["application/json"] = new JsonSerializationWriterFactory();
        SerializationWriterFactoryRegistry.DefaultInstance.ContentTypeAssociatedFactories["text/plain"] = new TextSerializationWriterFactory();
        SerializationWriterFactoryRegistry.DefaultInstance.ContentTypeAssociatedFactories["application/x-www-form-urlencoded"] = new FormSerializationWriterFactory();
        SerializationWriterFactoryRegistry.DefaultInstance.ContentTypeAssociatedFactories["multipart/form-data"] = new MultipartSerializationWriterFactory();

        ParseNodeFactoryRegistry.DefaultInstance.ContentTypeAssociatedFactories.Clear();
        ParseNodeFactoryRegistry.DefaultInstance.ContentTypeAssociatedFactories["application/json"] = new JsonParseNodeFactory();
        ParseNodeFactoryRegistry.DefaultInstance.ContentTypeAssociatedFactories["text/plain"] = new TextParseNodeFactory();
        ParseNodeFactoryRegistry.DefaultInstance.ContentTypeAssociatedFactories["application/x-www-form-urlencoded"] = new FormParseNodeFactory();
    }
}

/// <summary>
/// Rewrites response Content-Type from text/plain to application/json when the body is JSON.
/// Required because the production reverse proxy returns JSON with text/plain content type.
/// </summary>
internal sealed class JsonContentTypeHandler : DelegatingHandler
{
    public JsonContentTypeHandler() : base(new HttpClientHandler()) { }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var response = await base.SendAsync(request, cancellationToken);

        if (string.Equals(response.Content.Headers.ContentType?.MediaType, "text/plain", StringComparison.OrdinalIgnoreCase))
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            if (body.Length > 0 && body[0] is '{' or '[')
            {
                var newContent = new StringContent(body, System.Text.Encoding.UTF8, "application/json");
                response.Content = newContent;
            }
        }

        return response;
    }
}
