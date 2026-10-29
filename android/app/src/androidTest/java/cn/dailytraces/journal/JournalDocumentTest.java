package cn.dailytraces.journal;

import android.app.Instrumentation;
import android.app.UiAutomation;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.graphics.Rect;
import android.os.Build;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.os.SystemClock;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.WindowInsets;
import android.view.accessibility.AccessibilityNodeInfo;
import android.webkit.WebView;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.rule.ActivityTestRule;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

/** Uses the real Android DocumentsUI and IME on the project's isolated emulator. */
@RunWith(AndroidJUnit4.class)
public class JournalDocumentTest {
    private static final String PACKAGE = "cn.dailytraces.journal";
    private static final String KEY = "daily-traces:v1";
    private static final String DATE = "2001-01-03";
    private static final long WAIT_MS = 20000;
    @Rule public ActivityTestRule<MainActivity> activityRule = new ActivityTestRule<>(MainActivity.class);
    private Instrumentation instrumentation;
    private UiAutomation automation;
    private MainActivity activity;
    private WebView web;
    private String exportName;

    @Before public void openIsolatedJournal() throws Exception {
        instrumentation = InstrumentationRegistry.getInstrumentation();
        automation = instrumentation.getUiAutomation();
        AccessibilityServiceInfo serviceInfo = automation.getServiceInfo();
        serviceInfo.flags |= AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
                | AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS;
        automation.setServiceInfo(serviceInfo);
        activity = activityRule.getActivity();
        instrumentation.runOnMainSync(() -> web = activity.testWebView());
        assertNotNull("Offline WebView did not open", web);
        awaitJs("document.readyState==='complete' && !!document.querySelector('.metric-card')", "Journal did not load");
        eraseFixture();
        reload();
        selectDate();
    }

