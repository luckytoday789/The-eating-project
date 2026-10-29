package cn.dailytraces.journal;

import android.app.Instrumentation;
import android.content.Context;
import android.graphics.Bitmap;
import android.os.SystemClock;
import android.view.InputDevice;
import android.view.MotionEvent;
import android.webkit.WebView;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.rule.ActivityTestRule;
import java.io.File;
import java.io.FileOutputStream;
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

/** Runs only against the journal package on its isolated test emulator. */
@RunWith(AndroidJUnit4.class)
public class JournalSmokeTest {
    private static final String KEY = "daily-traces:v1";
    private static final String DATE = "2001-01-01";
    private static final long WAIT_MS = 20000;
    @Rule public ActivityTestRule<MainActivity> activityRule =
            new ActivityTestRule<>(MainActivity.class);
    private Instrumentation instrumentation;
    private MainActivity activity;
    private WebView web;

    @Before public void openJournal() throws Exception {
        instrumentation = InstrumentationRegistry.getInstrumentation();
        activity = activityRule.getActivity();
        awaitWebView();
        // Remove only this test's historical fixture; preserve all other dates.
        eraseFixture();
        reloadAndAwait();
        selectFixtureDate();
    }

    private void awaitWebView() throws Exception {
        long deadline = System.currentTimeMillis() + WAIT_MS;
        do {
            instrumentation.runOnMainSync(() -> web = activity.testWebView());
            if (web != null && "true".equals(js("document.readyState==='complete' && !!document.querySelector('.metric-card')"))) return;
            Thread.sleep(100);
        } while (System.currentTimeMillis() < deadline);
        fail("Offline journal did not finish rendering within " + WAIT_MS + "ms");
    }

    private String js(String code) throws Exception {
        CompletableFuture<String> result = new CompletableFuture<>();
        instrumentation.runOnMainSync(() -> web.evaluateJavascript(code, result::complete));
        return result.get(10, TimeUnit.SECONDS);
    }

    private void awaitTrue(String expression, String message) throws Exception {
        long deadline = System.currentTimeMillis() + WAIT_MS;
        do {
            if ("true".equals(js("Boolean(" + expression + ")"))) return;
            Thread.sleep(80);
        } while (System.currentTimeMillis() < deadline);
        fail(message + "; expression: " + expression);
    }

    private void click(String selector) throws Exception {
        awaitTrue("!!document.querySelector(" + JSONObject.quote(selector) + ")", "Missing control " + selector);
        assertEquals("Control click failed: " + selector, "true", js("(function(){const el=document.querySelector(" + JSONObject.quote(selector) + ");el.click();return true;})()"));
    }

    private void selectFixtureDate() throws Exception {
        js("location.hash='today'");
        awaitTrue("!!document.querySelector('#selected-date')", "Daily view missing");
        assertEquals("true", js("(function(){const field=document.querySelector('#selected-date');field.value='" + DATE + "';field.dispatchEvent(new Event('change',{bubbles:true}));return document.querySelector('#selected-date').value==='" + DATE + "';})()"));
    }

    private void fillForm(JSONObject fields) throws Exception {
        awaitTrue("document.querySelector('#editor')?.open && !!document.querySelector('#record-form')", "Editor did not open");
        String values = fields.toString();
        assertEquals("true", js("(function(){const form=document.querySelector('#record-form');for(const [name,value] of Object.entries(" + values + ")){const field=form.elements.namedItem(name);if(!field)throw new Error('Missing field '+name);field.value=String(value);field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));}return true;})()"));
    }

    private void submitValidForm() throws Exception {
        assertEquals("Expected a valid native HTML form", "true", js("document.querySelector('#record-form').checkValidity()"));
        js("document.querySelector('#record-form').requestSubmit()");
        awaitTrue("!document.querySelector('#editor').open", "Valid record did not save");
    }

    private String storedDay() {
        return "JSON.parse(localStorage.getItem('" + KEY + "')).days['" + DATE + "']";
    }

    private void eraseFixture() throws Exception {
        js("(function(){const raw=localStorage.getItem('" + KEY + "');if(!raw)return;const data=JSON.parse(raw);delete data.days['" + DATE + "'];const clean=JSON.stringify(data);localStorage.setItem('" + KEY + "',clean);if(typeof window.AndroidJournal?.saveSnapshot==='function')window.AndroidJournal.saveSnapshot(clean);})()");
    }

    private void reloadAndAwait() throws Exception {
        js("window.__journalBeforeReload=true");
        instrumentation.runOnMainSync(() -> web.reload());
        awaitTrue("typeof window.__journalBeforeReload==='undefined' && document.readyState==='complete' && !!document.querySelector('.metric-card')", "Page reload did not complete");
    }

