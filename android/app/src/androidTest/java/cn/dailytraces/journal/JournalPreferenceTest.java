package cn.dailytraces.journal;

import android.app.Instrumentation;
import android.os.SystemClock;
import android.webkit.WebView;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.rule.ActivityTestRule;
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

/** Preference and favorite round trip on the isolated Android emulator. */
@RunWith(AndroidJUnit4.class)
public class JournalPreferenceTest {
    private static final String KEY = "daily-traces:v1", DATE = "2001-01-07";
    @Rule public ActivityTestRule<MainActivity> activityRule = new ActivityTestRule<>(MainActivity.class);
    private Instrumentation instrumentation;
    private WebView web;
    private String originalPreferences, originalFavorites;

    @Before public void open() throws Exception {
        instrumentation = InstrumentationRegistry.getInstrumentation();
        instrumentation.runOnMainSync(() -> web = activityRule.getActivity().testWebView());
        await("document.readyState==='complete' && !!document.querySelector('.metric-card')");
        JSONObject previous = new JSONObject(unquote(js("localStorage.getItem('" + KEY + "')||JSON.stringify(window.JournalCore.emptyStore())")));
        originalPreferences = previous.optJSONObject("preferences") == null
                ? "{\"allergens\":[],\"avoid\":[]}" : previous.getJSONObject("preferences").toString();
        originalFavorites = previous.optJSONArray("favorites") == null ? "[]" : previous.getJSONArray("favorites").toString();
        // This date belongs solely to this test, and the native snapshot tracks the same fixture.
        cleanup();
        selectDate();
    }

    @Test public void preferencesWarnAndFavoritesRemainUsableAfterMealDeletion() throws Exception {
        click("[data-action=data]");
        click("[data-action=edit-diet]");
        js("(function(){const f=document.querySelector('#record-form');f.elements.allergens.value='花生, 牛奶';f.elements.avoid.value='香菜';f.requestSubmit()})()");
        await("!document.querySelector('#editor').open");
        assertEquals("true", js("JSON.parse(localStorage.getItem('" + KEY + "')).preferences.allergens.includes('花生')"));
        click("[data-action=add-meal][data-type=lunch]");
        js("(function(){const f=document.querySelector('#record-form');f.elements.content.value='花生酱吐司';f.elements.content.dispatchEvent(new Event('input',{bubbles:true}));f.elements.portion.value='一份'})()");
        assertEquals("Missing allergy warning", "true", js("!document.querySelector('#food-warning').hidden && document.querySelector('#food-warning').textContent.includes('花生')"));
        js("(function(){const f=document.querySelector('#record-form');f.elements.content.value='花生和香菜';f.elements.content.dispatchEvent(new Event('input',{bubbles:true}))})()");
        assertEquals("Combined allergy and avoided-food warning is incomplete", "true", js("document.querySelector('#food-warning').textContent.includes('花生') && document.querySelector('#food-warning').textContent.includes('香菜')"));
        js("(function(){const f=document.querySelector('#record-form');f.elements.content.value='花生酱吐司';f.elements.content.dispatchEvent(new Event('input',{bubbles:true}))})()");
        js("document.querySelector('#record-form').requestSubmit()");
        await("!document.querySelector('#editor').open");
        click(".meal-block.lunch [data-action=toggle-favorite]");
        assertEquals("Favorite did not save", "1", js("JSON.parse(localStorage.getItem('" + KEY + "')).favorites.length"));
        click("[data-action=add-meal][data-type=lunch]");
        click(".favorite-meals [data-action=reuse-meal]");
        assertEquals("\"花生酱吐司\"", js("document.querySelector('#record-form').elements.content.value"));
        assertEquals("Quick fill did not warn", "true", js("!document.querySelector('#food-warning').hidden"));
        assertEquals("Quick fill saved without confirmation", "1", js("JSON.parse(localStorage.getItem('" + KEY + "')).days['" + DATE + "'].meals.length"));
        click("[data-action=close-dialog]");
        click(".meal-block.lunch [data-action=delete-meal]");
        click("[data-action=confirm-delete]");
        click("[data-action=data]");
        click("[data-action=edit-diet]");
        assertEquals("Deleted meal's favorite cannot be managed", "true", js("!!document.querySelector('[data-action=remove-favorite]')"));
        click("[data-action=remove-favorite]");
        assertEquals("Favorite removal did not persist", "0", js("JSON.parse(localStorage.getItem('" + KEY + "')).favorites.length"));
        assertEquals("Native snapshot missed preferences", "true", js("JSON.parse(window.AndroidJournal.loadSnapshot()).preferences.allergens.includes('花生')"));
        assertEquals("Native snapshot retained removed favorite", "0", js("JSON.parse(window.AndroidJournal.loadSnapshot()).favorites.length"));
        String before = unquote(js("localStorage.getItem('" + KEY + "')"));
        instrumentation.runOnMainSync(() -> web.reload());
        await("document.readyState==='complete' && !!document.querySelector('.metric-card')");
        assertEquals("Preferences changed across reload", new JSONObject(before).getJSONObject("preferences").toString(),
                new JSONObject(unquote(js("localStorage.getItem('" + KEY + "')"))).getJSONObject("preferences").toString());
    }

    private void selectDate() throws Exception {
        js("location.hash='today'");
        await("!!document.querySelector('#selected-date')");
        js("(function(){const field=document.querySelector('#selected-date');field.value='" + DATE + "';field.dispatchEvent(new Event('change',{bubbles:true}))})()");
        await("document.querySelector('#selected-date').value==='" + DATE + "'");
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
    private String unquote(String quoted) throws Exception { return new JSONArray("[" + quoted + "]").getString(0); }
    private void await(String expression) throws Exception {
        long limit = SystemClock.uptimeMillis() + 20000;
        do { if ("true".equals(js("Boolean(" + expression + ")"))) return; SystemClock.sleep(80); }
        while (SystemClock.uptimeMillis() < limit);
        fail("Timed out: " + expression);
    }
    private void cleanup() throws Exception {
        if (originalPreferences == null || originalFavorites == null) return;
        js("(function(){let d=JSON.parse(localStorage.getItem('" + KEY + "')||JSON.stringify(window.JournalCore.emptyStore()));delete d.days['" + DATE + "'];d.preferences=" + originalPreferences + ";d.favorites=" + originalFavorites + ";const s=JSON.stringify(d);localStorage.setItem('" + KEY + "',s);window.AndroidJournal.saveSnapshot(s)})()");
    }
    @After public void removeOnlyThisFixture() throws Exception { if (web != null) cleanup(); }
}