    @Test public void systemDocumentPickerExportsAndImportsARealBackup() throws Exception {
        String token = UUID.randomUUID().toString().substring(0, 8);
        String meal = "SAF round trip " + token;
        exportName = "daily-traces-test-" + token + ".json";
        createMeal(meal);
        setWeight("51.75");
        click("[data-action=data]");
        tapWeb("[data-action=export]");
        awaitPackage("documentsui");
        chooseDownloadsRoot();
        AccessibilityNodeInfo filename = awaitNode(node -> node.isEditable()
                && "android.widget.EditText".contentEquals(node.getClassName()), "save filename field");
        Bundle text = new Bundle();
        text.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, exportName);
        assertTrue("DocumentsUI rejected filename input", filename.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, text));
        clickNative(awaitNode(node -> textIs(node, "Save", "SAVE", "保存")
                || idEndsWith(node, ":id/button1") || descriptionIs(node, "Save", "保存"), "save button"));
        awaitPackage(PACKAGE);
        JSONObject exported = awaitExportedFile();
        JSONObject exportedDay = exported.getJSONObject("days").getJSONObject(DATE);
        assertEquals(meal, exportedDay.getJSONArray("meals").getJSONObject(0).getString("content"));
        assertEquals(51.75, exportedDay.getDouble("weight"), .0001);

        // Restore the saved meal, while retaining a newer weight already entered locally.
        closeDialog();
        eraseFixture();
        reload();
        selectDate();
        setWeight("55.5");
        click("[data-action=data]");
        tapWeb("label[for=import-file]");
        awaitPackage("documentsui");
        chooseDownloadsRoot();
        clickNative(awaitNode(node -> node.getText() != null
                && node.getText().toString().contains(token), "exported JSON document " + exportName));
        awaitPackage(PACKAGE);
        awaitJs("!!document.querySelector('[data-action=confirm-import]')", "Selected file was not read as a backup");
        click("[data-action=confirm-import]");
        awaitJs("!document.querySelector('#editor').open", "Import confirmation did not complete");
        assertEquals("Backup meal was not restored", "true", js("JSON.parse(localStorage.getItem('" + KEY + "')).days['" + DATE + "'].meals.some(meal=>meal.content===" + JSONObject.quote(meal) + ")"));
        assertEquals("Import overwrote the newer local weight", "55.5", js("JSON.parse(localStorage.getItem('" + KEY + "')).days['" + DATE + "'].weight"));
        assertEquals("Import duplicated a meal", "1", js("JSON.parse(localStorage.getItem('" + KEY + "')).days['" + DATE + "'].meals.length"));
        reload();
        selectDate();
        assertEquals("Imported meal did not survive reload", "true", js("document.querySelector('.meal-block.lunch').textContent.includes(" + JSONObject.quote(meal) + ")"));
        assertEquals("\"55.5\"", js("document.querySelector('.weight-number').textContent"));
    }

    @Test public void firstBackDismissesTheRealKeyboardAndSecondBackClosesTheEditor() throws Exception {
        click("[data-action=add-meal][data-type=lunch]");
        tapWeb("textarea[name=content]");
        awaitIme(true);
        instrumentation.sendStringSync("Keyboard smoke meal");
        awaitJs("document.querySelector('textarea[name=content]').value==='Keyboard smoke meal'", "Physical key events did not reach the meal field");
        pressBack();
        awaitIme(false);
        assertEquals("First back discarded the editor instead of only hiding the keyboard", "true", js("document.querySelector('#editor').open"));
        assertEquals("First back discarded entered text", "\"Keyboard smoke meal\"", js("document.querySelector('textarea[name=content]').value"));
        pressBack();
        awaitJs("!document.querySelector('#editor').open", "Second Android back did not close the editor");
        awaitPackage(PACKAGE);
        assertEquals("An unsaved draft was unexpectedly stored", "true", js("!JSON.parse(localStorage.getItem('" + KEY + "')||'{\"days\":{}}').days['" + DATE + "']"));
    }

    private void createMeal(String content) throws Exception {
        click("[data-action=add-meal][data-type=lunch]");
        fill(new JSONObject().put("type", "lunch").put("time", "12:20").put("content", content).put("portion", "one bowl"));
        submit();
    }

    private void setWeight(String value) throws Exception {
        click(".metric-weight");
        fill(new JSONObject().put("weight", value));
        submit();
    }

    private void fill(JSONObject fields) throws Exception {
        awaitJs("document.querySelector('#editor').open && !!document.querySelector('#record-form')", "Editor not open");
        js("(function(){const form=document.querySelector('#record-form');for(const [name,value] of Object.entries(" + fields + ")){const field=form.elements.namedItem(name);field.value=String(value);field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));}})()");
    }

    private void submit() throws Exception {
        assertEquals("Invalid form fixture", "true", js("document.querySelector('#record-form').checkValidity()"));
        js("document.querySelector('#record-form').requestSubmit()");
        awaitJs("!document.querySelector('#editor').open", "Fixture did not save");
    }

    private void selectDate() throws Exception {
        js("location.hash='today'");
        awaitJs("!!document.querySelector('#selected-date')", "Daily view missing");
        js("(function(){const field=document.querySelector('#selected-date');field.value='" + DATE + "';field.dispatchEvent(new Event('change',{bubbles:true}));})()");
        awaitJs("document.querySelector('#selected-date').value==='" + DATE + "'", "Fixture date not selected");
    }

    private void closeDialog() throws Exception {
        js("document.querySelector('#editor').close()");
        awaitJs("!document.querySelector('#editor').open", "Editor did not close");
    }

    private void eraseFixture() throws Exception {
        js("(function(){const raw=localStorage.getItem('" + KEY + "');if(!raw)return;const data=JSON.parse(raw);delete data.days['" + DATE + "'];const clean=JSON.stringify(data);localStorage.setItem('" + KEY + "',clean);window.AndroidJournal.saveSnapshot(clean);})()");
    }

    private void reload() throws Exception {
        js("window.__documentTestReload=true");
        instrumentation.runOnMainSync(() -> web.reload());
        awaitJs("typeof window.__documentTestReload==='undefined' && document.readyState==='complete' && !!document.querySelector('.metric-card')", "Reload did not complete");
    }

    private String js(String script) throws Exception {
        CompletableFuture<String> result = new CompletableFuture<>();
        instrumentation.runOnMainSync(() -> web.evaluateJavascript(script, result::complete));
        return result.get(10, TimeUnit.SECONDS);
    }

    private void awaitJs(String expression, String message) throws Exception {
        long until = SystemClock.uptimeMillis() + WAIT_MS;
        do {
            if ("true".equals(js("Boolean(" + expression + ")"))) return;
            SystemClock.sleep(80);
        } while (SystemClock.uptimeMillis() < until);
        fail(message);
    }

    private void click(String selector) throws Exception {
        awaitJs("!!document.querySelector(" + JSONObject.quote(selector) + ")", "Missing web control " + selector);
        js("document.querySelector(" + JSONObject.quote(selector) + ").click()");
    }

    /** Native touch supplies user activation required by the HTML file input. */
    private void tapWeb(String selector) throws Exception {
        awaitJs("!!document.querySelector(" + JSONObject.quote(selector) + ")", "Missing touch target " + selector);
        js("document.querySelector(" + JSONObject.quote(selector) + ").scrollIntoView({block:'center',behavior:'instant'})");
        // Include dialog entrance and smooth page motion before measuring the touch point.
        awaitJs("document.getAnimations().every(animation=>animation.playState!=='running')", "Web animation did not settle");
        JSONArray coordinates = new JSONArray(js("(function(){const r=document.querySelector(" + JSONObject.quote(selector) + ").getBoundingClientRect();return [innerWidth,r.left+r.width/2,r.top+r.height/2];})()"));
        int[] origin = new int[2];
        int[] width = new int[1];
        instrumentation.runOnMainSync(() -> { web.getLocationOnScreen(origin); width[0] = web.getWidth(); });
        float ratio = (float) (width[0] / coordinates.getDouble(0));
        float x = origin[0] + (float) coordinates.getDouble(1) * ratio;
        float y = origin[1] + (float) coordinates.getDouble(2) * ratio;
        long down = SystemClock.uptimeMillis();
        injectTouch(down, down, MotionEvent.ACTION_DOWN, x, y);
        SystemClock.sleep(45);
        injectTouch(down, SystemClock.uptimeMillis(), MotionEvent.ACTION_UP, x, y);
    }

    private void injectTouch(long down, long time, int action, float x, float y) {
        MotionEvent.PointerProperties finger = new MotionEvent.PointerProperties();
        finger.id = 0; finger.toolType = MotionEvent.TOOL_TYPE_FINGER;
        MotionEvent.PointerCoords point = new MotionEvent.PointerCoords();
        point.x = x; point.y = y; point.pressure = 1; point.size = 1;
        MotionEvent event = MotionEvent.obtain(down, time, action, 1,
                new MotionEvent.PointerProperties[]{finger}, new MotionEvent.PointerCoords[]{point},
                0, 0, 1, 1, 0, 0, InputDevice.SOURCE_TOUCHSCREEN, 0);
        try { assertTrue("Touch injection rejected", automation.injectInputEvent(event, true)); }
        finally { event.recycle(); }
    }

    private void pressBack() {
        long down = SystemClock.uptimeMillis();
        assertTrue(automation.injectInputEvent(new KeyEvent(down, down, KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_BACK, 0), true));
        assertTrue(automation.injectInputEvent(new KeyEvent(down, SystemClock.uptimeMillis(), KeyEvent.ACTION_UP, KeyEvent.KEYCODE_BACK, 0), true));
    }

    private void awaitIme(boolean expected) {
        long until = SystemClock.uptimeMillis() + WAIT_MS;
        do {
            boolean[] visible = new boolean[1];
            instrumentation.runOnMainSync(() -> {
                if (Build.VERSION.SDK_INT >= 30) {
                    WindowInsets insets = activity.getWindow().getDecorView().getRootWindowInsets();
                    visible[0] = insets != null && insets.isVisible(WindowInsets.Type.ime());
                } else {
                    Rect frame = new Rect();
                    activity.getWindow().getDecorView().getWindowVisibleDisplayFrame(frame);
                    visible[0] = activity.getWindow().getDecorView().getHeight() - frame.bottom > 150;
                }
            });
            if (visible[0] == expected) return;
            SystemClock.sleep(80);
        } while (SystemClock.uptimeMillis() < until);
        fail(expected ? "Real Android keyboard never appeared" : "Android back did not hide the keyboard");
    }

    private void chooseDownloadsRoot() throws Exception {
        AccessibilityNodeInfo roots = awaitNode(node -> descriptionIs(node, "Show roots", "Show navigation menu", "Open navigation drawer", "显示根目录", "显示导航菜单", "打开导航抽屉")
                || "android:id/home".equals(node.getViewIdResourceName()), "DocumentsUI navigation drawer");
        clickNative(roots);
        // A picker may already show Downloads in its non-clickable toolbar title.
        // Match the actionable drawer row, never that identical location label.
        clickNative(awaitNode(node -> textIs(node, "Downloads", "下载")
                && !isToolbarLabel(node) && hasClickableAncestor(node), "actionable Downloads document root"));
        SystemClock.sleep(300);
    }

    private static boolean isToolbarLabel(AccessibilityNodeInfo node) {
        for (int level = 0; node != null && level < 10; level++, node = node.getParent()) {
            String id = node.getViewIdResourceName();
            CharSequence className = node.getClassName();
            if (id != null && (id.endsWith(":id/toolbar") || id.endsWith(":id/action_bar")
                    || id.endsWith(":id/stack") || id.endsWith(":id/breadcrumbs"))) return true;
            if (className != null && className.toString().endsWith("Toolbar")) return true;
        }
        return false;
    }

    private static boolean hasClickableAncestor(AccessibilityNodeInfo node) {
        for (int level = 0; node != null && level < 8; level++, node = node.getParent()) {
            if (node.isVisibleToUser() && node.isEnabled() && node.isClickable()) return true;
        }
        return false;
    }

    private JSONObject awaitExportedFile() throws Exception {
        long until = SystemClock.uptimeMillis() + WAIT_MS;
        String last = "";
        do {
            last = shell("cat /sdcard/Download/" + exportName);
            try {
                JSONObject data = new JSONObject(last);
                if (data.optInt("version") == 1 && data.optJSONObject("days") != null) return data;
            } catch (Exception ignored) { }
            SystemClock.sleep(150);
        } while (SystemClock.uptimeMillis() < until);
        fail("The real SAF save did not write a valid JSON file in Downloads: " + last);
        return null;
    }

    private String shell(String command) throws Exception {
        try (ParcelFileDescriptor.AutoCloseInputStream input = new ParcelFileDescriptor.AutoCloseInputStream(automation.executeShellCommand(command));
             ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
            byte[] chunk = new byte[8192]; int count;
            while ((count = input.read(chunk)) != -1) {
                if (bytes.size() + count > 6 * 1024 * 1024) throw new IllegalStateException("Test shell output too large");
                bytes.write(chunk, 0, count);
            }
            return new String(bytes.toByteArray(), StandardCharsets.UTF_8);
        }
    }

    private boolean isPackage(String part) {
        AccessibilityNodeInfo root = automation.getRootInActiveWindow();
        return root != null && root.getPackageName() != null && root.getPackageName().toString().contains(part);
    }

    private void awaitPackage(String part) {
        long until = SystemClock.uptimeMillis() + WAIT_MS;
        do {
            if (isPackage(part)) return;
            SystemClock.sleep(100);
        } while (SystemClock.uptimeMillis() < until);
        fail("Expected foreground package containing " + part + "; " + tree());
    }

    private interface NodePredicate { boolean matches(AccessibilityNodeInfo node); }

    private AccessibilityNodeInfo findNode(NodePredicate predicate) {
        AccessibilityNodeInfo root = automation.getRootInActiveWindow();
        if (root == null) return null;
        ArrayDeque<AccessibilityNodeInfo> queue = new ArrayDeque<>();
        queue.add(root);
        while (!queue.isEmpty()) {
            AccessibilityNodeInfo node = queue.removeFirst();
            if (node.isVisibleToUser() && predicate.matches(node)) return node;
            for (int i = 0; i < node.getChildCount(); i++) {
                AccessibilityNodeInfo child = node.getChild(i);
                if (child != null) queue.addLast(child);
            }
        }
        return null;
    }

    private AccessibilityNodeInfo awaitNode(NodePredicate predicate, String label) {
        long until = SystemClock.uptimeMillis() + WAIT_MS;
        do {
            AccessibilityNodeInfo found = findNode(predicate);
            if (found != null) return found;
            SystemClock.sleep(100);
        } while (SystemClock.uptimeMillis() < until);
        fail("Missing native " + label + "; " + tree());
        return null;
    }

    private void clickNative(AccessibilityNodeInfo node) {
        StringBuilder ancestors = new StringBuilder();
        for (int level = 0; node != null && level < 8; level++, node = node.getParent()) {
            ancestors.append('[').append(node.getViewIdResourceName()).append('|').append(node.getText())
                    .append("|clickable=").append(node.isClickable()).append("|enabled=").append(node.isEnabled())
                    .append("|visible=").append(node.isVisibleToUser()).append(']');
            if (node.isEnabled() && node.isClickable() && node.isVisibleToUser()) {
                boolean clicked = node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                if (!clicked) {
                    // Some DocumentsUI builds expose a clickable row but reject ACTION_CLICK.
                    // Use the same real finger input as a person tapping that row.
                    Rect bounds = new Rect(); node.getBoundsInScreen(bounds);
                    AccessibilityNodeInfo root = automation.getRootInActiveWindow();
                    if (root != null) {
                        Rect window = new Rect(); root.getBoundsInScreen(window);
                        if (!bounds.intersect(window)) continue;
                    }
                    if (bounds.isEmpty()) continue;
                    long down = SystemClock.uptimeMillis();
                    injectTouch(down, down, MotionEvent.ACTION_DOWN, bounds.exactCenterX(), bounds.exactCenterY());
                    SystemClock.sleep(45);
                    injectTouch(down, SystemClock.uptimeMillis(), MotionEvent.ACTION_UP, bounds.exactCenterX(), bounds.exactCenterY());
                }
                instrumentation.waitForIdleSync();
                SystemClock.sleep(180);
                return;
            }
        }
        fail("Native node has no actionable parent; ancestors=" + ancestors + "; tree=" + tree());
    }

    private static boolean textIs(AccessibilityNodeInfo node, String... values) {
        CharSequence value = node.getText();
        if (value == null) return false;
        for (String expected : values) if (expected.equalsIgnoreCase(value.toString())) return true;
        return false;
    }

    private static boolean descriptionIs(AccessibilityNodeInfo node, String... values) {
        CharSequence value = node.getContentDescription();
        if (value == null) return false;
        for (String expected : values) if (expected.equalsIgnoreCase(value.toString())) return true;
        return false;
    }

    private static boolean idEndsWith(AccessibilityNodeInfo node, String ending) {
        return node.getViewIdResourceName() != null && node.getViewIdResourceName().endsWith(ending);
    }

    private String tree() {
        AccessibilityNodeInfo root = automation.getRootInActiveWindow();
        if (root == null) return "no active accessibility root";
        StringBuilder result = new StringBuilder();
        ArrayDeque<AccessibilityNodeInfo> queue = new ArrayDeque<>(); queue.add(root);
        for (int count = 0; !queue.isEmpty() && count < 120; count++) {
            AccessibilityNodeInfo node = queue.removeFirst();
            Rect bounds = new Rect(); node.getBoundsInScreen(bounds);
            result.append('[').append(node.getViewIdResourceName()).append('|').append(node.getText()).append('|').append(node.getContentDescription())
                    .append("|clickable=").append(node.isClickable()).append("|visible=").append(node.isVisibleToUser()).append('|').append(bounds).append(']');
            for (int i = 0; i < node.getChildCount(); i++) {
                AccessibilityNodeInfo child = node.getChild(i); if (child != null) queue.addLast(child);
            }
        }
        return result.toString();
    }

    @After public void cleanOnlyOwnedFixtures() throws Exception {
        if (automation != null) {
            for (int i = 0; i < 4 && !isPackage(PACKAGE); i++) { pressBack(); SystemClock.sleep(200); }
        }
        if (web != null && activity != null && !activity.isDestroyed()) eraseFixture();
        if (exportName != null && exportName.matches("daily-traces-test-[a-f0-9]{8}\\.json")) {
            // Fixed Downloads directory, single unique test filename; never touches other files.
            shell("rm -f /sdcard/Download/" + exportName);
        }
    }
}
