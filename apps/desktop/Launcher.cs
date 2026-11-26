using System;
using System.Diagnostics;
using System.IO;
using System.Threading;

internal static class Launcher {
    private const string Origin = "chrome-extension://gnjjgfaigfdmkfmjmjnokalgifpjfccd/";
    internal static int Main(string[] args) {
        if (args.Length < 1 || args[0] != Origin) return 1;
        // Serialize browser profiles against the same user's queue.
        using (var mutex = new Mutex(false, @"Local\DownloadIT-" + System.Security.Principal.WindowsIdentity.GetCurrent().User.Value)) {
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
                    var input = Console.OpenStandardInput().CopyToAsync(child.StandardInput.BaseStream);
                    input.ContinueWith(task => { try { child.StandardInput.Close(); } catch (IOException) { } });
                    child.StandardOutput.BaseStream.CopyToAsync(Console.OpenStandardOutput()).GetAwaiter().GetResult();
                    child.WaitForExit();
                    return child.ExitCode;
                }
            } finally { mutex.ReleaseMutex(); }
        }
    }
}
