package cn.dailytraces.journal;

import android.app.Instrumentation;
import android.os.SystemClock;
import android.webkit.WebView;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.rule.ActivityTestRule;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

/** Run seed, externally install the same signed production APK with -r, then run verify. */
@RunWith(AndroidJUnit4.class)
public class JournalUpgradeTest {
    private static final String KEY = "daily-traces:v1";
    private static final String DATE = "2001-01-05";
    private static final String MEAL = "upgrade-install-preserved-2001-01-05";
    private static final double WEIGHT = 54.75;
    @Rule public ActivityTestRule<MainActivity> activityRule = new ActivityTestRule<>(MainActivity.class);
    private Instrumentation instrumentation;
    private WebView web;

    @Test public void signedReinstallRetainsTheJournal() throws Exception {
        String mode = InstrumentationRegistry.getArguments().getString("mode", "");
        org.junit.Assume.assumeTrue("Upgrade test needs an explicit seed/install/verify sequence", !mode.isEmpty());
        assertTrue("Supply instrumentation argument mode=seed or mode=verify", mode.equals("seed") || mode.equals("verify"));
        instrumentation = InstrumentationRegistry.getInstrumentation();
        instrumentation.runOnMainSync(() -> web = activityRule.getActivity().testWebView());
        assertNotNull("Journal WebView did not open", web);
        await("document.readyState==='complete' && !!document.querySelector('.metric-card')");
        if (mode.equals("seed")) {
            // Idempotent setup removes only this test's date; never erase other dates.
            eraseFixture();
            reload();
        }
        selectDate();
        if (mode.equals("seed")) {
            click("[data-action=add-meal][data-type=lunch]");
            fillAndSave(new JSONObject().put("type", "lunch").put("time", "12:30")
                    .put("content", MEAL).put("portion", "one bowl"));
            click(".metric-weight");
            fillAndSave(new JSONObject().put("weight", String.valueOf(WEIGHT)));
        }
        assertFixture();
        if (mode.equals("verify")) {
            // Only successful verification removes the fixture, and updates its native mirror.
            eraseFixture();
            reload();
            await("!JSON.parse(localStorage.getItem('" + KEY + "')).days['" + DATE + "']");
            assertEquals("Native test fixture was not cleaned", "true", js("!JSON.parse(AndroidJournal.loadSnapshot()).days['" + DATE + "']"));
        }
        // No @After cleanup: seed must survive the external install; failures preserve evidence.
    }

    private void assertFixture() throws Exception {
        String day = "JSON.parse(localStorage.getItem('" + KEY + "')).days['" + DATE + "']";
        assertEquals("Saved meal was lost across installation", "true", js("!!(" + day + ") && " + day + ".meals.some(meal=>meal.content===" + JSONObject.quote(MEAL) + ")"));
        assertEquals("Saved weight was lost across installation", String.valueOf(WEIGHT), js(day + ".weight"));
        assertEquals("Meal is absent from the daily interface", "true", js("document.querySelector('.meal-block.lunch').textContent.includes(" + JSONObject.quote(MEAL) + ")"));
        assertEquals("Weight is absent from the daily interface", "\"" + WEIGHT + "\"", js("document.querySelector('.weight-number').textContent"));
        assertEquals("Native snapshot differs from WebView records", "true", js("JSON.stringify(JSON.parse(AndroidJournal.loadSnapshot()).days['" + DATE + "'])===JSON.stringify(" + day + ")"));
    }

    private void fillAndSave(JSONObject fields) throws Exception {
        await("document.querySelector('#editor').open && !!document.querySelector('#record-form')");
        js("(function(){const form=document.querySelector('#record-form');for(const [name,value] of Object.entries(" + fields + ")){const field=form.elements.namedItem(name);field.value=String(value);field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));}})()");
        assertEquals("Invalid upgrade-test form", "true", js("document.querySelector('#record-form').checkValidity()"));
        js("document.querySelector('#record-form').requestSubmit()");
        await("!document.querySelector('#editor').open");
    }

    private void selectDate() throws Exception {
        js("location.hash='today'");
        await("!!document.querySelector('#selected-date')");
        js("(function(){const field=document.querySelector('#selected-date');field.value='" + DATE + "';field.dispatchEvent(new Event('change',{bubbles:true}));})()");
        await("document.querySelector('#selected-date').value==='" + DATE + "'");
    }

    private void eraseFixture() throws Exception {
        js("(function(){const raw=localStorage.getItem('" + KEY + "');if(!raw)return;const data=JSON.parse(raw);delete data.days['" + DATE + "'];const clean=JSON.stringify(data);localStorage.setItem('" + KEY + "',clean);if(!AndroidJournal.saveSnapshot(clean))throw new Error('Native fixture cleanup failed');})()");
    }

    private void reload() throws Exception {
        js("window.__upgradeReload=true");
        instrumentation.runOnMainSync(() -> web.reload());
        await("typeof window.__upgradeReload==='undefined' && document.readyState==='complete' && !!document.querySelector('.metric-card')");
    }

    private void click(String selector) throws Exception {
        await("!!document.querySelector(" + JSONObject.quote(selector) + ")");
        js("document.querySelector(" + JSONObject.quote(selector) + ").click()");
    }

    private String js(String script) throws Exception {
        CompletableFuture<String> result = new CompletableFuture<>();
        instrumentation.runOnMainSync(() -> web.evaluateJavascript(script, result::complete));
        return result.get(10, TimeUnit.SECONDS);
    }

    private void await(String expression) throws Exception {
        long until = SystemClock.uptimeMillis() + 20000;
        do {
            if ("true".equals(js("Boolean(" + expression + ")"))) return;
            SystemClock.sleep(80);
        } while (SystemClock.uptimeMillis() < until);
        fail("Timed out waiting for " + expression);
    }
}