    @Test public void offlineLaunchAssetsNavigationAndBridge() throws Exception {
        assertEquals("Unexpected remote origin", "true", js("location.origin==='https://appassets.androidplatform.net'"));
        assertEquals("Native bridge is unavailable", "true", js("typeof window.AndroidJournal==='object'"));
        assertEquals("Three summary actions must render", "3", js("document.querySelectorAll('.metric-card').length"));
        // Lazy thumbnails below the fold are deliberately requested during this test.
        js("document.querySelectorAll('.meal-illustration img').forEach(img=>img.loading='eager')");
        awaitTrue("document.querySelectorAll('.meal-illustration img').length===4 && [...document.querySelectorAll('.meal-illustration img')].every(img=>img.complete&&img.naturalWidth>0)", "A bundled SVG illustration failed to load offline");
        String[] routes = {"trends", "history", "today"};
        String[] selectors = {".chart-panel", ".calendar-grid", "#selected-date"};
        for (int i = 0; i < routes.length; i++) {
            js("location.hash='" + routes[i] + "'");
            awaitTrue("!!document.querySelector('" + selectors[i] + "')", routes[i] + " view did not render");
            awaitTrue("document.querySelector('#main').getAnimations().every(animation=>animation.playState!=='running')", "Route animation did not finish");
            assertEquals("Horizontal overflow in " + routes[i], "true", js("document.documentElement.scrollWidth<=document.documentElement.clientWidth+1"));
        }
        click("[data-action=demo]");
        awaitTrue("!document.querySelector('#demo-banner').hidden", "Demo mode did not start");
        awaitTrue("document.querySelector('#toast').hidden", "Toast did not dismiss before screenshot");
        Thread.sleep(200); // Allow the WebView compositor to commit the hidden toast.
        js("window.scrollTo(0,0)");
        instrumentation.waitForIdleSync();
        captureScreen("mobile-home.png");
        for (String route : new String[]{"trends", "history"}) {
            js("location.hash='" + route + "'");
            awaitTrue("location.hash==='#" + route + "' && document.querySelector('#main').getAnimations().every(animation=>animation.playState!=='running')", "Demo route animation did not finish");
            Thread.sleep(200);
            captureScreen("mobile-" + route + ".png");
        }
        click("[data-action=exit-demo]");
        awaitTrue("document.querySelector('#demo-banner').hidden", "Demo mode did not close");
    }

    private void captureScreen(String filename) throws Exception {
        Bitmap screenshot = instrumentation.getUiAutomation().takeScreenshot();
        assertNotNull("Screenshot could not be captured", screenshot);
        Context context = instrumentation.getTargetContext();
        File directory = context.getExternalFilesDir(null);
        assertNotNull(directory);
        File image = new File(directory, filename);
        try (FileOutputStream output = new FileOutputStream(image)) {
            assertTrue(screenshot.compress(Bitmap.CompressFormat.PNG, 100, output));
        } finally {
            screenshot.recycle();
        }
    }

    @Test public void realFormsPersistAcrossReloadAndActivityRestart() throws Exception {
        click("[data-action=add-meal][data-type=lunch]");
        fillForm(new JSONObject().put("type", "lunch").put("time", "12:15").put("content", "仪器测试午餐").put("portion", "一碗"));
        submitValidForm();
        assertEquals("1", js(storedDay() + ".meals.length"));
        click(".metric-weight");
        fillForm(new JSONObject().put("weight", "55.25"));
        submitValidForm();
        assertEquals("55.25", js(storedDay() + ".weight"));
        click(".metric-motion");
        fillForm(new JSONObject().put("type", "walk").put("minutes", "30").put("intensity", "easy").put("distance", "2.1").put("note", "离线表单测试"));
        submitValidForm();
        assertEquals("1", js(storedDay() + ".activities.length"));
        reloadAndAwait();
        selectFixtureDate();
        assertPersistedFixture();
        assertEquals("Native recovery snapshot did not include saved data", "true", js("JSON.parse(window.AndroidJournal.loadSnapshot()).days['" + DATE + "'].meals.length===1"));
        // Simulate WebView storage loss on this isolated emulator; AtomicFile must recover it.
        js("localStorage.removeItem('" + KEY + "')");
        reloadAndAwait();
        selectFixtureDate();
        assertPersistedFixture();
        activityRule.finishActivity();
        activity = activityRule.launchActivity(null);
        awaitWebView();
        selectFixtureDate();
        assertPersistedFixture();
    }

