using System;
using System.Diagnostics;
using System.IO;
using System.Threading;

internal static class Launcher {
    private static async System.Threading.Tasks.Task Pump(Stream source, Stream destination) {
        var buffer = new byte[16384];
        int count;
        while ((count = await source.ReadAsync(buffer,0,buffer.Length)) != 0) {
            await destination.WriteAsync(buffer,0,count);
            await destination.FlushAsync();
        }
    }
    private const string Origin = "chrome-extension://gnjjgfaigfdmkfmjmjnokalgifpjfccd/";
    internal static int Main(string[] args) {
        if (args.Length == 1 && (args[0] == "protect" || args[0] == "unprotect")) {
            using (var input = Console.OpenStandardInput())
            using (var memory = new MemoryStream()) {
                var block = new byte[4096]; int count;
                while ((count = input.Read(block,0,block.Length)) > 0) {
                    if (memory.Length + count > 65536) return 1;
                    memory.Write(block,0,count);
                }
                var scope = System.Security.Cryptography.DataProtectionScope.CurrentUser;
                var output = args[0] == "protect" ? System.Security.Cryptography.ProtectedData.Protect(memory.ToArray(),null,scope)
                    : System.Security.Cryptography.ProtectedData.Unprotect(memory.ToArray(),null,scope);
                Console.OpenStandardOutput().Write(output,0,output.Length);
                return 0;
            }
        }
        if (args.Length < 1 || args[0] != Origin) return 1;
        // Serialize browser profiles against the same user's queue.
        using (var mutex = new Mutex(false, @"Global\DownloadIT-" + System.Security.Principal.WindowsIdentity.GetCurrent().User.Value)) {
            try { if (!mutex.WaitOne(0)) return 2; } catch (AbandonedMutexException) { }
            try {
                var root = AppDomain.CurrentDomain.BaseDirectory;
                var node = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"nodejs\node.exe");
                var host = Path.Combine(root, "host.mjs");
                var start = new ProcessStartInfo(node, "\"" + host + "\" " + Origin);
                start.UseShellExecute = false;
                start.RedirectStandardInput = true;
                start.RedirectStandardOutput = true;
                start.CreateNoWindow = true;
                start.WorkingDirectory = root;
                foreach (var key in new[]{"NODE_OPTIONS","NODE_PATH","NODE_EXTRA_CA_CERTS","NODE_TLS_REJECT_UNAUTHORIZED","SSL_CERT_FILE","SSL_CERT_DIR","NODE_USE_ENV_PROXY"}) start.EnvironmentVariables.Remove(key);
                using (var child = Process.Start(start)) {
                    var input = Pump(Console.OpenStandardInput(),child.StandardInput.BaseStream);
                    input.ContinueWith(task => { try { child.StandardInput.Close(); } catch (IOException) { } });
                    Pump(child.StandardOutput.BaseStream,Console.OpenStandardOutput()).GetAwaiter().GetResult();
                    child.WaitForExit();
                    return child.ExitCode;
                }
            } finally { mutex.ReleaseMutex(); }
        }
    }
}
