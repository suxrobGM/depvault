using System.CommandLine;
using DepVault.Cli.Services;

namespace DepVault.Cli.Commands;

public sealed class UpdateCommands(IUpdateService updateService)
{
    public Command CreateUpdateCommand()
    {
        var cmd = new Command("update", "Update DepVault CLI to the latest version");

        cmd.SetAction(async (_, cancellationToken) =>
        {
            await updateService.UpdateAsync(cancellationToken);
        });

        return cmd;
    }
}