    @Test public void touchscreenSwipeChangesExactlyOneDayWithoutSelectingAButton() throws Exception {
        js("window.__swipeLog=[];['pointerdown','pointermove','pointerup','pointercancel','touchstart','touchend'].forEach(type=>document.addEventListener(type,e=>window.__swipeLog.push([type,e.timeStamp,e.pointerType,e.clientX,e.clientY,e.target.className]),true))");
        swipeWeekStrip(true);
        awaitTrue("document.querySelector('#selected-date').value==='2001-01-02'", "Left swipe did not advance one day; diagnostics " + js("JSON.stringify({date:document.querySelector('#selected-date').value,events:window.__swipeLog,viewport:[innerWidth,innerHeight]})"));
        // A browser-generated click after pointerup must not select the day button below it.
        Thread.sleep(400);
        assertEquals("Swipe generated an accidental date-button click", "\"2001-01-02\"", js("document.querySelector('#selected-date').value"));
        swipeWeekStrip(false);
        awaitTrue("document.querySelector('#selected-date').value==='" + DATE + "'", "Right swipe did not return one day");
        Thread.sleep(400);
        assertEquals("Swipe generated an accidental date-button click", "\"" + DATE + "\"", js("document.querySelector('#selected-date').value"));
    }

    private void swipeWeekStrip(boolean left) throws Exception {
        js("window.scrollTo(0,0)");
        awaitTrue("document.querySelector('#main').getAnimations().every(animation=>animation.playState!=='running')", "Page transition did not settle before swipe");
        JSONArray bounds = new JSONArray(js("(function(){const r=document.querySelector('.week-strip').getBoundingClientRect();return [innerWidth,r.left,r.top,r.width,r.height];})()"));
        int[] location = new int[2];
        int[] viewWidth = new int[1];
        instrumentation.runOnMainSync(() -> { web.getLocationOnScreen(location); viewWidth[0] = web.getWidth(); });
        double scale = viewWidth[0] / bounds.getDouble(0);
        double xLeft = bounds.getDouble(1) + bounds.getDouble(3) * .2;
        double xRight = bounds.getDouble(1) + bounds.getDouble(3) * .8;
        float startX = (float) (location[0] + (left ? xRight : xLeft) * scale);
        float endX = (float) (location[0] + (left ? xLeft : xRight) * scale);
        float y = (float) (location[1] + (bounds.getDouble(2) + bounds.getDouble(4) * .5) * scale);
        long down = SystemClock.uptimeMillis();
        injectTouch(down, down, MotionEvent.ACTION_DOWN, startX, y);
        for (int step = 1; step <= 8; step++) {
            SystemClock.sleep(20);
            injectTouch(down, SystemClock.uptimeMillis(), MotionEvent.ACTION_MOVE,
                    startX + (endX - startX) * step / 8f, y);
        }
        injectTouch(down, SystemClock.uptimeMillis(), MotionEvent.ACTION_UP, endX, y);
        instrumentation.waitForIdleSync();
    }

    private void injectTouch(long down, long at, int action, float x, float y) {
        MotionEvent.PointerProperties finger = new MotionEvent.PointerProperties();
        finger.id = 0; finger.toolType = MotionEvent.TOOL_TYPE_FINGER;
        MotionEvent.PointerCoords point = new MotionEvent.PointerCoords();
        point.x = x; point.y = y; point.pressure = 1; point.size = 1;
        MotionEvent event = MotionEvent.obtain(down, at, action, 1,
                new MotionEvent.PointerProperties[]{finger}, new MotionEvent.PointerCoords[]{point},
                0, 0, 1, 1, 0, 0, InputDevice.SOURCE_TOUCHSCREEN, 0);
        try { assertTrue("Touch event injection failed", instrumentation.getUiAutomation().injectInputEvent(event, false)); }
        finally { event.recycle(); }
    }

    private void assertPersistedFixture() throws Exception {
        assertEquals("Meal did not persist", "true", js("document.querySelector('.meal-block.lunch').textContent.includes('仪器测试午餐')"));
        assertEquals("Weight did not persist", "true", js("document.querySelector('.weight-number').textContent==='55.25'"));
        assertEquals("Activity did not persist", "true", js("document.querySelector('.activity-panel').textContent.includes('30') && document.querySelector('.activity-panel').textContent.includes('离线表单测试')"));
        assertEquals("Unexpected duplicate meals", "1", js(storedDay() + ".meals.length"));
        assertEquals("Unexpected duplicate activities", "1", js(storedDay() + ".activities.length"));
    }

