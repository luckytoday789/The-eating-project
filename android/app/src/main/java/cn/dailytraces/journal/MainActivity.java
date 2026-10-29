package cn.dailytraces.journal;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.AtomicFile;
import android.view.HapticFeedbackConstants;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/** Offline app: only immutable packaged resources can execute inside this WebView. */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START = "https://" + HOST + "/assets/www/index.html";
    private static final int PICK_BACKUP = 41, SAVE_BACKUP = 42;
    private static final int MAX_BYTES = 5 * 1024 * 1024;
    private final ExecutorService files = Executors.newSingleThreadExecutor();
    private final AtomicBoolean exportInFlight = new AtomicBoolean(false);
    private WebView web;
    private LinearLayout root;
    private ValueCallback<Uri[]> fileCallback;
    private boolean keyboardVisible;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(245, 241, 232));
        getWindow().setNavigationBarColor(Color.rgb(255, 252, 245));
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(245, 241, 232));
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                android.graphics.Insets ime = insets.getInsets(WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
                boolean visible = insets.isVisible(WindowInsets.Type.ime());
                if (visible != keyboardVisible && web != null) {
                    keyboardVisible = visible;
                    web.evaluateJavascript("document.body?.classList.toggle('native-keyboard-open'," + visible + ")", null);
                }
                return insets;
            });
        }
        setContentView(root);
        if (state != null && state.getBoolean("pendingExport") && exportFile().exists()) exportInFlight.set(true);
        openWeb();
    }

    @SuppressWarnings("SetJavaScriptEnabled") private void openWeb() {
        PackageInfo engine = WebView.getCurrentWebViewPackage();
        try {
            if (engine != null && Integer.parseInt(engine.versionName.split("\\.")[0]) < 107) {
                showRecovery("请先更新手机的 Android System WebView 或 Chrome，再打开日常有迹。已保存的记录会保留。", false);
                return;
            }
        } catch (NumberFormatException ignored) { }
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(245, 241, 232));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setHapticFeedbackEnabled(true);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // Only document URIs explicitly chosen by the user.
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setUserAgentString(settings.getUserAgentString() + " DailyTracesAndroid/" + BuildConfig.VERSION_NAME);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        CookieManager.getInstance().setAcceptCookie(false);
        web.addJavascriptInterface(new JournalBridge(), "AndroidJournal");
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (!"GET".equals(request.getMethod()) || !local(request.getUrl())) return blocked(403);
                String path = request.getUrl().getPath();
                if (path == null || !path.startsWith("/assets/www/") || path.contains("..") || path.contains("\\") || !path.matches("[a-zA-Z0-9_./-]+")) return blocked(404);
                String relative = path.substring("/assets/".length());
                String mime = mime(path);
                if (mime == null) return blocked(404);
                try {
                    InputStream input = getAssets().open(relative);
                    Map<String, String> headers = new HashMap<>();
                    headers.put("Cache-Control", "no-store");
                    headers.put("X-Content-Type-Options", "nosniff");
                    headers.put("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'");
                    return new WebResourceResponse(mime, "UTF-8", 200, "OK", headers, input);
                } catch (Exception error) { return blocked(404); }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !local(request.getUrl());
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (local(Uri.parse(url))) view.evaluateJavascript("document.body.classList.add('android-app');window.dispatchEvent(new Event('journal:native-ready'))", null);
            }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                root.removeView(view);
                view.destroy(); web = null;
                showRecovery("界面暂时停止，已保存的记录仍在本机。", true);
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                pick.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/json", "text/plain", "application/octet-stream"});
                try { startActivityForResult(pick, PICK_BACKUP); }
                catch (ActivityNotFoundException error) { fileCallback.onReceiveValue(null); fileCallback = null; toast("未找到文件选择器"); }
                return true;
            }
            @Override public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("知道了", (d, w) -> result.confirm()).setOnCancelListener(d -> result.confirm()).show(); return true;
            }
            @Override public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("确定", (d, w) -> result.confirm()).setNegativeButton("取消", (d, w) -> result.cancel()).setOnCancelListener(d -> result.cancel()).show(); return true;
            }
            @Override public boolean onConsoleMessage(ConsoleMessage message) {
                if (BuildConfig.DEBUG) android.util.Log.d("DailyTraces", message.message());
                return true;
            }
        });
        root.removeAllViews();
        root.addView(web, new LinearLayout.LayoutParams(-1, -1));
        web.loadUrl(START);
    }

    private static boolean local(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost()) && uri.getPort() == -1 && uri.getUserInfo() == null;
    }
    private static String mime(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".svg")) return "image/svg+xml";
        return null;
    }
    private static WebResourceResponse blocked(int code) {
        return new WebResourceResponse("text/plain", "UTF-8", code, code == 403 ? "Forbidden" : "Not Found", new HashMap<>(), new ByteArrayInputStream(new byte[0]));
    }
    private void showRecovery(String message, boolean retry) {
        root.removeAllViews();
        TextView notice = new TextView(this); notice.setText(message); notice.setTextSize(17); notice.setTextColor(Color.rgb(88, 92, 66)); notice.setPadding(32, 48, 32, 24); root.addView(notice);
        if (retry) { Button button = new Button(this); button.setText("重新打开"); button.setOnClickListener(v -> openWeb()); root.addView(button); }
    }
    private File exportFile() { return new File(getCacheDir(), "pending-backup.json"); }
    private static boolean validRecord(String json) {
        try { return json != null && json.getBytes(StandardCharsets.UTF_8).length <= MAX_BYTES && new JSONObject(json).optInt("version") == 1 && new JSONObject(json).optJSONObject("days") != null; }
        catch (Exception ignored) { return false; }
    }
    private static byte[] readLimited(InputStream input) throws Exception {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] chunk = new byte[8192]; int count;
        while ((count = input.read(chunk)) != -1) {
            if (buffer.size() + count > MAX_BYTES) throw new IllegalArgumentException("备份超过 5MB");
            buffer.write(chunk, 0, count);
        }
        return buffer.toByteArray();
    }

    public final class JournalBridge {
        @JavascriptInterface public boolean isAndroid() { return true; }
        @JavascriptInterface public String getVersion() { return BuildConfig.VERSION_NAME; }
        @JavascriptInterface public void haptic(String kind) {
            runOnUiThread(() -> {
                if (web == null || isFinishing()) return;
                int feedback = HapticFeedbackConstants.CLOCK_TICK;
                if ("success".equals(kind)) feedback = Build.VERSION.SDK_INT >= 30 ? HapticFeedbackConstants.CONFIRM : HapticFeedbackConstants.LONG_PRESS;
                if ("error".equals(kind)) feedback = Build.VERSION.SDK_INT >= 30 ? HapticFeedbackConstants.REJECT : HapticFeedbackConstants.LONG_PRESS;
                web.performHapticFeedback(feedback);
            });
        }
        @JavascriptInterface public synchronized boolean saveSnapshot(String json) {
            if (!validRecord(json)) return false;
            AtomicFile snapshot = new AtomicFile(new File(getFilesDir(), "journal-latest.json"));
            FileOutputStream output = null;
            try { output = snapshot.startWrite(); output.write(json.getBytes(StandardCharsets.UTF_8)); snapshot.finishWrite(output); return true; }
            catch (Exception error) { if (output != null) snapshot.failWrite(output); return false; }
        }
        @JavascriptInterface public synchronized String loadSnapshot() {
            AtomicFile snapshot = new AtomicFile(new File(getFilesDir(), "journal-latest.json"));
            try (InputStream input = snapshot.openRead()) { String json = new String(readLimited(input), StandardCharsets.UTF_8); return validRecord(json) ? json : ""; }
            catch (Exception ignored) { return ""; }
        }
        @JavascriptInterface public void exportBackup(String json, String filename) {
            if (!validRecord(json)) { runOnUiThread(() -> toast("备份格式无效或超过 5MB")); return; }
            queueExport(json, filename);
        }
        @JavascriptInterface public void exportRawBackup(String raw, String filename) {
            // Recovery must preserve malformed text without attempting to parse it.
            if (raw == null || raw.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
                runOnUiThread(() -> toast("原始数据超过 5MB，无法导出")); return;
            }
            queueExport(raw, filename);
        }
        private void queueExport(String json, String filename) {
            if (!exportInFlight.compareAndSet(false, true)) { runOnUiThread(() -> toast("请先完成当前备份保存")); return; }
            String safeName = filename == null ? "日常有迹-备份.json" : filename.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_");
            if (safeName.length() > 100) safeName = safeName.substring(0, 95) + ".json";
            if (!safeName.endsWith(".json")) safeName += ".json";
            final String title = safeName;
            files.execute(() -> {
                try {
                    try (FileOutputStream output = new FileOutputStream(exportFile())) { output.write(json.getBytes(StandardCharsets.UTF_8)); }
                    runOnUiThread(() -> {
                        if (isFinishing() || isDestroyed()) { exportInFlight.set(false); return; }
                        try { startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json").putExtra(Intent.EXTRA_TITLE, title), SAVE_BACKUP); }
                        catch (ActivityNotFoundException error) { exportInFlight.set(false); exportFile().delete(); toast("未找到文件保存器"); }
                    });
                } catch (Exception error) { exportInFlight.set(false); runOnUiThread(() -> toast("无法准备备份，请重试")); }
            });
        }
    }

    @Override public void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == PICK_BACKUP && fileCallback != null) {
            Uri selected = result == RESULT_OK && data != null ? data.getData() : null;
            if (selected != null && !"content".equals(selected.getScheme())) selected = null;
            fileCallback.onReceiveValue(selected == null ? null : new Uri[]{selected}); fileCallback = null;
        }
        if (request == SAVE_BACKUP) {
            if (result != RESULT_OK || data == null || data.getData() == null) { exportInFlight.set(false); exportFile().delete(); return; }
            final Uri destination = data.getData();
            if (!"content".equals(destination.getScheme())) { exportInFlight.set(false); toast("保存位置无效"); return; }
            files.execute(() -> {
                boolean success = false;
                try (InputStream input = new java.io.FileInputStream(exportFile()); OutputStream output = getContentResolver().openOutputStream(destination, "wt")) {
                    if (output == null) throw new IllegalArgumentException("无法写入所选位置");
                    output.write(readLimited(input)); output.flush(); success = true;
                } catch (Exception ignored) { }
                finally { exportInFlight.set(false); exportFile().delete(); }
                final boolean saved = success;
                runOnUiThread(() -> {
                    toast(saved ? "备份已保存" : "保存失败，请重新导出");
                    if (web != null && !isDestroyed()) web.evaluateJavascript("window.dispatchEvent(new CustomEvent('journal:native-export',{detail:{success:" + saved + "}}))", null);
                });
            });
        }
    }

    @Override protected void onSaveInstanceState(Bundle state) { super.onSaveInstanceState(state); state.putBoolean("pendingExport", exportInFlight.get()); }
    @Override public void onBackPressed() {
        if (web == null) { moveTaskToBack(true); return; }
        web.evaluateJavascript("window.JournalHandleBack?window.JournalHandleBack():(function(){var d=document.querySelector('dialog[open]');if(d){d.close();return true;}if(location.hash&&location.hash!=='#today'){location.hash='today';return true;}return false;})()", handled -> { if (!"true".equals(handled)) moveTaskToBack(true); });
    }
    @Override protected void onResume() { super.onResume(); if (web != null) { web.onResume(); web.evaluateJavascript("window.dispatchEvent(new Event('journal:native-resume'))", null); } }
    @Override protected void onPause() { if (web != null) { web.evaluateJavascript("window.dispatchEvent(new Event('journal:native-pause'))", null); web.onPause(); } super.onPause(); }
    @Override protected void onDestroy() {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        if (web != null) { root.removeView(web); web.removeJavascriptInterface("AndroidJournal"); web.destroy(); web = null; }
        files.shutdown(); super.onDestroy();
    }
    private void toast(String message) { if (!isDestroyed()) Toast.makeText(this, message, Toast.LENGTH_SHORT).show(); }
    WebView testWebView() { return web; }
}
