using System.Text.Json.Serialization;

namespace DepVault.Cli.Crypto;

[JsonSerializable(typeof(Dictionary<string, string>))]
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
internal partial class CryptoJsonContext : JsonSerializerContext;