    @Test public void narrowScreenKeepsControlsAndNumbersInsideCards() throws Exception {
        click(".metric-weight");
        fillForm(new JSONObject().put("weight", "199.99"));
        submitValidForm();
        int[] originalZoom = new int[1];
        instrumentation.runOnMainSync(() -> {
            originalZoom[0] = web.getSettings().getTextZoom();
            android.view.ViewGroup.LayoutParams layout = web.getLayoutParams();
            layout.width = Math.round(320 * web.getResources().getDisplayMetrics().density);
            web.setLayoutParams(layout);
            web.getSettings().setTextZoom(120);
        });
        try {
            awaitTrue("innerWidth<=322", "WebView did not enter narrow layout");
            awaitTrue("document.querySelector('#main').getAnimations().every(animation=>animation.playState!=='running')", "Narrow layout animation did not settle");
            assertEquals("A key control extends past the screen", "true", js("[...document.querySelectorAll('.metric-card,.header-data,.week-strip,.date-control')].every(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1})"));
            assertEquals("Weight number is clipped at larger text size", "true", js("document.querySelector('.metric-weight strong').scrollWidth<=document.querySelector('.metric-weight strong').clientWidth+1"));
        } finally {
            instrumentation.runOnMainSync(() -> {
                android.view.ViewGroup.LayoutParams layout = web.getLayoutParams();
                layout.width = android.view.ViewGroup.LayoutParams.MATCH_PARENT;
                web.setLayoutParams(layout);
                web.getSettings().setTextZoom(originalZoom[0]);
            });
        }
    }

    @Test public void shortcutsAndDeleteUndoKeepRecordsConsistent() throws Exception {
        click("[data-action=add-meal][data-type=lunch]");
        fillForm(new JSONObject().put("type", "lunch").put("time", "12:15").put("content", "番茄鸡蛋面").put("portion", "一碗"));
        submitValidForm();
        click("[data-action=add-meal][data-type=lunch]");
        click("[data-action=reuse-meal]");
        assertEquals("\"番茄鸡蛋面\"", js("document.querySelector('#record-form').elements.content.value"));
        assertEquals("\"一碗\"", js("document.querySelector('#record-form').elements.portion.value"));
        assertEquals("Quick fill must not create an unsaved record", "1", js(storedDay() + ".meals.length"));
        click("[data-action=quick-value][data-value='小份']");
        assertEquals("\"小份\"", js("document.querySelector('#record-form').elements.portion.value"));
        click("[data-action=close-dialog]");
        click("[data-action=delete-meal]");
        click("[data-action=confirm-delete]");
        assertEquals("true", js("!JSON.parse(localStorage.getItem('" + KEY + "')).days['" + DATE + "']"));
        click("[data-action=undo-delete]");
        assertEquals("1", js(storedDay() + ".meals.length"));
        click(".metric-motion");
        click("[data-action=quick-value][data-value='30']");
        assertEquals("\"30\"", js("document.querySelector('#record-form').elements.minutes.value"));
        assertEquals("true", js("document.querySelector('#record-form').checkValidity()"));
        submitValidForm();
        assertEquals("30", js(storedDay() + ".activities[0].minutes"));
    }

    @Test public void invalidInputsAreRejectedAndAndroidBackClosesEditor() throws Exception {
        click(".metric-weight");
        fillForm(new JSONObject().put("weight", "-1"));
        assertEquals("Negative weight accepted by HTML validation", "false", js("document.querySelector('#record-form').checkValidity()"));
        js("document.querySelector('#record-form').requestSubmit()");
        assertEquals("Invalid form unexpectedly closed", "true", js("document.querySelector('#editor').open"));
        assertEquals("Invalid data was written", "true", js("!JSON.parse(localStorage.getItem('" + KEY + "')||'{\"days\":{}}').days['" + DATE + "']"));
        instrumentation.runOnMainSync(() -> activity.onBackPressed());
        awaitTrue("!document.querySelector('#editor').open", "Android back did not close the editor");
        click(".metric-motion");
        fillForm(new JSONObject().put("minutes", "-5"));
        assertEquals("Negative exercise duration accepted", "false", js("document.querySelector('#record-form').checkValidity()"));
        js("document.querySelector('#record-form').requestSubmit()");
        assertEquals("true", js("document.querySelector('#editor').open"));
        instrumentation.runOnMainSync(() -> activity.onBackPressed());
        awaitTrue("!document.querySelector('#editor').open", "Android back did not close the activity editor");
        click("[data-action=add-meal][data-type=breakfast]");
        fillForm(new JSONObject().put("type", "breakfast").put("time", "08:00").put("content", "   ").put("portion", ""));
        js("document.querySelector('#record-form').requestSubmit()");
        awaitTrue("document.querySelector('#editor').open && !document.querySelector('#form-error').hidden", "Whitespace-only meal did not produce an inline validation error");
        assertEquals("Whitespace-only meal was written", "true", js("!JSON.parse(localStorage.getItem('" + KEY + "')||'{\"days\":{}}').days['" + DATE + "']"));
        instrumentation.runOnMainSync(() -> activity.onBackPressed());
        awaitTrue("!document.querySelector('#editor').open", "Android back did not close the meal editor");
    }

    @After public void removeOnlySyntheticFixture() throws Exception {
        if (web != null && activity != null && !activity.isDestroyed()) eraseFixture();
    }
}
